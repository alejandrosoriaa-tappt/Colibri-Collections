import { formatCurrency, formatDate } from './messages.js'

// ================================================================
// REGISTERED META TEMPLATE NAMES
// Must match exactly the names approved in Meta WhatsApp Manager (cuenta Kollybry).
// ================================================================
export const TEMPLATE_NAMES = {
  // Onboarding: welcome message sent to new tenant admin
  BIENVENIDA_TENANT:    'kollybry_bienvenida_credenciales',
  // Community: sent to each contact the first time they're added to a tenant
  BIENVENIDA_COMUNIDAD: 'kollybry_bienvenida_comunidad',
  // Payments
  RECORDATORIO_PAGO:    'kollybry_recordatorio_pago',
  AVISO_VENCIDO:        'kollybry_aviso_vencido',
  CONFIRMACION_PAGO:    'kollybry_confirmacion_pago',
  // Announcements
  COMUNICADO:           'kollybry_comunicado',
  COMUNICADO_IMAGEN:    'kollybry_comunicado_imagen',
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
