import { formatCurrency, formatDate } from './messages.js'

// ================================================================
// REGISTERED META TEMPLATE NAMES
// Must match exactly the names approved in Meta WhatsApp Manager (cuenta Kollybry).
// ================================================================
// Each entry: { name, lang }
// lang MUST match EXACTLY how the template is registered in Meta WhatsApp Manager.
// Verified against Meta WABA 948092824711194 on 2026-06-09:
//   es_MX → bienvenida_credenciales, bienvenida_comunidad
//   es    → comunicado, comunicado_imagen, confirmacion_pago,
//           recordatorio_pago, aviso_vencido
export const TEMPLATE_NAMES = {
  // Onboarding (es_MX)
  BIENVENIDA_TENANT:    { name: 'kollybry_bienvenida_credenciales', lang: 'es_MX' },
  // Community (es_MX)
  BIENVENIDA_COMUNIDAD: { name: 'kollybry_bienvenida_comunidad',    lang: 'es_MX' },
  // Payments — link-based (es)
  RECORDATORIO_PAGO:    { name: 'kollybry_recordatorio_pago',       lang: 'es'    },
  AVISO_VENCIDO:        { name: 'kollybry_aviso_vencido',           lang: 'es'    },
  CONFIRMACION_PAGO:    { name: 'kollybry_confirmacion_pago',       lang: 'es'    },
  // Payments — SPEI/CLABE add-on (es_MX — not yet registered in Meta)
  RECORDATORIO_SPEI:    { name: 'kollybry_recordatorio_spei',       lang: 'es_MX' },
  // Announcements
  // COMUNICADO_UTIL is the UTILITY-category version (approved 2026-06-10):
  // exempt from Meta's per-user marketing frequency cap, so school notices
  // always deliver. Same 2 body params as the old marketing template.
  COMUNICADO_UTIL:      { name: 'kollybry_comunicado_util',         lang: 'es_MX' },
  COMUNICADO:           { name: 'kollybry_comunicado',              lang: 'es'    },
  COMUNICADO_IMAGEN:    { name: 'kollybry_comunicado_imagen',       lang: 'es'    },
  // Adjuntos reales (PDF y demás). EN ESPERA: la plantilla todavía no existe
  // en Meta. Se activa poniendo KOLLYBRY_DOC_TEMPLATE con su nombre una vez
  // aprobada; mientras esté vacía, el envío sigue pegando el link al cuerpo.
  COMUNICADO_DOC:       {
    name: process.env.KOLLYBRY_DOC_TEMPLATE || 'kollybry_comunicado_doc',
    lang: process.env.KOLLYBRY_DOC_TEMPLATE_LANG || 'es_MX'
  },
}

/** ¿Ya está aprobada la plantilla con encabezado de documento? */
export function docTemplateActiva() {
  return !!process.env.KOLLYBRY_DOC_TEMPLATE
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
 * kollybry_comunicado (text-only)
 * Registered in Meta (lang 'es') with exactly 2 positional params:
 *   {{1}} orgName  {{2}} cuerpo
 * NOTE: there is NO titulo param in the text template — only the image
 * template (comunicadoImagenComponents) carries a titulo.
 */
export function comunicadoComponents({ orgName, cuerpo }) {
  return bodyOnly(orgName, cuerpo)
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
 * kollybry_comunicado_doc  (COMUNICADO_DOC)
 * HEADER: document (link + filename)  ·  {{1}} orgName  {{2}} cuerpo
 *
 * Manda el archivo como ADJUNTO real de WhatsApp, no como link dentro del
 * texto. Meta descarga el archivo desde `docUrl`, así que tiene que ser una
 * URL directa y pública: un enlace de Google Drive NO sirve (devuelve HTML,
 * no el PDF). Por eso el archivo se sube antes a Supabase Storage con
 * POST /api/broadcasts/media, que ya regresa una URL válida.
 */
export function comunicadoDocComponents({ orgName, cuerpo, docUrl, filename }) {
  return [
    {
      type: 'header',
      parameters: [{
        type: 'document',
        document: { link: docUrl, filename: filename || 'Documento.pdf' }
      }]
    },
    { type: 'body', parameters: [orgName, cuerpo].map(textParam) }
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
