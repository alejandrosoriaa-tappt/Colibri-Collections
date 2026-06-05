import axios from 'axios'

const CONEKTA_API = 'https://api.conekta.io'

/**
 * Create SPEI order in Conekta
 * Returns: { success, orderId, clabe, expiresAt, error }
 */
export async function createSPEIOrder(data) {
  const apiKey = process.env.CONEKTA_API_KEY

  if (!apiKey) {
    console.error('Conekta: CONEKTA_API_KEY not configured')
    return { success: false, error: 'Conekta API key not configured' }
  }

  try {
    // Basic auth: key:
    const auth = Buffer.from(apiKey + ':').toString('base64')

    const payload = {
      currency: 'MXN',
      customer_info: {
        name: data.customerName,
        email: data.customerEmail,
        phone: data.customerPhone
      },
      line_items: [
        {
          name: data.concept || 'Pago',
          unit_price: Math.round(data.amount * 100), // Convert to centavos
          quantity: 1
        }
      ],
      charges: [
        {
          payment_method: {
            type: 'spei',
            expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days default
          }
        }
      ]
    }

    const response = await axios.post(`${CONEKTA_API}/orders`, payload, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.conekta-v2.2.0+json'
      },
      timeout: 10000
    })

    const order = response.data
    const clabe = order.charges.data[0].payment_method.receiving_account_number
    const expiresAt = order.charges.data[0].payment_method.expires_at

    console.log(`Conekta: ✓ SPEI order created ${order.id} for ${data.customerName}`)

    return {
      success: true,
      orderId: order.id,
      clabe,
      expiresAt,
      status: order.payment_status
    }
  } catch (err) {
    const errData = err.response?.data || {}
    console.error('Conekta: SPEI order creation failed', JSON.stringify(errData), err.message)
    return {
      success: false,
      error: errData?.message || err.message,
      errorCode: errData?.error?.code
    }
  }
}
