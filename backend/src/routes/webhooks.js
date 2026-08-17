import { Router } from 'express'
import supabase from '../services/supabase.js'
import { sendWhatsAppTemplate, sendWhatsAppMessage } from '../services/whatsapp.js'
import { confirmacionPagoComponents, TEMPLATE_NAMES } from '../templates/whatsappTemplates.js'

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
          await handleIncomingMessage(incomingMsg, value.contacts, value.metadata)
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

  // Meta puede avisar 'sent'/'delivered' ANTES de que terminemos de insertar la
  // fila en message_logs (se vio en producción llegando en el mismo segundo).
  // Un UPDATE que no empata ninguna fila NO es error en Postgres, así que el
  // evento se perdía en silencio y los KPIs se quedaban en cero. Reintentamos
  // dándole tiempo al insert.
  const REINTENTOS = [0, 2000, 5000, 15000]

  for (let intento = 0; intento < REINTENTOS.length; intento++) {
    if (REINTENTOS[intento] > 0) {
      await new Promise(r => setTimeout(r, REINTENTOS[intento]))
    }
    try {
      const cambios = {
        status: mappedStatus,
        error_message: errors ? JSON.stringify(errors) : undefined,
        updated_at: new Date().toISOString()
      }
      if (mappedStatus === 'delivered') cambios.delivered_at = new Date(Number(timestamp) * 1000).toISOString()
      if (mappedStatus === 'read')      cambios.read_at      = new Date(Number(timestamp) * 1000).toISOString()

      // .select() devuelve las filas afectadas: así sabemos si de verdad empató
      const { data, error } = await supabase
        .from('message_logs')
        .update(cambios)
        .eq('wa_message_id', waMessageId)
        .select('id')

      if (error) {
        console.error('Webhook: error actualizando message_log:', error.message)
        return
      }
      if (data && data.length > 0) {
        console.log(`Webhook: ${waMessageId} → ${mappedStatus}`)
        return
      }
      // 0 filas: el envío todavía no se registra. Se reintenta.
    } catch (err) {
      console.error('Webhook: excepción actualizando estado:', err)
      return
    }
  }

  console.warn(
    `Webhook: ${waMessageId} → ${mappedStatus} sin fila en message_logs tras ${REINTENTOS.length} intentos. ` +
    'Ese envío no va a contar en entregados/leídos.'
  )
}

async function handleIncomingMessage(message, contacts, metadata) {
  const from = message.from // E.164 digits without +, e.g. "5215512345678"
  const text = (message.text?.body || message.button?.text || '').trim().toLowerCase()

  console.log('Webhook: Incoming message from', from, ':', text.substring(0, 60))

  // Detect "Recibido" quick-reply — marks tenant onboarding as confirmed
  if (text.includes('recibido')) {
    await handleOnboardingConfirmation(from)
    return   // ya se le respondió con la confirmación; no sumar la automática
  }

  await responderAutomatico(message, from, metadata)
}

// Una respuesta por persona cada 24 h. Sin esto, alguien que manda cinco
// mensajes seguidos recibe cinco respuestas iguales y el colegio parece un bot
// enloquecido. En memoria a propósito: si el servidor reinicia y alguien recibe
// una respuesta de más, no pasa nada.
const ultimaRespuesta = new Map()   // "phoneId|from" → timestamp
const ESPERA_MS = 24 * 60 * 60 * 1000

function textoPorDefecto(colegio) {
  const nombre = colegio || 'el colegio'
  return `Hola, gracias por escribir. Este número de ${nombre} es solo para enviar ` +
         `avisos y comunicados, y no se leen los mensajes que llegan aquí.\n\n` +
         `Para cualquier duda o trámite, comunícate con el colegio por los medios de siempre. ` +
         `¡Gracias!`
}

/**
 * Contesta a quien escribe al número de un colegio.
 *
 * Un número de WhatsApp no se puede cerrar a recibir, así que el papá va a
 * escribir de todos modos. Sin respuesta, su mensaje cae en un buzón que nadie
 * lee y él cree que lo ignoraron.
 *
 * Va como texto libre, que aquí sí está permitido: el mensaje del papá abre la
 * ventana de 24 horas de atención al cliente.
 */
async function responderAutomatico(message, from, metadata) {
  try {
    // Las reacciones (👍) no son una pregunta; responderlas es ruido.
    if (message.type === 'reaction') return

    const phoneId = metadata?.phone_number_id
    if (!phoneId) return

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, display_name, auto_respuesta_activa, auto_respuesta')
      .eq('waba_phone_id', phoneId)
      .maybeSingle()

    // Sin colegio dueño de ese número —o con la respuesta apagada— no se
    // contesta. El número de Kollybry entra aquí: sus conversaciones son de
    // onboarding y sí las atiende una persona.
    if (!tenant || tenant.auto_respuesta_activa === false) return

    const llave = `${phoneId}|${from}`
    const previa = ultimaRespuesta.get(llave)
    if (previa && Date.now() - previa < ESPERA_MS) return
    ultimaRespuesta.set(llave, Date.now())

    const texto = tenant.auto_respuesta?.trim() ||
      textoPorDefecto(tenant.display_name || tenant.name)

    const r = await sendWhatsAppMessage(from, texto, phoneId)
    if (!r.success) {
      // Se registra el motivo: si Meta lo rechaza, el colegio queda callado
      // frente a sus papás y nadie se enteraría.
      console.error(`Webhook: no se pudo responder a ${from.slice(-4)} desde ${phoneId}: ${r.error}`)
    }
  } catch (err) {
    console.error('Webhook: error en responderAutomatico:', err.message)
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/webhooks/conekta — incoming SPEI payment notifications
// ─────────────────────────────────────────────────────────────────────────────
router.post('/conekta', async (req, res) => {
  try {
    res.status(200).json({ status: 'ok' })

    const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body
    const type = body?.type
    const data = body?.data?.object

    console.log(`Conekta webhook: type=${type}`)

    // We care about successful SPEI payments
    // Event types: 'payment_source.updated', 'order.paid', 'customer.payment_sources.updated'
    if (!type || !data) return

    if (type === 'customer.payment_sources.updated' || type === 'payment_source.updated') {
      const conektaCustomerId = data.customer_id || data.parent_id
      if (conektaCustomerId) {
        await handleConektaSPEIPayment({ conektaCustomerId, amount: data.amount, data })
      }
    }
  } catch (err) {
    console.error('Conekta webhook error:', err)
  }
})

async function handleConektaSPEIPayment({ conektaCustomerId, amount, data }) {
  try {
    // 1. Find contact by Conekta customer ID
    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .select('id, nombre, apellido, telefono, tenant_id, tenants(display_name, name)')
      .eq('conekta_customer_id', conektaCustomerId)
      .maybeSingle()

    if (contactErr || !contact) {
      console.log(`Conekta SPEI: no contact found for customer ${conektaCustomerId}`)
      return
    }

    const amountMXN = amount ? amount / 100 : null // Conekta amounts are in cents

    // 2. Find the most recent unpaid invoice for this contact
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('id, concepto, monto, campaign_id')
      .eq('contact_id', contact.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (invErr || !invoice) {
      console.log(`Conekta SPEI: no pending invoice for contact ${contact.id}`)
      return
    }

    // 3. Mark invoice as paid
    const paidAt = new Date().toISOString()
    await supabase
      .from('invoices')
      .update({ status: 'paid', paid_at: paidAt })
      .eq('id', invoice.id)

    console.log(`Conekta SPEI: ✅ Invoice ${invoice.id} marked paid for ${contact.nombre} ${contact.apellido || ''}`)

    // 4. Log the payment in message_logs
    await supabase.from('message_logs').insert({
      tenant_id: contact.tenant_id,
      contact_id: contact.id,
      campaign_id: invoice.campaign_id,
      type: 'spei_payment',
      status: 'received',
      sent_at: paidAt
    })

    // 5. Send WhatsApp confirmation to the contact
    if (contact.telefono) {
      const orgName = contact.tenants?.display_name || contact.tenants?.name || 'tu organización'
      const nombre = contact.nombre || 'Residente'
      const monto = amountMXN || invoice.monto

      await sendWhatsAppTemplate(
        contact.telefono,
        TEMPLATE_NAMES.CONFIRMACION_PAGO.name,
        TEMPLATE_NAMES.CONFIRMACION_PAGO.lang,
        confirmacionPagoComponents({
          nombre,
          orgName,
          concepto: invoice.concepto,
          monto,
          fecha: paidAt
        })
      )

      console.log(`Conekta SPEI: ✅ Confirmation WA sent to ${contact.telefono}`)
    }
  } catch (err) {
    console.error('handleConektaSPEIPayment error:', err)
  }
}

export default router
