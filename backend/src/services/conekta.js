/**
 * conekta.js — Conekta API integration for SPEI recurring CLABE generation.
 *
 * Docs: https://developers.conekta.com/docs/cargo-recurrente-transferencias-direct-api
 *
 * Environment variables required:
 *   CONEKTA_API_KEY        — private key from panel.conekta.com (starts with key_...)
 *   CONEKTA_WEBHOOK_SECRET — secret for verifying webhook signatures (optional but recommended)
 */

import axios from 'axios'

const CONEKTA_BASE = 'https://api.conekta.io'

function getHeaders() {
  const key = process.env.CONEKTA_API_KEY
  if (!key) throw new Error('CONEKTA_API_KEY not configured')
  // Conekta uses Basic Auth: base64(apiKey + ":")
  const encoded = Buffer.from(`${key}:`).toString('base64')
  return {
    Authorization: `Basic ${encoded}`,
    'Content-Type': 'application/json',
    Accept: 'application/vnd.conekta-v2.1.0+json'
  }
}

/**
 * Creates a Conekta customer with a recurring SPEI payment source.
 * Returns { conekta_customer_id, clabe } on success.
 *
 * @param {object} contact - { nombre, apellido, email, telefono }
 * @param {string} tenantName - used as metadata reference
 */
export async function createConektaCustomer({ nombre, apellido, email, telefono, tenantName }) {
  try {
    const name = [nombre, apellido].filter(Boolean).join(' ') || 'Sin nombre'
    const phone = telefono ? String(telefono).replace(/[^\d+]/g, '') : undefined

    const payload = {
      name,
      email: email || `noreply+${Date.now()}@kollybry.com`,
      ...(phone ? { phone } : {}),
      metadata: { tenant: tenantName, source: 'kollybry' },
      payment_sources: [{ type: 'spei_recurrent' }]
    }

    const response = await axios.post(
      `${CONEKTA_BASE}/customers`,
      payload,
      { headers: getHeaders(), timeout: 15000 }
    )

    const customer = response.data
    const speiSource = customer.payment_sources?.data?.find(s => s.type === 'spei_recurrent')

    if (!speiSource?.reference) {
      throw new Error('Conekta did not return a CLABE reference')
    }

    return {
      success: true,
      conekta_customer_id: customer.id,
      clabe: speiSource.reference  // 18-digit CLABE
    }
  } catch (err) {
    const detail = err.response?.data || err.message
    console.error('Conekta createCustomer error:', JSON.stringify(detail))
    return { success: false, error: String(err.message) }
  }
}

/**
 * Fetches a Conekta customer by ID.
 */
export async function getConektaCustomer(conektaCustomerId) {
  try {
    const response = await axios.get(
      `${CONEKTA_BASE}/customers/${conektaCustomerId}`,
      { headers: getHeaders(), timeout: 10000 }
    )
    return { success: true, customer: response.data }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Returns true if CONEKTA_API_KEY is configured and not empty.
 */
export function isConektaConfigured() {
  return Boolean(process.env.CONEKTA_API_KEY)
}
