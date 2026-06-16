import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { inferTenantGuard } from '../middleware/tenantGuard.js'
import supabase, {
  getCampaignsByTenant,
  getCampaign,
  getCampaignMessages,
  updateCampaignMessage,
  updateCampaignStats,
  upsertInvoice,
  getInvoices,
  logMessage
} from '../services/supabase.js'
import { sendWhatsAppMessage, sendWhatsAppTemplate } from '../services/whatsapp.js'
import { buildMessage, calculateAmountWithLateFee } from '../templates/messages.js'
import { TEMPLATE_NAMES, recordatorioPagoComponents } from '../templates/whatsappTemplates.js'

const router = Router()

const defaultMessages = [
  {
    message_number: 1,
    trigger_day: 1,
    send_to: 'all',
    message_template:
      'Hola {nombre} 👋, {nombre_org} te recuerda que tu {concept} del mes es de ${monto}. Tienes hasta el {fecha_limite} sin recargo. Paga aquí: {liga_pago}'
  },
  {
    message_number: 2,
    trigger_day: 8,
    send_to: 'unpaid',
    message_template:
      'Recordatorio: quedan 2 días para pagar sin recargo tu {concept} (${monto}). No dejes que te apliquen recargo del {late_fee_pct}%. Paga hoy: {liga_pago}'
  },
  {
    message_number: 3,
    trigger_day: 20,
    send_to: 'unpaid',
    message_template:
      'Hola {nombre}, tu {concept} de este mes sigue pendiente (${monto_con_recargo} con recargo). Te recomendamos regularizar antes de fin de mes. Paga aquí: {liga_pago}'
  },
  {
    message_number: 4,
    trigger_day: 28,
    send_to: 'unpaid',
    message_template:
      'Aviso importante de {nombre_org}: tu {concept} de este mes (${monto_con_recargo}) sigue sin pagarse. Los adeudos no regularizados al cierre del mes pueden generar sanciones administrativas. Regulariza hoy: {liga_pago}'
  }
]

// GET /api/campaigns
router.get('/', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const campaigns = await getCampaignsByTenant(req.tenantId)
    return res.json({ campaigns })
  } catch (err) {
    console.error('GET /campaigns error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/campaigns
router.post('/', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const {
      name,
      concept,
      cycle_start_date,
      due_date,
      cycle_end_date,
      late_fee_pct,
      grupo_filter,
      messages: customMessages
    } = req.body

    if (!name || !concept || !cycle_start_date) {
      return res.status(400).json({ error: 'name, concept, and cycle_start_date are required' })
    }

    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        tenant_id: req.tenantId,
        name,
        concept,
        cycle_start_date,
        due_date: due_date || null,
        cycle_end_date: cycle_end_date || null,
        late_fee_pct: late_fee_pct || 0,
        grupo_filter: grupo_filter || null,
        status: 'draft',
        total_contacts: 0,
        paid_count: 0,
        pending_count: 0,
        total_amount: 0,
        paid_amount: 0
      })
      .select()
      .single()

    if (campaignError) {
      return res.status(500).json({ error: campaignError.message })
    }

    // Create default campaign messages (use custom if provided)
    const messagesToInsert = (customMessages || defaultMessages).map(m => ({
      campaign_id: campaign.id,
      tenant_id: req.tenantId,
      message_number: m.message_number,
      trigger_day: m.trigger_day,
      send_to: m.send_to,
      message_template: m.message_template,
      sent_at: null,
      sent_count: 0,
      failed_count: 0
    }))

    const { data: messages, error: msgError } = await supabase
      .from('campaign_messages')
      .insert(messagesToInsert)
      .select()

    if (msgError) {
      console.error('Failed to create campaign messages:', msgError)
    }

    return res.status(201).json({ campaign, messages: messages || [] })
  } catch (err) {
    console.error('POST /campaigns error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// GET /api/campaigns/:id
router.get('/:id', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const campaign = await getCampaign(req.params.id)

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' })
    }

    if (!req.isAdmin && campaign.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const messages = await getCampaignMessages(campaign.id)

    return res.json({ campaign, messages })
  } catch (err) {
    console.error('GET /campaigns/:id error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// PATCH /api/campaigns/:id
router.patch('/:id', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const campaign = await getCampaign(req.params.id)

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' })
    }

    if (!req.isAdmin && campaign.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const allowedFields = [
      'name', 'concept', 'cycle_start_date', 'due_date',
      'cycle_end_date', 'late_fee_pct', 'status'
    ]

    const updates = {}
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field]
      }
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.json({ campaign: data })
  } catch (err) {
    console.error('PATCH /campaigns/:id error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// DELETE /api/campaigns/:id
router.delete('/:id', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const campaign = await getCampaign(req.params.id)

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' })
    }

    if (!req.isAdmin && campaign.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    if (campaign.status === 'active') {
      return res.status(400).json({ error: 'Cannot delete an active campaign. Pause it first.' })
    }

    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', req.params.id)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.json({ success: true })
  } catch (err) {
    console.error('DELETE /campaigns/:id error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// GET /api/campaigns/:id/messages
router.get('/:id/messages', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const campaign = await getCampaign(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

    if (!req.isAdmin && campaign.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const messages = await getCampaignMessages(campaign.id)
    return res.json({ messages })
  } catch (err) {
    console.error('GET /campaigns/:id/messages error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// PATCH /api/campaigns/:id/messages/:msgId
router.patch('/:id/messages/:msgId', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const campaign = await getCampaign(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

    if (!req.isAdmin && campaign.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Get the message
    const { data: msg, error: msgFetchError } = await supabase
      .from('campaign_messages')
      .select('*')
      .eq('id', req.params.msgId)
      .eq('campaign_id', req.params.id)
      .single()

    if (msgFetchError || !msg) {
      return res.status(404).json({ error: 'Message not found' })
    }

    // Cannot edit already sent messages
    if (msg.sent_at) {
      return res.status(400).json({ error: 'Cannot edit a message that has already been sent' })
    }

    const allowedFields = ['message_template', 'trigger_day', 'send_to']
    const updates = {}
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field]
      }
    }

    const updatedMsg = await updateCampaignMessage(req.params.msgId, updates)
    return res.json({ message: updatedMsg })
  } catch (err) {
    console.error('PATCH /campaigns/:id/messages/:msgId error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/campaigns/:id/messages/:msgId/send  — manual immediate send
router.post('/:id/messages/:msgId/send', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const campaign = await getCampaign(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

    if (!req.isAdmin && campaign.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const { data: msg, error: msgFetchError } = await supabase
      .from('campaign_messages')
      .select('*')
      .eq('id', req.params.msgId)
      .eq('campaign_id', req.params.id)
      .single()

    if (msgFetchError || !msg) {
      return res.status(404).json({ error: 'Message not found' })
    }

    const tenant = campaign.tenants
    const filters = { campaign_id: campaign.id }
    if (msg.send_to === 'unpaid') filters.status = 'pending'

    const invoices = await getInvoices(filters)

    let sentCount = 0
    let failedCount = 0
    const results = []

    for (const invoice of invoices) {
      const contact = invoice.contacts
      if (!contact?.telefono) continue

      const lateFee = Number(campaign.late_fee_pct) || 0
      const vars = {
        nombre: contact.nombre,
        alumno: contact.nombre_alumno || '',
        monto: invoice.monto,
        monto_con_recargo: calculateAmountWithLateFee(invoice.monto, lateFee),
        liga_pago: invoice.liga_pago || tenant?.payment_link_general || '',
        fecha_limite: campaign.due_date,
        nombre_org: tenant?.display_name || tenant?.name || '',
        concept: campaign.concept || 'pago mensual',
        late_fee_pct: lateFee
      }

      // Campañas de cobranza → usar template aprobado por Meta (funciona fuera de 24h)
      const isCobranza = !!(campaign.concept)
      let result
      if (isCobranza) {
        const components = recordatorioPagoComponents({
          nombre:   vars.nombre,
          orgName:  vars.nombre_org,
          concepto: vars.concept,
          monto:    vars.monto,
          link:     vars.liga_pago
        })
        result = await sendWhatsAppTemplate(
          contact.telefono,
          TEMPLATE_NAMES.RECORDATORIO_PAGO.name,
          TEMPLATE_NAMES.RECORDATORIO_PAGO.lang,
          components
        )
      } else {
        const text = buildMessage(msg.message_template, vars)
        result = await sendWhatsAppMessage(contact.telefono, text)
      }
      const text = isCobranza
        ? `[Template: ${TEMPLATE_NAMES.RECORDATORIO_PAGO.name}] ${vars.concept} $${vars.monto}`
        : buildMessage(msg.message_template, vars)

      await logMessage({
        tenant_id: campaign.tenant_id,
        campaign_id: campaign.id,
        contact_id: invoice.contact_id,
        invoice_id: invoice.id,
        campaign_message_id: msg.id,
        message_number: msg.message_number,
        message_text: text,
        phone: contact.telefono,
        wa_message_id: result.wa_message_id || null,
        status: result.success ? 'sent' : 'failed',
        error_message: result.error || null,
        sent_at: new Date().toISOString()
      }).catch(err => console.error('Failed to log message:', err))

      if (result.success) sentCount++
      else failedCount++

      results.push({
        contact: `${contact.nombre} ${contact.apellido || ''}`.trim(),
        phone: contact.telefono,
        success: result.success,
        error: result.error || null
      })

      await new Promise(r => setTimeout(r, 150))
    }

    // Mark message as sent and update stats
    await updateCampaignMessage(msg.id, {
      sent_at: new Date().toISOString(),
      sent_count: sentCount,
      failed_count: failedCount
    })
    await updateCampaignStats(campaign.id).catch(() => {})

    return res.json({ sent: sentCount, failed: failedCount, total: invoices.length, results })
  } catch (err) {
    console.error('POST /campaigns/:id/messages/:msgId/send error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/campaigns/:id/activate
router.post('/:id/activate', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const campaign = await getCampaign(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

    if (!req.isAdmin && campaign.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const { data, error } = await supabase
      .from('campaigns')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ campaign: data })
  } catch (err) {
    console.error('POST /campaigns/:id/activate error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/campaigns/:id/pause
router.post('/:id/pause', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const campaign = await getCampaign(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

    if (!req.isAdmin && campaign.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const { data, error } = await supabase
      .from('campaigns')
      .update({ status: 'paused', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ campaign: data })
  } catch (err) {
    console.error('POST /campaigns/:id/pause error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/campaigns/:id/populate-from-group — bulk-add contacts from campaign's grupo_filter
router.post('/:id/populate-from-group', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const campaign = await getCampaign(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })
    if (!req.isAdmin && campaign.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    if (!campaign.grupo_filter) {
      return res.status(400).json({ error: 'Esta campaña no tiene un grupo asignado' })
    }

    // Get tenant for payment_link_general
    const { data: tenant } = await supabase
      .from('tenants')
      .select('payment_link_general')
      .eq('id', req.tenantId)
      .single()

    // Fetch all active contacts in the campaign's group
    const { data: contacts, error: contactsErr } = await supabase
      .from('contacts')
      .select('id')
      .eq('tenant_id', req.tenantId)
      .eq('status', 'active')
      .eq('grupo', campaign.grupo_filter)

    if (contactsErr) throw contactsErr
    if (!contacts || contacts.length === 0) {
      return res.status(400).json({ error: `No hay contactos activos en el grupo "${campaign.grupo_filter}"` })
    }

    // Upsert invoices for each contact
    let added = 0
    for (const contact of contacts) {
      try {
        await upsertInvoice(req.params.id, contact.id, req.tenantId, {
          monto: 0,
          liga_pago: tenant?.payment_link_general || '',
          status: 'pending'
        })
        added++
      } catch (err) {
        console.error('populate-from-group: error upserting invoice', err)
      }
    }

    await updateCampaignStats(req.params.id)
    return res.json({ added, total: contacts.length, group: campaign.grupo_filter })
  } catch (err) {
    console.error('POST /campaigns/:id/populate-from-group error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/campaigns/:id/add-contacts — add individual contacts to a campaign
router.post('/:id/add-contacts', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const campaign = await getCampaign(req.params.id)
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })
    if (!req.isAdmin && campaign.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const { contact_ids, monto = 0 } = req.body
    if (!Array.isArray(contact_ids) || contact_ids.length === 0) {
      return res.status(400).json({ error: 'contact_ids array is required' })
    }

    // Get tenant for payment_link_general
    const { data: tenant } = await supabase
      .from('tenants')
      .select('payment_link_general')
      .eq('id', req.tenantId)
      .single()

    let added = 0
    const errors = []
    for (const contactId of contact_ids) {
      try {
        // Verify contact belongs to tenant
        const { data: contact } = await supabase
          .from('contacts')
          .select('id')
          .eq('id', contactId)
          .eq('tenant_id', req.tenantId)
          .single()

        if (!contact) {
          errors.push({ contact_id: contactId, error: 'Contact not found' })
          continue
        }

        await upsertInvoice(req.params.id, contactId, req.tenantId, {
          monto: Number(monto) || 0,
          liga_pago: tenant?.payment_link_general || '',
          status: 'pending'
        })
        added++
      } catch (err) {
        errors.push({ contact_id: contactId, error: err.message })
      }
    }

    // Update campaign stats
    await updateCampaignStats(req.params.id)

    return res.json({ added, errors, total: contact_ids.length })
  } catch (err) {
    console.error('POST /campaigns/:id/add-contacts error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// GET /api/campaigns/:id/invoices
router.get('/:id/invoices', authMiddleware, inferTenantGuard, async (req, res) => {
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
      .select('*, contacts(id, nombre, apellido, telefono, grupo, nombre_alumno)', { count: 'exact' })
      .eq('campaign_id', req.params.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: invoices, error, count } = await query
    if (error) return res.status(500).json({ error: error.message })

    const invoiceIds = invoices.map(i => i.id)
    let messageLogs = []
    if (invoiceIds.length > 0) {
      const { data: logs } = await supabase
        .from('message_logs')
        .select('invoice_id, message_number, status, sent_at')
        .in('invoice_id', invoiceIds)
      messageLogs = logs || []
    }

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
      pagination: { total: count, page: Number(page), limit: Number(limit), pages: Math.ceil(count / Number(limit)) }
    })
  } catch (err) {
    console.error('GET /campaigns/:id/invoices error:', err)
    return res.status(500).json({ error: err.message })
  }
})

export default router
