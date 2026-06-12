import axios from 'axios'
import pool from './railwayPg.js'

// Conector CRM → Tappt
// Cuando se crea un follow-up en el CRM, se notifica al backend de Tappt
// para que (1) confirme por WhatsApp que el recordatorio quedó agendado y
// (2) envíe el recordatorio por WhatsApp cuando llegue la fecha.
//
// Variables de entorno (servicio CRM NKUVO en Railway):
//   TAPPT_API_URL      — URL base del backend de Tappt (ej. https://api.tappt.lat)
//   TAPPT_API_KEY      — API key compartida entre CRM y Tappt
//   TAPPT_NOTIFY_PHONE — WhatsApp del dueño del CRM (ej. 5215512345678)

const TAPPT_API_URL = process.env.TAPPT_API_URL
const TAPPT_API_KEY = process.env.TAPPT_API_KEY
const TAPPT_NOTIFY_PHONE = process.env.TAPPT_NOTIFY_PHONE

export function tapptEnabled() {
  return Boolean(TAPPT_API_URL && TAPPT_API_KEY && TAPPT_NOTIFY_PHONE)
}

async function callTappt(path, payload) {
  return axios.post(`${TAPPT_API_URL}${path}`, payload, {
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TAPPT_API_KEY}`,
      'X-Source': 'nkuvo-crm'
    }
  })
}

// Fire-and-forget: nunca bloquea ni rompe la respuesta del CRM si Tappt falla.
export function notifyFollowupCreated(followup, client) {
  if (!tapptEnabled()) return

  callTappt('/api/integrations/crm/followups', {
    event: 'followup.created',
    followup_id: followup.id,
    descripcion: followup.descripcion,
    fecha_recordatorio: followup.fecha_recordatorio,
    notify_to: TAPPT_NOTIFY_PHONE,
    cliente: {
      id: client?.id || null,
      razon_social: client?.razon_social || null,
      nombre_contacto: client?.nombre_contacto || null,
      telefono: client?.telefono || null
    }
  })
    .then(() => pool.query('UPDATE crm_followups SET tappt_enviado = true WHERE id = $1', [followup.id]))
    .catch(err => console.error('Tappt notify error (followup.created):', err.response?.data || err.message))
}

export function notifyFollowupCancelled(followupId) {
  if (!tapptEnabled()) return

  callTappt('/api/integrations/crm/followups', {
    event: 'followup.cancelled',
    followup_id: followupId
  }).catch(err => console.error('Tappt notify error (followup.cancelled):', err.response?.data || err.message))
}
