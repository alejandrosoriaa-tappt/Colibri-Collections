/**
 * Google Sheets integration service
 *
 * Converts a public Google Sheets URL → CSV export URL, fetches the data,
 * and either previews it or imports it through the existing fileProcessor pipeline.
 *
 * Requirements on the Sheet:
 *   - Must be shared as "Anyone with the link can view" (the default shareable link)
 *   - Must follow the same column format as the Kollybry Excel templates
 */

import { parse as csvParse } from 'csv-parse/sync'
import { processFile } from './fileProcessor.js'

/**
 * Extracts the CSV export URL from any Google Sheets URL format.
 * Supports: /edit, /view, /pub, plain spreadsheet URLs, etc.
 */
export function getSheetCsvUrl(sheetUrl) {
  if (!sheetUrl || typeof sheetUrl !== 'string') {
    throw new Error('URL requerida')
  }

  const trimmed = sheetUrl.trim()

  // Extract spreadsheet ID
  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!idMatch) {
    throw new Error(
      'URL inválida. Asegúrate de copiar el enlace directamente desde Google Sheets ' +
      '(debe contener "/spreadsheets/d/").'
    )
  }
  const sheetId = idMatch[1]

  // Extract gid (sheet tab) if specified
  const gidMatch = trimmed.match(/[#&?]gid=(\d+)/)
  const gid = gidMatch ? gidMatch[1] : '0'

  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
}

/**
 * Fetches a Google Sheet as a CSV buffer.
 * Throws descriptive errors for common failure modes.
 */
async function fetchSheetBuffer(sheetUrl) {
  const csvUrl = getSheetCsvUrl(sheetUrl)

  let response
  try {
    response = await fetch(csvUrl, {
      headers: {
        'User-Agent': 'Kollybry/1.0 (contact: hola@kollybry.com)',
        'Accept': 'text/csv,text/plain,*/*'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000)
    })
  } catch (fetchErr) {
    if (fetchErr.name === 'TimeoutError') {
      throw new Error('La hoja tardó demasiado en responder. Intenta de nuevo.')
    }
    throw new Error('No se pudo conectar a Google Sheets. Verifica tu conexión.')
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      'Sin acceso a la hoja. Ve a Google Sheets → Compartir → ' +
      '"Cualquier persona con el enlace" → "Lector", y vuelve a intentar.'
    )
  }

  if (response.status === 404) {
    throw new Error('Hoja no encontrada. Verifica que el enlace sea correcto.')
  }

  if (!response.ok) {
    throw new Error(`Google Sheets respondió con error ${response.status}. Intenta de nuevo.`)
  }

  const contentType = response.headers.get('content-type') || ''
  // Google redirects to login page (HTML) if the sheet is private
  if (contentType.includes('text/html')) {
    throw new Error(
      'La hoja no es pública. Ve a Google Sheets → Compartir → ' +
      '"Cualquier persona con el enlace" → "Lector", y vuelve a intentar.'
    )
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Returns a preview of the sheet without writing anything to the database.
 * Used to show the user what Kollybry detected before they confirm the import.
 *
 * @param {string} sheetUrl - The Google Sheets URL
 * @returns {Promise<{
 *   total: number,
 *   columns: string[],
 *   sample: object[],
 *   groups: Array<{name: string, count: number}>,
 *   warnings: string[]
 * }>}
 */
export async function previewSheet(sheetUrl) {
  const buffer = await fetchSheetBuffer(sheetUrl)
  const content = buffer.toString('utf-8')

  let records
  try {
    records = csvParse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    })
  } catch (parseErr) {
    throw new Error('No se pudo leer la hoja. Verifica que tenga el formato correcto (primera fila = encabezados).')
  }

  if (!records || records.length === 0) {
    throw new Error('La hoja está vacía. Agrega tus contactos y vuelve a intentar.')
  }

  const headers = Object.keys(records[0])
  const warnings = []

  // Check for required columns
  const lowerHeaders = headers.map(h => h.toLowerCase().trim())
  const hasName   = lowerHeaders.some(h => ['nombre', 'nombre familia', 'nombre_familia', 'alumno', 'name'].includes(h))
  const hasPhone  = lowerHeaders.some(h => ['teléfono', 'telefono', 'celular', 'phone', 'tel', 'whatsapp'].includes(h))

  if (!hasName)  warnings.push('No se detectó columna de nombre (se esperaba: NOMBRE FAMILIA, NOMBRE, etc.)')
  if (!hasPhone) warnings.push('No se detectó columna de teléfono (se esperaba: TELÉFONO, CELULAR, etc.)')

  // Detect group column and count by group
  const groupColNames = ['grupo', 'sección', 'seccion', 'grado', 'salon', 'salón', 'categoría', 'categoria', 'membresía', 'membresia']
  const groupCol = headers.find(h => groupColNames.some(g => h.toLowerCase().trim() === g))

  const groupCounts = {}
  if (groupCol) {
    for (const row of records) {
      const g = String(row[groupCol] || '').trim() || 'Sin grupo'
      groupCounts[g] = (groupCounts[g] || 0) + 1
    }
  }

  return {
    total: records.length,
    columns: headers,
    sample: records.slice(0, 5),
    groups: Object.entries(groupCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count })),
    warnings
  }
}

/**
 * Imports contacts from a Google Sheet into a campaign.
 * Reuses the existing fileProcessor pipeline (column detection, phone normalization, upserts).
 *
 * @param {string} sheetUrl
 * @param {string} campaignId
 * @param {string} tenantId
 * @returns {Promise<{total, valid, errors, errorDetails}>}
 */
export async function importSheet(sheetUrl, campaignId, tenantId) {
  const buffer = await fetchSheetBuffer(sheetUrl)

  return await processFile({
    fileBuffer: buffer,
    fileType:   'csv',
    campaignId,
    tenantId,
    fileUploadId: null
  })
}
