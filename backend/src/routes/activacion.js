/**
 * Activación de cuenta por el propio director.
 *
 * Estas rutas son PÚBLICAS a propósito: quien las usa todavía no tiene cuenta.
 * Lo que las protege es el token, que es de un solo uso, caduca en 48 horas y
 * se guarda hasheado —si alguien lee la base, no puede usar las pendientes—.
 */
import { Router } from 'express'
import { randomBytes, createHash } from 'crypto'
import rateLimit from 'express-rate-limit'
import supabase from '../services/supabase.js'
import { sendWhatsAppTemplate } from '../services/whatsapp.js'
import { TEMPLATE_NAMES, activacionComponents } from '../templates/whatsappTemplates.js'

const router = Router()

const HORAS_VIGENCIA = 48

// El token es la llave de la cuenta: sin límite, alguien podría probar tokens
// a ciegas o quemar activaciones ajenas a fuerza de intentos.
const limite = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos. Espera unos minutos.' }
})

export function nuevoToken() {
  const claro = randomBytes(32).toString('base64url')
  return { claro, hash: createHash('sha256').update(claro).digest('hex') }
}

const hashDe = (t) => createHash('sha256').update(String(t || '')).digest('hex')

export function ligaDeActivacion(tokenClaro) {
  const base = process.env.FRONTEND_URL || 'https://app.kollybry.com'
  return `${base.replace(/\/$/, '')}/activar?t=${tokenClaro}`
}

/**
 * Crea la activación y manda la liga por WhatsApp.
 * Devuelve también la liga en claro para que el panel de Admin pueda
 * copiarla: si el WhatsApp falla, el alta no se queda sin salida.
 */
export async function crearActivacion({ tenantId, nombreDirector, telefono, nombreColegio, yaRecordado = false }) {
  const { claro, hash } = nuevoToken()
  const expira = new Date(Date.now() + HORAS_VIGENCIA * 3600 * 1000)

  const { error } = await supabase.from('activaciones').insert({
    tenant_id: tenantId,
    token_hash: hash,
    nombre_director: nombreDirector,
    telefono,
    expira_en: expira.toISOString(),
    // Cuando la liga nace de un recordatorio, se marca de una vez para que el
    // barrido no la vuelva a tomar y termine recordando en cadena.
    recordatorio_en: yaRecordado ? new Date().toISOString() : null
  })
  if (error) throw new Error(`No se pudo crear la activación: ${error.message}`)

  const liga = ligaDeActivacion(claro)
  let enviado = false
  let motivo = null

  if (TEMPLATE_NAMES.ACTIVACION.name) {
    const r = await sendWhatsAppTemplate(
      telefono,
      TEMPLATE_NAMES.ACTIVACION.name,
      TEMPLATE_NAMES.ACTIVACION.lang,
      activacionComponents({ nombre: nombreDirector, orgName: nombreColegio, liga })
    )
    enviado = r.success
    motivo = r.success ? null : r.error
  } else {
    motivo = 'la plantilla de activación aún no está configurada (KOLLYBRY_ACTIVACION_TEMPLATE)'
  }

  return { liga, enviado, motivo, expira_en: expira.toISOString() }
}

// ── GET /api/activacion/:token — ¿la liga sirve? ────────────────────────────
// No pide sesión: es la pantalla previa a tener cuenta.
router.get('/:token', limite, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('activaciones')
      .select('id, tenant_id, nombre_director, usado_en, expira_en, tenants(display_name)')
      .eq('token_hash', hashDe(req.params.token))
      .maybeSingle()

    if (error) throw error
    if (!data)                       return res.status(404).json({ error: 'Esta liga no es válida.' })
    if (data.usado_en)               return res.status(410).json({ error: 'Esta liga ya se usó. Pide una nueva.' })
    if (new Date(data.expira_en) < new Date())
      return res.status(410).json({ error: 'Esta liga venció. Pide una nueva.' })

    return res.json({
      nombre_director: data.nombre_director,
      colegio: data.tenants?.display_name || ''
    })
  } catch (err) {
    console.error('GET /activacion error:', err)
    return res.status(500).json({ error: 'No se pudo validar la liga.' })
  }
})

// ── POST /api/activacion — el director define correo y contraseña ───────────
router.post('/', limite, async (req, res) => {
  const { token, email, password } = req.body || {}

  if (!token || !email || !password) {
    return res.status(400).json({ error: 'Faltan datos.' })
  }
  if (String(password).length < 10) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 10 caracteres.' })
  }

  let activacion
  try {
    const { data, error } = await supabase
      .from('activaciones')
      .select('id, tenant_id, nombre_director, usado_en, expira_en')
      .eq('token_hash', hashDe(token))
      .maybeSingle()
    if (error) throw error
    activacion = data
  } catch (err) {
    console.error('POST /activacion lookup error:', err)
    return res.status(500).json({ error: 'No se pudo validar la liga.' })
  }

  if (!activacion)         return res.status(404).json({ error: 'Esta liga no es válida.' })
  if (activacion.usado_en) return res.status(410).json({ error: 'Esta liga ya se usó.' })
  if (new Date(activacion.expira_en) < new Date())
    return res.status(410).json({ error: 'Esta liga venció. Pide una nueva.' })

  let usuario
  try {
    // El usuario se crea AQUÍ, no en el alta: hasta este momento no sabíamos
    // su correo. El admin nunca conoce la contraseña.
    const { data, error } = await supabase.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password,
      email_confirm: true            // ya se verificó por WhatsApp
    })
    if (error) throw error
    usuario = data.user
  } catch (err) {
    const msg = /already/i.test(err.message || '')
      ? 'Ese correo ya tiene una cuenta. Inicia sesión o usa otro.'
      : `No se pudo crear la cuenta: ${err.message}`
    return res.status(400).json({ error: msg })
  }

  try {
    const { error: eMiembro } = await supabase.from('tenant_users').insert({
      tenant_id: activacion.tenant_id,
      user_id: usuario.id,
      role: 'owner',
      name: activacion.nombre_director
    })
    if (eMiembro) throw eMiembro

    // Quemar la liga. El filtro por usado_en null evita que dos envíos
    // simultáneos del formulario creen dos cuentas.
    const { data: quemado, error: eQuemar } = await supabase
      .from('activaciones')
      .update({ usado_en: new Date().toISOString() })
      .eq('id', activacion.id)
      .is('usado_en', null)
      .select('id')
    if (eQuemar || !quemado?.length) throw new Error('Esta liga ya se había usado.')

    return res.json({ ok: true, email: usuario.email })
  } catch (err) {
    // Si algo falló después de crear el usuario, se borra para no dejar una
    // cuenta huérfana que impida reintentar con el mismo correo.
    await supabase.auth.admin.deleteUser(usuario.id).catch(() => {})
    console.error('POST /activacion error:', err)
    return res.status(500).json({ error: err.message || 'No se pudo completar la activación.' })
  }
})

export default router
