import axios from 'axios'
import { normalizePhone } from '../utils/phone.js'

const GRAPH_URL = 'https://graph.facebook.com/v20.0'

/**
 * Desde qué número sale el mensaje.
 *
 * Cada colegio envía desde el SUYO: Meta califica la calidad por número, así
 * que si los papás de un colegio bloquean, no se degrada la entrega del resto.
 *
 * El número de Kollybry (WABA_PHONE_NUMBER_ID) queda para lo que es de la
 * plataforma y no del colegio: onboarding, códigos de acceso, recuperación de
 * contraseña y —cuando existan— los cobros de membresía.
 *
 * Si un colegio todavía no tiene número asignado se cae al compartido, para
 * que un alta a medias no deje al colegio sin poder enviar.
 */
function resolverRemitente(desdeNumero) {
  return desdeNumero || process.env.WABA_PHONE_NUMBER_ID
}

export async function sendWhatsAppMessage(phone, text, desdeNumero) {
  const phoneNumberId = resolverRemitente(desdeNumero)
  const accessToken = process.env.WABA_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    console.error('WhatsApp: falta el número remitente o WABA_ACCESS_TOKEN')
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

export async function sendWhatsAppTemplate(phone, templateName, languageCode, components, desdeNumero) {
  const phoneNumberId = resolverRemitente(desdeNumero)
  const accessToken = process.env.WABA_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    console.error('WhatsApp: falta el número remitente o WABA_ACCESS_TOKEN')
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
