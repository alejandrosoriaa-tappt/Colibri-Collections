import { formatCurrency, formatDate } from './messages.js'

// ================================================================
// REGISTERED META TEMPLATE NAMES
// Must match exactly the names approved in Meta WhatsApp Manager (cuenta Kollybry).
// ================================================================
// Each entry: { name, lang }
// lang must match EXACTLY how the template was registered in Meta WhatsApp Manager.
// Old templates (created before June 2026) → Spanish = 'es'
// New templates (created June 2026+)       → Spanish (MEX) = 'es_MX'
export const TEMPLATE_NAMES = {
  // Onboarding (es_MX — new)
  BIENVENIDA_TENANT:    { name: 'kollybry_bienvenida_credenciales', lang: 'es_MX' },
  // Community (es_MX — new)
  BIENVENIDA_COMUNIDAD: { name: 'kollybry_bienvenida_comunidad',    lang: 'es_MX' },
  // Payments — link-based (es — old)
  RECORDATORIO_PAGO:    { name: 'kollybry_recordatorio_pago',       lang: 'es'    },
  AVISO_VENCIDO:        { name: 'kollybry_aviso_vencido',           lang: 'es'    },
  CONFIRMACION_PAGO:    { name: 'kollybry_confirmacion_pago',       lang: 'es'    },
  // Payments — SPEI (es_MX — new)
  RECORDATORIO_SPEI:    { name: 'kollybry_recordatorio_spei',       lang: 'es_MX' },
  // Announcements (es — old)
  COMUNICADO:           { name: 'kollybry_comunicado',              lang: 'es'    },
  COMUNICADO_IMAGEN:    { name: 'kollybry_comunicado_imagen',       lang: 'es'    },
}

// ================================================================
// HELPERS
// ================================================================
function textParam(value) {
  return { type: 'text', text: String(value ?? '') }
}

function bodyOnly(...values) {
  return [{ type: 'body', parameters: values.map(textParam) }]
}

function toMonto(monto) {
  const n = Number(monto)
  return isNaN(n) ? String(monto ?? '') : formatCurrency(n)
}

function toFecha(dateStr) {
  if (!dateStr) {
    return new Date().toLocaleDateString('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric'
    })
  }
  return formatDate(dateStr)
}

// ================================================================
// TEMPLATE COMPONENT BUILDERS
// Each returns the `components` array for sendWhatsAppTemplate()
// ================================================================

/**
 * kollybry_bienvenida_credenciales  (BIENVENIDA_TENANT)
 * Sent to the tenant admin on onboarding.
 * "En {{2}} te damos la bienvenida a este nuevo servicio proporcionado por Kollybry."
 * {{1}} nombre  {{2}} orgName
 */
export function bienvenidaTenantComponents({ nombre, orgName }) {
  return bodyOnly(nombre, orgName)
}

/**
 * kollybry_bienvenida_comunidad  (BIENVENIDA_COMUNIDAD)
 * Sent to every contact the first time they are added to a tenant.
 * "{{2}} te da la bienvenida a este nuevo servicio proporcionado por Kollybry."
 * {{1}} nombre  {{2}} orgName
 */
export function bienvenidaComunidadComponents({ nombre, orgName }) {
  return bodyOnly(nombre, orgName)
}

/**
 * kollybry_recordatorio_pago
 * {{1}} nombre  {{2}} orgName  {{3}} concepto  {{4}} monto  {{5}} link
 * Note: body ends with "Para cualquier duda, comunícate con nosotros."
 */
export function recordatorioPagoComponents({ nombre, orgName, concepto, monto, link }) {
  return bodyOnly(
    nombre,
    orgName,
    concepto || 'pago mensual',
    toMonto(monto),
    link || 'Sin enlace de pago disponible'
  )
}

/**
 * kollybry_aviso_vencido
 * {{1}} nombre  {{2}} orgName  {{3}} monto  {{4}} concepto  {{5}} diasVencido
 */
export function avisoVencidoComponents({ nombre, orgName, monto, concepto, diasVencido }) {
  return bodyOnly(
    nombre,
    orgName,
    toMonto(monto),
    concepto || 'pago mensual',
    String(Math.max(0, diasVencido ?? 0))
  )
}

/**
 * kollybry_comunicado
 * {{1}} titulo  {{2}} orgName  {{3}} cuerpo
 */
export function comunicadoComponents({ titulo, orgName, cuerpo }) {
  return bodyOnly(titulo, orgName, cuerpo)
}

/**
 * kollybry_comunicado_imagen
 * HEADER: image (link)
 * {{1}} titulo  {{2}} orgName  {{3}} cuerpo
 */
export function comunicadoImagenComponents({ titulo, orgName, cuerpo, imageUrl }) {
  return [
    {
      type: 'header',
      parameters: [{ type: 'image', image: { link: imageUrl } }]
    },
    {
      type: 'body',
      parameters: [titulo, orgName, cuerpo].map(textParam)
    }
  ]
}

/**
 * kollybry_recordatorio_spei  (RECORDATORIO_SPEI)
 * For tenants with SPEI add-on enabled. Includes the contact's unique CLABE.
 * {{1}} nombre  {{2}} orgName  {{3}} concepto  {{4}} monto  {{5}} clabe
 */
export function recordatorioSPEIComponents({ nombre, orgName, concepto, monto, clabe }) {
  return bodyOnly(
    nombre,
    orgName,
    concepto || 'pago mensual',
    toMonto(monto),
    clabe || 'Sin CLABE asignada'
  )
}

/**
 * kollybry_confirmacion_pago
 * {{1}} nombre  {{2}} orgName  {{3}} concepto  {{4}} monto  {{5}} fecha
 */
export function confirmacionPagoComponents({ nombre, orgName, concepto, monto, fecha }) {
  return bodyOnly(
    nombre,
    orgName,
    concepto || 'pago',
    toMonto(monto),
    toFecha(fecha)
  )
}
