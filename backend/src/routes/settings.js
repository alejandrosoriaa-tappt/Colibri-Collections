/**
 * /api/settings — Tenant self-service settings
 * Tenants can read and update their own config (no super-admin required)
 */
import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { inferTenantGuard } from '../middleware/tenantGuard.js'
import supabase from '../services/supabase.js'

const router = Router()

// GET /api/settings — return current tenant settings
router.get('/', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('id,name,display_name,slug,plan,status,admin_phone,payment_link_general,subscription_amount,logo_url,waba_phone_id,waba_business_id,org_type,created_at')
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

// Check if waba_token is set
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
      'waba_phone_id',
      'waba_token',
      'waba_business_id'
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
      .select('id,name,display_name,slug,plan,status,admin_phone,payment_link_general,subscription_amount,logo_url,waba_phone_id,waba_business_id,org_type')
      .single()

    if (error) throw error
    return res.json({ tenant: data })
  } catch (err) {
    console.error('PATCH /settings error:', err)
    return res.status(500).json({ error: err.message })
  }
})

export default router
