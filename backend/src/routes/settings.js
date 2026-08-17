/**
 * /api/settings — Tenant self-service settings
 * Tenants can read and update their own config (no super-admin required)
 */
import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { inferTenantGuard } from '../middleware/tenantGuard.js'
import supabase from '../services/supabase.js'
import { normalizePhone } from '../utils/phone.js'
import { crearActivacion, invitacionesVivas } from './activacion.js'

const router = Router()

const TENANT_SELECT = 'id,name,display_name,slug,plan,status,admin_phone,payment_link_general,subscription_amount,logo_url,waba_phone_id,waba_business_id,org_type,email,website,address,razon_social,rfc,regimen_fiscal,uso_cfdi,fiscal_street,fiscal_colony,fiscal_city,fiscal_state,fiscal_zip,email_facturacion,contact_grace_period_days,auto_respuesta_activa,auto_respuesta,sheets_url,spei_addon_enabled,payout_clabe,created_at'

// GET /api/settings — return current tenant settings
router.get('/', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select(TENANT_SELECT)
      .eq('id', req.tenantId)
      .single()

    if (error) throw error
    // Mask waba_token — never send the raw token to the client
    return res.json({ tenant: { ...data, waba_token_set: false } })
  } catch (err) {
    console.error('GET /settings error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// GET /api/settings/whatsapp-status
router.get('/whatsapp-status', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('waba_phone_id,waba_business_id,waba_token')
      .eq('id', req.tenantId)
      .single()

    if (error) throw error
    return res.json({
      configured: !!(data.waba_phone_id && data.waba_token),
      phone_id_set: !!data.waba_phone_id,
      token_set: !!data.waba_token,
      business_id_set: !!data.waba_business_id,
      phone_id_preview: data.waba_phone_id || null
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// PATCH /api/settings — update safe tenant fields
router.patch('/', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const allowed = [
      'display_name',
      'admin_phone',
      'payment_link_general',
      'logo_url',
      'org_type',
      'email',
      'website',
      'address',
      // Respuesta automática a quien escriba al número del colegio. Sí la
      // maneja el colegio: es SU voz la que contesta y él sabe a dónde mandar
      // a los papás.
      'auto_respuesta_activa',
      'auto_respuesta',
      // OJO: waba_phone_id / waba_token / waba_business_id NO van aquí.
      // Ahora el envío usa el número del colegio, así que dejar que el propio
      // colegio los edite le permitiría poner el número de OTRO y mandar
      // mensajes suplantándolo. Solo se tocan desde el panel de Admin.
      // Contact management
      'contact_grace_period_days',
      // Google Sheets integration
      'sheets_url',
      // Fiscal data
      'razon_social',
      'rfc',
      'regimen_fiscal',
      'uso_cfdi',
      'fiscal_street',
      'fiscal_colony',
      'fiscal_city',
      'fiscal_state',
      'fiscal_zip',
      'email_facturacion'
    ]

    const updates = { updated_at: new Date().toISOString() }
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field] === '' ? null : req.body[field]
      }
    }

    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', req.tenantId)
      .select(TENANT_SELECT)
      .single()

    if (error) throw error
    return res.json({ tenant: data })
  } catch (err) {
    console.error('PATCH /settings error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ================================================================
// TEAM MANAGEMENT  (max 5 users per tenant)
// ================================================================
const MAX_TEAM = 5

// GET /api/settings/users
router.get('/users', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { data: members, error } = await supabase
      .from('tenant_users')
      .select('user_id, role, created_at')
      .eq('tenant_id', req.tenantId)
      .order('created_at', { ascending: true })

    if (error) throw error

    const users = await Promise.all(
      members.map(async (m) => {
        try {
          const { data: { user } } = await supabase.auth.admin.getUserById(m.user_id)
          return {
            user_id:    m.user_id,
            role:       m.role,
            created_at: m.created_at,
            email:      user?.email || '',
            name:       user?.user_metadata?.full_name || user?.user_metadata?.name || '',
            is_self:    m.user_id === req.user.id
          }
        } catch {
          return { user_id: m.user_id, role: m.role, created_at: m.created_at, email: '', name: '', is_self: m.user_id === req.user.id }
        }
      })
    )

    // Las invitaciones sin usar se muestran junto al equipo: si no se vieran,
    // el director volvería a invitar a la misma persona creyendo que no salió.
    const pendientes = (await invitacionesVivas(req.tenantId)).map(i => ({
      id: i.id,
      nombre: i.nombre_director,
      telefono: i.telefono,
      role: i.rol,
      expira_en: i.expira_en,
      pendiente: true
    }))

    return res.json({
      users,
      pendientes,
      // El límite cuenta a los que ya entraron MÁS los invitados: si no, se
      // pueden mandar veinte ligas y amanecer con veinte personas dentro.
      total: members.length + pendientes.length,
      max: MAX_TEAM
    })
  } catch (err) {
    console.error('GET /settings/users error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/settings/users — invitar por WhatsApp
//
// Antes esto mandaba un correo (inviteUserByEmail). Ahora manda la misma liga
// de un solo uso que usa el director para activar su cuenta: un solo camino de
// entrada, y por donde la gente del colegio sí ve los mensajes.
router.post('/users', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    if (req.tenantRole !== 'owner' && !req.isAdmin) {
      return res.status(403).json({ error: 'Solo el administrador puede agregar usuarios' })
    }

    const { telefono, role = 'comms', name = '' } = req.body
    const tel = normalizePhone(telefono || '')

    if (!tel)        return res.status(400).json({ error: 'El WhatsApp es requerido' })
    if (!name.trim()) return res.status(400).json({ error: 'El nombre es requerido' })

    const ALLOWED_ROLES = ['owner', 'billing', 'comms']
    if (!ALLOWED_ROLES.includes(role)) return res.status(400).json({ error: 'Rol inválido' })

    const [{ count, error: countErr }, pendientes] = await Promise.all([
      supabase.from('tenant_users').select('*', { count: 'exact', head: true }).eq('tenant_id', req.tenantId),
      invitacionesVivas(req.tenantId)
    ])
    if (countErr) throw countErr

    if (count + pendientes.length >= MAX_TEAM) {
      return res.status(400).json({
        error: `Límite de ${MAX_TEAM} usuarios alcanzado (contando invitaciones sin usar)`
      })
    }

    // Dos ligas vivas al mismo teléfono solo confunden: la persona abre la
    // vieja, le dice "ya se usó" y le habla al director.
    if (pendientes.some(p => normalizePhone(p.telefono) === tel)) {
      return res.status(400).json({ error: 'Ya hay una invitación pendiente para ese WhatsApp' })
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('display_name, name')
      .eq('id', req.tenantId)
      .maybeSingle()

    const inv = await crearActivacion({
      tenantId: req.tenantId,
      nombreDirector: name.trim(),
      telefono: tel,
      nombreColegio: tenant?.display_name || tenant?.name || '',
      rol: role,
      invitadoPor: req.user.id
    })

    return res.status(201).json({
      invitacion: {
        id: inv.id,
        nombre: name.trim(),
        telefono: tel,
        role,
        expira_en: inv.expira_en,
        pendiente: true
      },
      // La liga se devuelve siempre para que el director la pueda pasar a mano
      // si el WhatsApp no salió. Es la misma salida que tiene el alta.
      liga: inv.liga,
      enviada: inv.enviado,
      aviso: inv.motivo
    })
  } catch (err) {
    console.error('POST /settings/users error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/settings/invitaciones/:id/reenviar — nueva liga, mismo destinatario
router.post('/invitaciones/:id/reenviar', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    if (req.tenantRole !== 'owner' && !req.isAdmin) {
      return res.status(403).json({ error: 'Solo el administrador puede reenviar invitaciones' })
    }

    const { data: previa } = await supabase
      .from('activaciones')
      .select('id, nombre_director, telefono, rol, usado_en')
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)      // no se tocan invitaciones de otro colegio
      .maybeSingle()

    if (!previa)          return res.status(404).json({ error: 'Invitación no encontrada' })
    if (previa.usado_en)  return res.status(400).json({ error: 'Esa persona ya activó su cuenta' })

    const { data: tenant } = await supabase
      .from('tenants').select('display_name, name').eq('id', req.tenantId).maybeSingle()

    // La liga vieja se cancela: si siguiera viva habría dos válidas al mismo
    // teléfono y la persona podría abrir la que ya no corresponde.
    await supabase.from('activaciones')
      .update({ cancelada_en: new Date().toISOString() })
      .eq('id', previa.id)
      .is('usado_en', null)

    const inv = await crearActivacion({
      tenantId: req.tenantId,
      nombreDirector: previa.nombre_director,
      telefono: previa.telefono,
      nombreColegio: tenant?.display_name || tenant?.name || '',
      rol: previa.rol,
      invitadoPor: req.user.id
    })

    return res.json({ id: inv.id, liga: inv.liga, enviada: inv.enviado, aviso: inv.motivo, expira_en: inv.expira_en })
  } catch (err) {
    console.error('POST /settings/invitaciones/:id/reenviar error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// DELETE /api/settings/invitaciones/:id — cancelar antes de que la usen
router.delete('/invitaciones/:id', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    if (req.tenantRole !== 'owner' && !req.isAdmin) {
      return res.status(403).json({ error: 'Solo el administrador puede cancelar invitaciones' })
    }

    // Se marca, no se borra: queda el rastro de que existió y de quién la mandó.
    const { data, error } = await supabase
      .from('activaciones')
      .update({ cancelada_en: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .is('usado_en', null)
      .select('id')

    if (error) throw error
    if (!data?.length) return res.status(404).json({ error: 'Invitación no encontrada o ya usada' })

    return res.json({ cancelada: true })
  } catch (err) {
    console.error('DELETE /settings/invitaciones/:id error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// El reenvío de invitación por correo (inviteUserByEmail) se eliminó: ya no hay
// invitaciones por correo, y para quien ya activó su cuenta no tenía sentido
// —esa persona ya tiene contraseña—. El reenvío vive ahora en
// POST /invitaciones/:id/reenviar, que solo aplica a ligas sin usar.

// DELETE /api/settings/users/:userId — remove team member
router.delete('/users/:userId', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    if (req.tenantRole !== 'owner' && !req.isAdmin) {
      return res.status(403).json({ error: 'Solo el administrador puede eliminar usuarios' })
    }

    if (req.params.userId === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' })
    }

    const { data: member, error: findErr } = await supabase
      .from('tenant_users')
      .select('user_id, role')
      .eq('tenant_id', req.tenantId)
      .eq('user_id', req.params.userId)
      .maybeSingle()

    if (findErr || !member) return res.status(404).json({ error: 'Usuario no encontrado en este equipo' })

    // Protect last owner
    if (member.role === 'owner') {
      const { count } = await supabase
        .from('tenant_users')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', req.tenantId)
        .eq('role', 'owner')
      if (count <= 1) return res.status(400).json({ error: 'No puedes eliminar al único administrador' })
    }

    const { error: deleteErr } = await supabase
      .from('tenant_users')
      .delete()
      .eq('tenant_id', req.tenantId)
      .eq('user_id', req.params.userId)

    if (deleteErr) throw deleteErr
    return res.json({ success: true })
  } catch (err) {
    console.error('DELETE /settings/users/:userId error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ─── SPEI Add-on ─────────────────────────────────────────────────────────────

// PATCH /api/settings/spei — enable/disable SPEI add-on and set payout CLABE
router.patch('/spei', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { spei_addon_enabled, payout_clabe } = req.body
    const tenantId = req.tenantId

    const updates = {}
    if (typeof spei_addon_enabled === 'boolean') updates.spei_addon_enabled = spei_addon_enabled
    if (payout_clabe !== undefined) updates.payout_clabe = payout_clabe || null

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', tenantId)
      .select('spei_addon_enabled, payout_clabe')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ spei_addon_enabled: data.spei_addon_enabled, payout_clabe: data.payout_clabe })
  } catch (err) {
    console.error('PATCH /settings/spei error:', err)
    return res.status(500).json({ error: err.message })
  }
})

export default router
