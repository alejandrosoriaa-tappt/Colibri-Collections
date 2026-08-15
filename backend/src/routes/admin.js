import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import supabase, {
  getAllTenants,
  createTenant,
  updateTenant,
  getTenant,
  getActiveTenants
} from '../services/supabase.js'
import { sendWhatsAppMessage, sendWhatsAppTemplate } from '../services/whatsapp.js'
import { sendOperationalNotification } from '../services/notifier.js'
import { bienvenidaTenantComponents, TEMPLATE_NAMES } from '../templates/whatsappTemplates.js'
import { crearActivacion } from './activacion.js'
import {
  credencialesListas, agregarNumero, pedirCodigo, verificarCodigo,
  registrarNumero, estadoNumero, listarNumeros
} from '../services/wabaNumeros.js'
import { randomInt } from 'crypto'

const router = Router()

// Admin check middleware
async function adminOnly(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', req.user.id)
      .maybeSingle()

    if (error || !data) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    req.isAdmin = true
    next()
  } catch (err) {
    console.error('adminOnly middleware error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /api/admin/stats — dashboard KPIs
router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    // Active tenants count
    const { count: activeTenants } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Trial tenants
    const { count: trialTenants } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'trial')

    // Messages sent this month
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const { count: messagesThisMonth } = await supabase
      .from('message_logs')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', monthStart.toISOString())
      .eq('status', 'sent')

    // MRR calculation
    const { data: tenants } = await supabase
      .from('tenants')
      .select('subscription_amount')
      .in('status', ['active'])

    const mrr = tenants
      ? tenants.reduce((sum, t) => sum + Number(t.subscription_amount || 0), 0)
      : 0

    // Total contacts
    const { count: totalContacts } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })

    // Active campaigns
    const { count: activeCampaigns } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    return res.json({
      mrr,
      active_tenants: activeTenants || 0,
      trial_tenants: trialTenants || 0,
      messages_this_month: messagesThisMonth || 0,
      total_contacts: totalContacts || 0,
      active_campaigns: activeCampaigns || 0
    })
  } catch (err) {
    console.error('GET /admin/stats error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/tenants
router.get('/tenants', authMiddleware, adminOnly, async (req, res) => {
  try {
    const tenants = await getAllTenants()
    return res.json({ tenants })
  } catch (err) {
    console.error('GET /admin/tenants error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/tenants/:id
router.get('/tenants/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const tenant = await getTenant(req.params.id)
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' })

    // Get tenant stats
    const { count: campaignCount } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', req.params.id)

    const { count: contactCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', req.params.id)

    const { count: messageCount } = await supabase
      .from('message_logs')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', req.params.id)

    return res.json({
      tenant,
      stats: {
        campaigns: campaignCount || 0,
        contacts: contactCount || 0,
        messages_sent: messageCount || 0
      }
    })
  } catch (err) {
    console.error('GET /admin/tenants/:id error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/tenants
router.post('/tenants', authMiddleware, adminOnly, async (req, res) => {
  try {
    const {
      name,
      display_name,
      slug,
      plan,
      admin_phone,
      payment_link_general,
      subscription_amount,
      trial_ends_at
    } = req.body

    if (!name || !slug) {
      return res.status(400).json({ error: 'name and slug are required' })
    }

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      return res.status(400).json({ error: 'Slug already exists' })
    }

    const tenant = await createTenant({
      name,
      display_name: display_name || name,
      slug,
      plan: plan || 'basic',
      status: trial_ends_at ? 'trial' : 'active',
      admin_phone: admin_phone || null,
      payment_link_general: payment_link_general || null,
      subscription_amount: subscription_amount || 0,
      trial_ends_at: trial_ends_at || null
    })

    return res.status(201).json({ tenant })
  } catch (err) {
    console.error('POST /admin/tenants error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// PATCH /api/admin/tenants/:id
router.patch('/tenants/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const tenant = await getTenant(req.params.id)
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' })

    const allowedFields = [
      'name', 'display_name', 'slug', 'plan', 'status',
      'admin_phone', 'payment_link_general', 'subscription_amount',
      'trial_ends_at', 'logo_url',
      'waba_phone_id', 'waba_token', 'waba_business_id', 'org_type'
    ]

    const updates = {}
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field]
      }
    }

    const updated = await updateTenant(req.params.id, updates)
    return res.json({ tenant: updated })
  } catch (err) {
    console.error('PATCH /admin/tenants/:id error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/tenants/:id/resend-welcome — resend onboarding WhatsApp template
router.post('/tenants/:id/resend-welcome', authMiddleware, adminOnly, async (req, res) => {
  try {
    const tenant = await getTenant(req.params.id)
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' })

    if (!tenant.admin_phone) {
      return res.status(400).json({ error: 'El tenant no tiene admin_phone configurado' })
    }

    const welcomeResult = await sendWhatsAppTemplate(
      tenant.admin_phone,
      TEMPLATE_NAMES.BIENVENIDA_TENANT.name,
      TEMPLATE_NAMES.BIENVENIDA_TENANT.lang,
      bienvenidaTenantComponents({ nombre: tenant.display_name || tenant.name, orgName: 'Kollybry' })
    )

    return res.json({ success: welcomeResult.success, error: welcomeResult.error })
  } catch (err) {
    console.error('POST /admin/tenants/:id/resend-welcome error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/tenants/:id/send-message
router.post('/tenants/:id/send-message', authMiddleware, adminOnly, async (req, res) => {
  try {
    const tenant = await getTenant(req.params.id)
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' })

    const { message } = req.body
    if (!message) return res.status(400).json({ error: 'message is required' })

    if (!tenant.admin_phone) {
      return res.status(400).json({ error: 'Tenant has no admin_phone configured' })
    }

    const result = await sendWhatsAppMessage(tenant.admin_phone, message)
    return res.json({ success: result.success, wa_message_id: result.wa_message_id, error: result.error })
  } catch (err) {
    console.error('POST /admin/tenants/:id/send-message error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/messages — all message logs across tenants
router.get('/messages', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { tenant_id, page = 1, limit = 50 } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    let query = supabase
      .from('message_logs')
      .select('*, contacts(nombre, apellido, telefono), campaigns(name, tenant_id), tenants(name)', { count: 'exact' })
      .order('sent_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1)

    if (tenant_id) query = query.eq('tenant_id', tenant_id)

    const { data: messages, error, count } = await query
    if (error) return res.status(500).json({ error: error.message })

    return res.json({ messages, total: count })
  } catch (err) {
    console.error('GET /admin/messages error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/tenants/:id/add-user
router.post('/tenants/:id/add-user', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { user_id, role = 'member' } = req.body

    if (!user_id) return res.status(400).json({ error: 'user_id is required' })

    const { data, error } = await supabase
      .from('tenant_users')
      .upsert({ tenant_id: req.params.id, user_id, role }, { onConflict: 'tenant_id,user_id' })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    return res.json({ membership: data })
  } catch (err) {
    console.error('POST /admin/tenants/:id/add-user error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ─── Alta del número de WhatsApp del colegio ────────────────────────────────
//
// Los cuatro pasos de Meta, desde el panel. El único que no se automatiza es
// recibir el SMS: llega al chip físico del colegio y el director lo dicta.
//
// Estas rutas son admin-only a propósito: quien pueda mover números puede
// hacer que un colegio envíe desde el número de otro.

// Traduce el vocabulario de Meta al de la tabla, para no guardar dos verdades.
const ESTADO_NOMBRE = {
  APPROVED: 'aprobado',
  DECLINED: 'rechazado',
  PENDING_REVIEW: 'pendiente',
  AVAILABLE_WITHOUT_REVIEW: 'aprobado'
}

function exigirCredenciales(res) {
  if (credencialesListas()) return false
  res.status(503).json({
    error: 'Faltan WABA_ACCESS_TOKEN o WABA_BUSINESS_ID en el servidor. ' +
           'Configúralas en Railway para dar de alta números desde aquí.'
  })
  return true
}

// POST /api/admin/numeros — paso 1: agregar el número a la WABA
router.post('/numeros', authMiddleware, adminOnly, async (req, res) => {
  if (exigirCredenciales(res)) return

  const { cc = '52', telefono, nombre_visible, tenant_id, responsable_chip, recarga_vence_en } = req.body || {}
  if (!telefono || !nombre_visible) {
    return res.status(400).json({ error: 'Faltan el teléfono y el nombre que verán los papás.' })
  }

  try {
    const { phone_number_id } = await agregarNumero({
      cc, telefono: String(telefono).replace(/\D/g, ''), nombreVisible: nombre_visible
    })

    // Se guarda de inmediato: si el proceso se interrumpe entre el paso 1 y el
    // 4, el número ya existe en Meta y no debe quedar sin rastro de este lado.
    const { error } = await supabase.from('waba_numeros').insert({
      phone_number_id,
      display_phone: `+${cc}${String(telefono).replace(/\D/g, '')}`,
      display_name: nombre_visible,
      display_name_estado: 'pendiente',
      tenant_id: tenant_id || null,
      responsable_chip: responsable_chip || null,
      recarga_vence_en: recarga_vence_en || null
    })
    if (error) console.error('waba_numeros insert:', error.message)

    return res.status(201).json({
      phone_number_id,
      guardado: !error,
      aviso: error ? `El número se creó en Meta pero no se guardó aquí: ${error.message}` : null
    })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message })
  }
})

// POST /api/admin/numeros/:id/codigo — paso 2: pedir el SMS
router.post('/numeros/:id/codigo', authMiddleware, adminOnly, async (req, res) => {
  if (exigirCredenciales(res)) return
  const metodo = String(req.body?.metodo || 'SMS').toUpperCase()
  // Meta solo conoce estos dos. Cualquier otra cosa la rechaza con un error
  // genérico que no ayuda a nadie, así que se corta aquí.
  if (!['SMS', 'VOICE'].includes(metodo)) {
    return res.status(400).json({ error: 'El código solo se puede pedir por SMS o por llamada.' })
  }
  try {
    await pedirCodigo({ phoneNumberId: req.params.id, metodo })
    return res.json({ enviado: true, metodo })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message })
  }
})

// POST /api/admin/numeros/:id/verificar — paso 3: el código que dicta el director
router.post('/numeros/:id/verificar', authMiddleware, adminOnly, async (req, res) => {
  if (exigirCredenciales(res)) return
  const codigo = String(req.body?.codigo || '').replace(/\D/g, '')
  if (!codigo) return res.status(400).json({ error: 'Falta el código.' })
  try {
    await verificarCodigo({ phoneNumberId: req.params.id, codigo })
    return res.json({ verificado: true })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message })
  }
})

// POST /api/admin/numeros/:id/registrar — paso 4: queda listo para enviar
router.post('/numeros/:id/registrar', authMiddleware, adminOnly, async (req, res) => {
  if (exigirCredenciales(res)) return
  try {
    // El PIN lo genera el servidor: un PIN elegido a mano acaba siendo 123456
    // en todos los colegios. Se devuelve una sola vez y NO se guarda —quien lea
    // la base no debe poder reverificar el número por su cuenta—.
    const pin = String(randomInt(0, 1_000_000)).padStart(6, '0')
    await registrarNumero({ phoneNumberId: req.params.id, pin })

    const estado = await estadoNumero(req.params.id).catch(() => null)
    if (estado) {
      await supabase.from('waba_numeros').update({
        display_phone: estado.display_phone_number || undefined,
        display_name_estado: ESTADO_NOMBRE[estado.name_status] || 'pendiente'
      }).eq('phone_number_id', req.params.id)
    }

    return res.json({ registrado: true, pin, estado })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message })
  }
})

// GET /api/admin/numeros — lo que Meta reporta, cruzado con lo que tenemos
router.get('/numeros', authMiddleware, adminOnly, async (req, res) => {
  if (exigirCredenciales(res)) return
  try {
    const [enMeta, { data: enBase }] = await Promise.all([
      listarNumeros(),
      supabase.from('waba_numeros').select('phone_number_id, tenant_id, recarga_vence_en, responsable_chip, tenants(display_name)')
    ])
    const porId = new Map((enBase || []).map(n => [n.phone_number_id, n]))

    return res.json({
      numeros: enMeta.map(n => ({
        phone_number_id: n.id,
        display_phone: n.display_phone_number,
        nombre_visible: n.verified_name,
        nombre_estado: ESTADO_NOMBRE[n.name_status] || 'pendiente',
        calidad: n.quality_rating || null,
        verificado: n.code_verification_status === 'VERIFIED',
        colegio: porId.get(n.id)?.tenants?.display_name || null,
        tenant_id: porId.get(n.id)?.tenant_id || null,
        recarga_vence_en: porId.get(n.id)?.recarga_vence_en || null,
        responsable_chip: porId.get(n.id)?.responsable_chip || null
      }))
    })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message })
  }
})

// GET /api/admin/numeros/:id — estado de uno solo (para refrescar el nombre)
router.get('/numeros/:id', authMiddleware, adminOnly, async (req, res) => {
  if (exigirCredenciales(res)) return
  try {
    const estado = await estadoNumero(req.params.id)
    return res.json({
      phone_number_id: estado.id,
      display_phone: estado.display_phone_number,
      nombre_visible: estado.verified_name,
      nombre_estado: ESTADO_NOMBRE[estado.name_status] || 'pendiente',
      calidad: estado.quality_rating || null,
      verificado: estado.code_verification_status === 'VERIFIED'
    })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message })
  }
})

// POST /api/admin/onboard — create tenant + user + send welcome WhatsApp in one shot

/**
 * Vincula al colegio el número de WhatsApp que ya se registró para él.
 *
 * El chip lo compra y mantiene el COLEGIO; Kollybry lo registra en su WABA
 * (el director dicta por teléfono el código que le llega). Este paso solo
 * conecta ese número ya registrado con el colegio recién creado.
 *
 * Si al dar de alta todavía no hay número, el alta NO falla: el colegio usa el
 * número compartido hasta que se le asigne el suyo.
 */
async function vincularNumero(tenantId, phoneNumberId, displayName) {
  if (!phoneNumberId) return { vinculado: false, motivo: 'sin número registrado todavía' }

  const { error: eNum } = await supabase
    .from('waba_numeros')
    .update({ tenant_id: tenantId, display_name: displayName })
    .eq('phone_number_id', phoneNumberId)
  if (eNum) return { vinculado: false, motivo: eNum.message }

  const { error: eTenant } = await supabase
    .from('tenants')
    .update({ waba_phone_id: phoneNumberId })
    .eq('id', tenantId)
  if (eTenant) return { vinculado: false, motivo: eTenant.message }

  return { vinculado: true, phone_number_id: phoneNumberId }
}

router.post('/onboard', authMiddleware, adminOnly, async (req, res) => {
  const { org_name, display_name, slug, plan = 'basic', org_type = 'general',
          admin_phone, nombre_director, waba_phone_id } = req.body

  // Ya NO se pide correo ni contraseña: los define el director al activar. El
  // admin nunca conoce la contraseña, y así no queda en ningún WhatsApp.
  if (!org_name || !admin_phone || !nombre_director) {
    return res.status(400).json({ error: 'org_name, nombre_director y admin_phone son requeridos' })
  }

  let tenant = null
  try {
    const tenantSlug = slug || org_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
    const { data, error } = await supabase
      .from('tenants')
      .insert({
        name: org_name.toLowerCase().replace(/\s+/g, '-'),
        display_name: display_name || org_name,
        slug: tenantSlug,
        plan,
        org_type,
        admin_phone,
        status: 'active'
      })
      .select()
      .single()
    if (error) throw new Error(`Error creando colegio: ${error.message}`)
    tenant = data

    const numero = await vincularNumero(tenant.id, waba_phone_id, display_name || org_name)
    if (!numero.vinculado) {
      console.warn(`Onboard: ${org_name} sin número propio — ${numero.motivo}`)
    }

    const activacion = await crearActivacion({
      tenantId: tenant.id,
      nombreDirector: nombre_director,
      telefono: admin_phone,
      nombreColegio: display_name || org_name
    })

    return res.json({
      tenant,
      // La liga se devuelve siempre: si el WhatsApp no salió, el admin la
      // copia y la manda por donde pueda en vez de quedarse atorado.
      activacion_liga: activacion.liga,
      activacion_enviada: activacion.enviado,
      activacion_aviso: activacion.motivo,
      expira_en: activacion.expira_en,
      numero_asignado: numero.vinculado ? numero.phone_number_id : null,
      numero_aviso: numero.vinculado ? null : numero.motivo
    })
  } catch (err) {
    // Sin usuario que borrar: el rollback es solo el colegio.
    if (tenant) await supabase.from('tenants').delete().eq('id', tenant.id).catch(() => {})
    console.error('POST /admin/onboard error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/tenants/:id/reenviar-activacion
router.post('/tenants/:id/reenviar-activacion', authMiddleware, adminOnly, async (req, res) => {
  try {
    const tenant = await getTenant(req.params.id)
    if (!tenant) return res.status(404).json({ error: 'Colegio no encontrado' })

    const { data: previa } = await supabase
      .from('activaciones')
      .select('nombre_director, telefono, usado_en')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (previa?.usado_en) {
      return res.status(400).json({ error: 'Este colegio ya activó su cuenta.' })
    }

    const r = await crearActivacion({
      tenantId: tenant.id,
      nombreDirector: previa?.nombre_director || 'Director',
      telefono: previa?.telefono || tenant.admin_phone,
      nombreColegio: tenant.display_name || tenant.name
    })
    return res.json({ liga: r.liga, enviada: r.enviado, aviso: r.motivo, expira_en: r.expira_en })
  } catch (err) {
    console.error('POST /admin/reenviar-activacion error:', err)
    return res.status(500).json({ error: err.message })
  }
})

export default router
