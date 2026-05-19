import axios from 'axios'

const GRAPH_URL = 'https://graph.facebook.com/v18.0'

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
        to: phone,
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
      to: phone,
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
