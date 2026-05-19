import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { inferTenantGuard } from '../middleware/tenantGuard.js'
import supabase, {
  getInvoices,
  getCampaign,
  markInvoicePaid,
  updateInvoice,
  updateCampaignStats
} from '../services/supabase.js'

const router = Router()

// GET /api/campaigns/:id/invoices
router.get('/campaigns/:id/invoices', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const campaign = await getCampaign(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

    if (!req.isAdmin && campaign.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const { status, page = 1, limit = 100 } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    let query = supabase
      .from('invoices')
      .select('*, contacts(id, nombre, apellido, telefono, grupo)', { count: 'exact' })
      .eq('campaign_id', req.params.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: invoices, error, count } = await query
    if (error) return res.status(500).json({ error: error.message })

    // Get message delivery status per invoice
    const invoiceIds = invoices.map(i => i.id)
    let messageLogs = []
    if (invoiceIds.length > 0) {
      const { data: logs } = await supabase
        .from('message_logs')
        .select('invoice_id, message_number, status, sent_at')
        .in('invoice_id', invoiceIds)

      messageLogs = logs || []
    }

    // Merge message delivery info
    const invoicesWithMessages = invoices.map(inv => {
      const logs = messageLogs.filter(l => l.invoice_id === inv.id)
      const msgStatus = {}
      for (let n = 1; n <= 4; n++) {
        const log = logs.find(l => l.message_number === n && l.status === 'sent')
        msgStatus[`m${n}_sent`] = !!log
        msgStatus[`m${n}_sent_at`] = log?.sent_at || null
      }
      return { ...inv, ...msgStatus }
    })

    return res.json({
      invoices: invoicesWithMessages,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(count / Number(limit))
      }
    })
  } catch (err) {
    console.error('GET /campaigns/:id/invoices error:', err)
    return res.status(500).json({ error: err.message })
  }
})

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
