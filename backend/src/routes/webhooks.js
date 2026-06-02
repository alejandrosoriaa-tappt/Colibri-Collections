import { Router } from 'express'
import supabase from '../services/supabase.js'

const router = Router()

// GET /api/webhooks/whatsapp — Meta verification challenge
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook: WhatsApp verification successful')
    return res.status(200).send(challenge)
  }

  console.warn('Webhook: WhatsApp verification failed', { mode, token })
  return res.status(403).json({ error: 'Verification failed' })
})

// POST /api/webhooks/whatsapp — incoming status updates
router.post('/whatsapp', async (req, res) => {
  try {
    // Acknowledge receipt immediately
    res.status(200).json({ status: 'ok' })

    // express.raw() gives a Buffer — parse it
    const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body

    if (body.object !== 'whatsapp_business_account') {
      return
    }

    const entries = body.entry || []

    for (const entry of entries) {
      const changes = entry.changes || []
      for (const change of changes) {
        if (change.field !== 'messages') continue

        const value = change.value || {}

        // Process status updates
        const statuses = value.statuses || []
        for (const statusUpdate of statuses) {
          await handleStatusUpdate(statusUpdate)
        }

        // Process incoming messages (customer replies)
        const messages = value.messages || []
        for (const incomingMsg of messages) {
          await handleIncomingMessage(incomingMsg, value.contacts)
        }
      }
    }
  } catch (err) {
    console.error('Webhook POST error:', err)
  }
})

async function handleStatusUpdate(statusUpdate) {
  const { id: waMessageId, status, timestamp, errors } = statusUpdate

  if (!waMessageId) return

  // Map Meta status to our status
  const statusMap = {
    sent: 'sent',
    delivered: 'delivered',
    read: 'read',
    failed: 'failed'
  }

  const mappedStatus = statusMap[status] || status

  try {
    const { error } = await supabase
      .from('message_logs')
      .update({
        status: mappedStatus,
        delivered_at: mappedStatus === 'delivered' ? new Date(Number(timestamp) * 1000).toISOString() : undefined,
        read_at: mappedStatus === 'read' ? new Date(Number(timestamp) * 1000).toISOString() : undefined,
        error_message: errors ? JSON.stringify(errors) : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('wa_message_id', waMessageId)

    if (error) {
      console.error('Webhook: Failed to update message log:', error)
    } else {
      console.log(`Webhook: Updated message ${waMessageId} to status ${mappedStatus}`)
    }
  } catch (err) {
    console.error('Webhook: Error handling status update:', err)
  }
}

async function handleIncomingMessage(message, contacts) {
  const from = message.from // E.164 digits without +, e.g. "5215512345678"
  const text = (message.text?.body || message.button?.text || '').trim().toLowerCase()

  console.log('Webhook: Incoming message from', from, ':', text.substring(0, 60))

  // Detect "Recibido" quick-reply — marks tenant onboarding as confirmed
  if (text.includes('recibido')) {
    await handleOnboardingConfirmation(from)
  }
}

async function handleOnboardingConfirmation(fromPhone) {
  try {
    // Meta sends phone without +, normalize both sides for comparison
    // Strip non-digits from stored admin_phone to match Meta format
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, display_name, admin_phone, whatsapp_confirmed_at')
      .not('admin_phone', 'is', null)

    if (error || !tenants?.length) return

    const matched = tenants.find(t => {
      const stored = String(t.admin_phone || '').replace(/[^\d]/g, '')
      return stored === fromPhone || stored === `1${fromPhone}`
    })

    if (!matched) {
      console.log('Webhook: "Recibido" reply from unknown number:', fromPhone)
      return
    }

    if (matched.whatsapp_confirmed_at) {
      console.log(`Webhook: Tenant ${matched.display_name} already confirmed`)
      return
    }

    const { error: updateErr } = await supabase
      .from('tenants')
      .update({ whatsapp_confirmed_at: new Date().toISOString() })
      .eq('id', matched.id)

    if (updateErr) {
      console.error('Webhook: Failed to confirm tenant onboarding:', updateErr)
    } else {
      console.log(`Webhook: ✅ Onboarding confirmed for tenant "${matched.display_name}" (${matched.id})`)
    }
  } catch (err) {
    console.error('Webhook: Error in handleOnboardingConfirmation:', err)
  }
}

export default router
