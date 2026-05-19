import { getTenant } from './supabase.js'
import { sendWhatsAppMessage } from './whatsapp.js'
import { SYSTEM_MESSAGES } from '../templates/systemMessages.js'
import supabase from './supabase.js'

export async function sendOperationalNotification(tenantId, type, vars = {}) {
  try {
    // 1. Get tenant info
    const tenant = await getTenant(tenantId)
    if (!tenant) {
      console.error(`Notifier: tenant ${tenantId} not found`)
      return { success: false, error: 'Tenant not found' }
    }

    const adminPhone = tenant.admin_phone
    if (!adminPhone) {
      console.warn(`Notifier: tenant ${tenantId} has no admin_phone`)
      return { success: false, error: 'No admin phone configured' }
    }

    // 2. Build message
    const messageBuilder = SYSTEM_MESSAGES[type]
    if (!messageBuilder) {
      console.error(`Notifier: unknown message type "${type}"`)
      return { success: false, error: `Unknown notification type: ${type}` }
    }

    const enrichedVars = {
      nombre_escuela: tenant.display_name || tenant.name,
      ...vars
    }

    const messageText = messageBuilder(enrichedVars)

    // 3. Send via WhatsApp
    const sendResult = await sendWhatsAppMessage(adminPhone, messageText)

    // 4. Insert into tenant_notifications
    const { error: insertError } = await supabase
      .from('tenant_notifications')
      .insert({
        tenant_id: tenantId,
        type,
        message: messageText,
        wa_message_id: sendResult.wa_message_id || null,
        delivered: sendResult.success,
        vars: enrichedVars,
        created_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Notifier: failed to insert notification record:', insertError)
    }

    return { success: sendResult.success, wa_message_id: sendResult.wa_message_id }
  } catch (err) {
    console.error(`Notifier error for tenant ${tenantId}, type ${type}:`, err)
    return { success: false, error: err.message }
  }
}
