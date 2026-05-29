import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import supabase, {
  getAllTenants,
  createTenant,
  updateTenant,
  getTenant,
  getActiveTenants
} from '../services/supabase.js'
import { sendWhatsAppMessage } from '../services/whatsapp.js'
import { sendOperationalNotification } from '../services/notifier.js'

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

// POST /api/admin/onboard — create tenant + user + send welcome WhatsApp in one shot
router.post('/onboard', authMiddleware, adminOnly, async (req, res) => {
  const { org_name, display_name, slug, plan = 'basic', org_type = 'general', admin_phone, email, password, send_whatsapp = true } = req.body

  if (!org_name || !email || !password) {
    return res.status(400).json({ error: 'org_name, email y password son requeridos' })
  }

  let authUser = null
  let tenant = null

  try {
    // 1. Create Supabase Auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true   // skip confirmation email, we handle welcome manually
    })
    if (authErr) throw new Error(`Error creando usuario: ${authErr.message}`)
    authUser = authData.user

    // 2. Create tenant
    const tenantSlug = slug || org_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
    const { data: tenantData, error: tenantErr } = await supabase
      .from('tenants')
      .insert({
        name: org_name.toLowerCase().replace(/\s+/g, '-'),
        display_name: display_name || org_name,
        slug: tenantSlug,
        plan,
        org_type,
        status: 'trial',
        admin_phone: admin_phone || null
      })
      .select()
      .single()
    if (tenantErr) throw new Error(`Error creando tenant: ${tenantErr.message}`)
    tenant = tenantData

    // 3. Link user → tenant (as owner)
    const { error: linkErr } = await supabase
      .from('tenant_users')
      .insert({ tenant_id: tenant.id, user_id: authUser.id, role: 'owner' })
    if (linkErr) throw new Error(`Error vinculando usuario: ${linkErr.message}`)

    // 4. Send welcome WhatsApp (if phone provided and flag is true)
    let whatsappSent = false
    if (send_whatsapp && admin_phone) {
      const welcomeText = `¡Bienvenido a Kollybry! 🎉\n\nHola, aquí están tus credenciales de acceso:\n\n📧 Usuario: ${email}\n🔑 Contraseña temporal: ${password}\n\n🔗 Accede en: https://app.kollybry.com\n\n⚠️ Te recomendamos cambiar tu contraseña en Configuración al entrar por primera vez.\n\n¿Dudas? Estamos aquí para ayudarte.`
      const result = await sendWhatsAppMessage(admin_phone, welcomeText)
      whatsappSent = result.success
    }

    return res.json({ tenant, user: { id: authUser.id, email }, whatsapp_sent: whatsappSent })

  } catch (err) {
    // Rollback: delete auth user if tenant creation failed
    if (authUser && !tenant) {
      await supabase.auth.admin.deleteUser(authUser.id).catch(() => {})
    }
    console.error('POST /admin/onboard error:', err)
    return res.status(500).json({ error: err.message })
  }
})

export default router
