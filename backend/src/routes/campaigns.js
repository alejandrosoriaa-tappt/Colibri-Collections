import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { inferTenantGuard } from '../middleware/tenantGuard.js'
import supabase, {
  getCampaignsByTenant,
  getCampaign,
  getCampaignMessages,
  updateCampaignMessage,
  updateCampaignStats
} from '../services/supabase.js'

const router = Router()

const defaultMessages = [
  {
    message_number: 1,
    trigger_day: 1,
    send_to: 'all',
    message_template:
      'Hola {nombre} 👋, {nombre_escuela} te recuerda que tu {concept} del mes es de ${monto}. Tienes hasta el {fecha_limite} sin recargo. Paga aquí: {liga_pago}'
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
      'Aviso importante de {nombre_escuela}: tu {concept} de este mes (${monto_con_recargo}) sigue sin pagarse. Los adeudos no regularizados al cierre del mes pueden generar sanciones administrativas. Regulariza hoy: {liga_pago}'
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

export default router
