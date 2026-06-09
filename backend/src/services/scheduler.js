import cron from 'node-cron'
import supabase, {
  getActiveCampaigns,
  getCampaignMessages,
  getInvoices,
  getContact,
  getTenant,
  getActiveTenants,
  logMessage,
  updateCampaignMessage,
  updateCampaignStats
} from './supabase.js'
import { sendWhatsAppTemplate } from './whatsapp.js'
import { calculateAmountWithLateFee } from '../templates/messages.js'
import {
  TEMPLATE_NAMES,
  recordatorioPagoComponents,
  avisoVencidoComponents
} from '../templates/whatsappTemplates.js'
import { sendOperationalNotification } from './notifier.js'

function getDaysSince(dateStr) {
  if (!dateStr) return 0
  const start = new Date(dateStr + 'T00:00:00-06:00') // Mexico City offset
  const now = new Date()
  const diffMs = now - start
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function getCurrentCycleDay(cycleStartDate) {
  return getDaysSince(cycleStartDate) + 1
}

export function initScheduler() {
  console.log('Scheduler: Initializing...')

  // Daily 9am Mexico City
  cron.schedule(
    '0 9 * * *',
    async () => {
      console.log('Scheduler: Running daily job at', new Date().toISOString())
      try {
        await runDailyMessages()
        await runOperationalReminders()
      } catch (err) {
        console.error('Scheduler: Daily job error:', err)
      }
    },
    { timezone: 'America/Mexico_City' }
  )

  console.log('Scheduler: Daily cron job registered (9am Mexico City)')
}

export async function runDailyMessages() {
  let campaigns
  try {
    campaigns = await getActiveCampaigns()
  } catch (err) {
    console.error('Scheduler: Failed to get active campaigns:', err)
    return
  }

  console.log(`Scheduler: Processing ${campaigns.length} active campaigns`)

  for (const campaign of campaigns) {
    try {
      await processCampaign(campaign)
    } catch (err) {
      console.error(`Scheduler: Error processing campaign ${campaign.id}:`, err)
    }
  }
}

async function processCampaign(campaign) {
  const cycleDay = getCurrentCycleDay(campaign.cycle_start_date)
  console.log(`Scheduler: Campaign ${campaign.id} (${campaign.name}) — cycle day ${cycleDay}`)

  // Check if cycle has ended
  if (campaign.cycle_end_date) {
    const endDay = getDaysSince(campaign.cycle_end_date)
    if (endDay > 0) {
      console.log(`Scheduler: Campaign ${campaign.id} cycle has ended, skipping`)
      return
    }
  }

  let messages
  try {
    messages = await getCampaignMessages(campaign.id)
  } catch (err) {
    console.error(`Scheduler: Failed to get messages for campaign ${campaign.id}:`, err)
    return
  }

  const tenant = campaign.tenants

  for (const msg of messages) {
    // Only send if today is the trigger day
    if (msg.trigger_day !== cycleDay) continue

    // Check if already sent this cycle
    if (msg.sent_at) {
      console.log(`Scheduler: Message ${msg.id} (M${msg.message_number}) already sent, skipping`)
      continue
    }

    console.log(`Scheduler: Sending M${msg.message_number} for campaign ${campaign.id}`)
    await sendCampaignMessage(campaign, msg, tenant)
  }
}

async function sendCampaignMessage(campaign, message, tenant) {
  let invoices
  try {
    const filters = { campaign_id: campaign.id }
    if (message.send_to === 'unpaid') {
      filters.status = 'pending'
    }
    invoices = await getInvoices(filters)
  } catch (err) {
    console.error(`Scheduler: Failed to get invoices for campaign ${campaign.id}:`, err)
    return
  }

  let sentCount = 0
  let failedCount = 0

  for (const invoice of invoices) {
    try {
      const contact = invoice.contacts
      if (!contact || !contact.telefono) {
        console.warn(`Scheduler: Invoice ${invoice.id} has no contact phone, skipping`)
        continue
      }

      // Determine template: aviso_vencido if due_date already passed, recordatorio otherwise
      const orgName = tenant?.display_name || tenant?.name || ''
      const link    = invoice.liga_pago || tenant?.payment_link_general || ''

      let tpl, components
      const isOverdue = campaign.due_date && new Date(campaign.due_date) < new Date()
      const diasVencido = isOverdue ? getDaysSince(campaign.due_date) : 0

      if (isOverdue && diasVencido > 0) {
        tpl        = TEMPLATE_NAMES.AVISO_VENCIDO
        components = avisoVencidoComponents({
          nombre: contact.nombre,
          orgName,
          monto:       invoice.monto,
          concepto:    campaign.concept || 'pago mensual',
          diasVencido
        })
      } else {
        tpl        = TEMPLATE_NAMES.RECORDATORIO_PAGO
        components = recordatorioPagoComponents({
          nombre:   contact.nombre,
          orgName,
          concepto: campaign.concept || 'pago mensual',
          monto:    invoice.monto,
          link
        })
      }

      // Send via approved Meta template (each template carries its own lang)
      const result = await sendWhatsAppTemplate(contact.telefono, tpl.name, tpl.lang, components)

      // Log the message
      const logData = {
        tenant_id: campaign.tenant_id,
        campaign_id: campaign.id,
        contact_id: invoice.contact_id,
        invoice_id: invoice.id,
        campaign_message_id: message.id,
        message_number: message.message_number,
        message_text: `[template:${tpl.name}]`,
        phone: contact.telefono,
        wa_message_id: result.wa_message_id || null,
        status: result.success ? 'sent' : 'failed',
        error_message: result.error || null,
        sent_at: new Date().toISOString()
      }

      try {
        await logMessage(logData)
      } catch (logErr) {
        console.error('Scheduler: Failed to log message:', logErr)
      }

      if (result.success) {
        sentCount++
      } else {
        failedCount++
        console.error(`Scheduler: Failed to send to ${contact.telefono}:`, result.error)
      }

      // Small delay to avoid API rate limits
      await new Promise(resolve => setTimeout(resolve, 150))
    } catch (err) {
      console.error(`Scheduler: Error sending to invoice ${invoice.id}:`, err)
      failedCount++
    }
  }

  // Mark campaign message as sent
  try {
    await updateCampaignMessage(message.id, {
      sent_at: new Date().toISOString(),
      sent_count: sentCount,
      failed_count: failedCount
    })
  } catch (err) {
    console.error(`Scheduler: Failed to update campaign message ${message.id}:`, err)
  }

  // Update campaign stats
  try {
    await updateCampaignStats(campaign.id)
  } catch (err) {
    console.error(`Scheduler: Failed to update campaign stats:`, err)
  }

  // Send operational notification
  try {
    await sendOperationalNotification(campaign.tenant_id, 'message_sent', {
      campaign_name: campaign.name,
      message_label: `Mensaje ${message.message_number}`,
      sent: sentCount,
      failed: failedCount,
      send_to: message.send_to
    })
  } catch (notifErr) {
    console.error('Scheduler: Failed to send operational notification:', notifErr)
  }

  console.log(`Scheduler: M${message.message_number} campaign ${campaign.id} — sent: ${sentCount}, failed: ${failedCount}`)
}

export async function runOperationalReminders() {
  const today = new Date()
  const dayOfMonth = today.getDate()

  // Only run on days 25 and 28
  if (dayOfMonth !== 25 && dayOfMonth !== 28) return

  console.log(`Scheduler: Running operational reminders on day ${dayOfMonth}`)

  let tenants
  try {
    tenants = await getActiveTenants()
  } catch (err) {
    console.error('Scheduler: Failed to get active tenants:', err)
    return
  }

  for (const tenant of tenants) {
    try {
      // Check subscription
      if (tenant.plan !== 'enterprise' && tenant.subscription_amount > 0) {
        const nextMonthFirst = new Date(today.getFullYear(), today.getMonth() + 1, 1)
        const dueDateStr = nextMonthFirst.toISOString().split('T')[0]

        await sendOperationalNotification(tenant.id, 'subscription_due', {
          amount: tenant.subscription_amount,
          due_date: dueDateStr,
          payment_link: tenant.payment_link_general || 'https://kollybry.com/pago'
        })
      }

      // Check trial ending
      if (tenant.status === 'trial' && tenant.trial_ends_at) {
        const trialEnd = new Date(tenant.trial_ends_at)
        const diffMs = trialEnd - today
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

        if (daysRemaining > 0 && daysRemaining <= 7) {
          await sendOperationalNotification(tenant.id, 'trial_ending', {
            days_remaining: daysRemaining,
            end_date: trialEnd.toISOString().split('T')[0],
            plan_price: 2500,
            contact_link: 'hola@kollybry.com'
          })
        }
      }
    } catch (err) {
      console.error(`Scheduler: Reminder error for tenant ${tenant.id}:`, err)
    }
  }
}
