import axios from 'axios'

const GRAPH_URL = 'https://graph.facebook.com/v20.0'

/**
 * Normalizes a Mexican phone number to E.164 format for WhatsApp API.
 * Handles common input formats:
 *   5512345678        → +5215512345678  (10 digits, local)
 *   525512345678      → +5215512345678  (12 digits, missing the mobile 1)
 *   5215512345678     → +5215512345678  (13 digits, missing +)
 *   +5215512345678    → +5215512345678  (already correct)
 *   +525512345678     → +5215512345678  (international without mobile 1)
 */
export function normalizePhone(phone) {
  if (!phone) return phone
  // Strip everything except digits and leading +
  const digits = String(phone).replace(/[^\d]/g, '')

  if (digits.length === 10) {
    // Local Mexican number: 55XXXXXXXX → +521 55XXXXXXXX
    return `+521${digits}`
  }
  if (digits.length === 12 && digits.startsWith('52')) {
    // Missing mobile 1: 52XXXXXXXXXX → +521XXXXXXXXXX
    return `+521${digits.slice(2)}`
  }
  if (digits.length === 13 && digits.startsWith('521')) {
    // Correct but missing +
    return `+${digits}`
  }
  // Already correct (+521XXXXXXXXXX) or unknown format — return as-is with +
  return phone.startsWith('+') ? phone : `+${digits}`
}

export async function sendWhatsAppMessage(phone, text) {
  const phoneNumberId = process.env.WABA_PHONE_NUMBER_ID
  const accessToken = process.env.WABA_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    console.error('WhatsApp: Missing WABA_PHONE_NUMBER_ID or WABA_ACCESS_TOKEN')
    return { success: false, error: 'WhatsApp credentials not configured' }
  }

  try {
    const response = await axios.post(
      `${GRAPH_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizePhone(phone),
        type: 'text',
        text: {
          preview_url: true,
          body: text
        }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    )

    const waMessageId = response.data?.messages?.[0]?.id || null
    return { success: true, wa_message_id: waMessageId }
  } catch (err) {
    const errData = err.response?.data || {}
    console.error('WhatsApp send error:', JSON.stringify(errData), err.message)
    return {
      success: false,
      error: errData?.error?.message || err.message,
      error_code: errData?.error?.code
    }
  }
}

export async function sendWhatsAppTemplate(phone, templateName, languageCode, components) {
  const phoneNumberId = process.env.WABA_PHONE_NUMBER_ID
  const accessToken = process.env.WABA_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    console.error('WhatsApp: Missing credentials')
    return { success: false, error: 'WhatsApp credentials not configured' }
  }

  try {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizePhone(phone),
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode || 'es_MX' },
        components: components || []
      }
    }

    const response = await axios.post(
      `${GRAPH_URL}/${phoneNumberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    )

    const waMessageId = response.data?.messages?.[0]?.id || null
    return { success: true, wa_message_id: waMessageId }
  } catch (err) {
    const errData = err.response?.data || {}
    console.error('WhatsApp template send error:', JSON.stringify(errData), err.message)
    return {
      success: false,
      error: errData?.error?.message || err.message,
      error_code: errData?.error?.code
    }
  }
}
