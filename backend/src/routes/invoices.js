import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { inferTenantGuard } from '../middleware/tenantGuard.js'
import supabase, {
  getCampaign,
  markInvoicePaid,
  updateInvoice,
  updateCampaignStats
} from '../services/supabase.js'
import { sendWhatsAppTemplate } from '../services/whatsapp.js'
import { TEMPLATE_NAMES, confirmacionPagoComponents } from '../templates/whatsappTemplates.js'

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

    // Send payment confirmation via WhatsApp (fire-and-forget)
    sendPaymentConfirmation(invoice, updated).catch(err =>
      console.error('Failed to send payment confirmation WA:', err)
    )

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

// ================================================================
// HELPERS
// ================================================================
async function sendPaymentConfirmation(invoice, updatedInvoice) {
  try {
    // Get contact phone
    const { data: contact } = await supabase
      .from('contacts')
      .select('nombre, telefono')
      .eq('id', invoice.contact_id)
      .single()

    if (!contact?.telefono) return

    // Get campaign + tenant name
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('concept, tenants(display_name, name)')
      .eq('id', invoice.campaign_id)
      .single()

    const orgName = campaign?.tenants?.display_name || campaign?.tenants?.name || 'Tu organización'
    const concepto = campaign?.concept || 'pago'
    const monto = updatedInvoice?.monto ?? invoice.monto
    const fecha = updatedInvoice?.paid_at
      ? updatedInvoice.paid_at.split('T')[0]
      : new Date().toISOString().split('T')[0]

    const components = confirmacionPagoComponents({ nombre: contact.nombre, orgName, concepto, monto, fecha })
    const result = await sendWhatsAppTemplate(contact.telefono, TEMPLATE_NAMES.CONFIRMACION_PAGO, 'es', components)

    if (result.success) {
      console.log(`Invoice ${invoice.id}: confirmación de pago enviada a ${contact.telefono}`)
    } else {
      console.warn(`Invoice ${invoice.id}: no se pudo enviar confirmación — ${result.error}`)
    }
  } catch (err) {
    console.error('sendPaymentConfirmation error:', err)
  }
}

export default router
