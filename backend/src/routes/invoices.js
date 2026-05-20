import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { inferTenantGuard } from '../middleware/tenantGuard.js'
import supabase, {
  getCampaign,
  markInvoicePaid,
  updateInvoice,
  updateCampaignStats
} from '../services/supabase.js'

const router = Router()

// PATCH /api/invoices/:id/mark-paid
router.patch('/:id/mark-paid', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    if (!req.isAdmin && invoice.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const { reference, notes } = req.body

    const updated = await markInvoicePaid(req.params.id, { reference, notes })

    // Update campaign stats
    try {
      await updateCampaignStats(invoice.campaign_id)
    } catch (statsErr) {
      console.error('Failed to update campaign stats after marking paid:', statsErr)
    }

    return res.json({ invoice: updated })
  } catch (err) {
    console.error('PATCH /invoices/:id/mark-paid error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// PATCH /api/invoices/:id/notes
router.patch('/:id/notes', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    if (!req.isAdmin && invoice.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const { notes } = req.body

    const updated = await updateInvoice(req.params.id, { notes })
    return res.json({ invoice: updated })
  } catch (err) {
    console.error('PATCH /invoices/:id/notes error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// PATCH /api/invoices/:id/suspend
router.patch('/:id/suspend', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    if (!req.isAdmin && invoice.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const updated = await updateInvoice(req.params.id, { status: 'suspended' })
    return res.json({ invoice: updated })
  } catch (err) {
    console.error('PATCH /invoices/:id/suspend error:', err)
    return res.status(500).json({ error: err.message })
  }
})

export default router
