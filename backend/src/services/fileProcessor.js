import * as XLSX from 'xlsx'
import { parse as csvParse } from 'csv-parse/sync'
import {
  upsertContact,
  upsertInvoice,
  updateCampaignStats,
  updateFileUpload,
  getTenant
} from './supabase.js'
import { sendOperationalNotification } from './notifier.js'

// Column alias mappings (all lowercase)
const COLUMN_ALIASES = {
  nombre:     ['alumno', 'nombre', 'name', 'first_name', 'primer_nombre'],
  apellido:   ['familia', 'apellido', 'apellidos', 'last_name', 'surname'],
  telefono:   ['teléfono', 'telefono', 'phone', 'celular', 'tel', 'movil', 'whatsapp'],
  grupo:      ['seccion o salon', 'seccion_salon', 'seccion', 'salon', 'grupo', 'group', 'grado'],
  mensaje:    ['mensaje o recordatorio', 'mensaje', 'recordatorio', 'message', 'nota', 'descripcion', 'observaciones', 'comentario'],
  liga_pago:  ['liga_pago', 'payment_link', 'url_pago', 'liga', 'link_pago', 'url'],
  // Opcionales
  id_externo: ['matricula', 'id_externo', 'external_id', 'contrato', 'cliente', 'id', 'clave', 'expediente', 'numero_contrato'],
  monto:      ['monto', 'amount', 'importe', 'cuota', 'costo', 'precio']
}

function detectColumns(headers) {
  const lowerHeaders = headers.map(h => (h || '').toLowerCase().trim())
  const mapping = {}

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const idx = lowerHeaders.indexOf(alias.toLowerCase())
      if (idx !== -1) {
        mapping[field] = headers[idx]
        break
      }
    }
  }

  return mapping
}

function normalizePhone(raw) {
  if (!raw) return null

  // Remove all non-digit characters except leading +
  let phone = String(raw).trim()
  phone = phone.replace(/[\s\-\(\)\.]/g, '')

  // Remove leading + for processing
  const hadPlus = phone.startsWith('+')
  if (hadPlus) phone = phone.substring(1)

  // Remove 52 or 521 prefix if present
  if (phone.startsWith('521') && phone.length === 13) {
    // Already has 521 prefix + 10 digits = 13 digits, just add +
    return '+' + phone
  }
  if (phone.startsWith('52') && phone.length === 12) {
    // 52 + 10 digits, convert to +521XXXXXXXXXX
    return '+521' + phone.substring(2)
  }
  if (phone.length === 10) {
    // Plain 10-digit Mexican number
    return '+521' + phone
  }
  if (phone.length === 11 && phone.startsWith('1')) {
    // US number starting with 1, leave as is with country code
    return '+' + phone
  }

  return null
}

function normalizeMonto(raw) {
  if (raw === null || raw === undefined || raw === '') return null
  let val = String(raw).trim()
  // Remove currency symbols and thousand separators
  val = val.replace(/[$,\s]/g, '')
  const num = parseFloat(val)
  if (isNaN(num) || num <= 0) return null
  return num
}

function parseRows(fileBuffer, fileType) {
  if (fileType === 'csv') {
    const content = fileBuffer.toString('utf-8')
    const records = csvParse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    })
    return records
  } else {
    // xlsx or xls
    const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const records = XLSX.utils.sheet_to_json(sheet, {
      raw: false,
      defval: '',
      blankrows: false
    })
    return records
  }
}

export async function processFile({
  fileBuffer,
  fileType,
  campaignId,
  tenantId,
  fileUploadId
}) {
  const errorDetails = []
  const validRows = []

  try {
    // Get tenant for payment_link_general
    const tenant = await getTenant(tenantId)

    // Parse raw rows
    let rawRows
    try {
      rawRows = parseRows(fileBuffer, fileType)
    } catch (parseErr) {
      throw new Error(`Failed to parse file: ${parseErr.message}`)
    }

    if (!rawRows || rawRows.length === 0) {
      throw new Error('File is empty or has no data rows')
    }

    // Detect column mapping
    const headers = Object.keys(rawRows[0])
    const colMap = detectColumns(headers)

    if (!colMap.nombre) {
      throw new Error('No se detectó la columna de nombre. Se esperaba: nombre, name')
    }
    if (!colMap.telefono) {
      throw new Error('No se detectó la columna de teléfono. Se esperaba: telefono, celular, whatsapp')
    }

    // Process each row
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i]
      const rowNum = i + 2 // 1-indexed + header row
      const rowErrors = []

      const rawNombre    = colMap.nombre     ? row[colMap.nombre]     : ''
      const rawTelefono  = colMap.telefono   ? row[colMap.telefono]   : ''
      const rawIdExterno = colMap.id_externo ? row[colMap.id_externo] : ''
      const rawMensaje   = colMap.mensaje    ? row[colMap.mensaje]    : ''
      const rawLigaPago  = colMap.liga_pago  ? row[colMap.liga_pago]  : ''
      // Campos opcionales de compatibilidad
      const rawMonto     = colMap.monto      ? row[colMap.monto]      : ''
      const rawApellido  = colMap.apellido   ? row[colMap.apellido]   : ''
      const rawGrupo     = colMap.grupo      ? row[colMap.grupo]      : ''

      // Validate nombre
      const nombre = (rawNombre || '').toString().trim()
      if (!nombre) {
        rowErrors.push({ row: rowNum, field: 'nombre', error: 'Nombre es requerido' })
      }

      // Validate telefono
      const telefono = normalizePhone(rawTelefono)
      if (!telefono) {
        rowErrors.push({
          row: rowNum,
          field: 'telefono',
          error: `Teléfono inválido: "${rawTelefono}". Debe ser número mexicano de 10 dígitos.`
        })
      }

      if (rowErrors.length > 0) {
        errorDetails.push(...rowErrors)
        continue
      }

      // monto es opcional; si no viene en el archivo se usa 0
      const monto = normalizeMonto(rawMonto) ?? 0

      // Usar liga de pago del tenant si no se proporcionó en el archivo
      const ligaPago = (rawLigaPago || '').toString().trim() || tenant.payment_link_general || ''

      validRows.push({
        nombre,
        apellido:   (rawApellido  || '').toString().trim(),
        telefono,
        monto,
        grupo:      (rawGrupo     || '').toString().trim(),
        id_externo: (rawIdExterno || '').toString().trim(),
        mensaje:    (rawMensaje   || '').toString().trim(),
        liga_pago:  ligaPago
      })
    }

    // Upsert valid rows into DB
    let insertedCount = 0
    for (const rowData of validRows) {
      try {
        const contactData = {
          nombre: rowData.nombre,
          apellido: rowData.apellido,
          telefono: rowData.telefono,
          grupo: rowData.grupo || null,
          id_externo: rowData.id_externo || null
        }

        const contact = await upsertContact(tenantId, contactData)

        await upsertInvoice(campaignId, contact.id, tenantId, {
          monto:     rowData.monto,
          liga_pago: rowData.liga_pago,
          notes:     rowData.mensaje || null,
          status:    'pending'
        })

        insertedCount++
      } catch (upsertErr) {
        console.error(`File processor: error upserting row:`, upsertErr)
        errorDetails.push({
          row: 'DB',
          field: 'general',
          error: `Error al guardar contacto ${rowData.nombre}: ${upsertErr.message}`
        })
      }
    }

    // Update campaign stats
    try {
      await updateCampaignStats(campaignId)
    } catch (statsErr) {
      console.error('File processor: error updating campaign stats:', statsErr)
    }

    const result = {
      total: rawRows.length,
      valid: insertedCount,
      errors: errorDetails.length,
      errorDetails
    }

    // Update file upload record
    if (fileUploadId) {
      await updateFileUpload(fileUploadId, {
        status: 'processed',
        total_rows: result.total,
        valid_rows: result.valid,
        error_rows: result.errors,
        processed_at: new Date().toISOString()
      })
    }

    // Send notification
    const notifType = result.errors > 0 ? 'file_processed_errors' : 'file_processed_ok'
    await sendOperationalNotification(tenantId, notifType, {
      campaign_name: campaignId,
      total: result.total,
      valid: result.valid,
      errors: result.errors
    })

    return result
  } catch (err) {
    console.error('fileProcessor fatal error:', err)

    if (fileUploadId) {
      try {
        await updateFileUpload(fileUploadId, {
          status: 'error',
          error_message: err.message,
          processed_at: new Date().toISOString()
        })
      } catch (updateErr) {
        console.error('Could not update file upload status:', updateErr)
      }
    }

    throw err
  }
}

export function generateLayoutBuffer() {
  const ws_data = [
    ['FAMILIA', 'TELÉFONO', 'ALUMNO', 'SECCION O SALON', 'MENSAJE O RECORDATORIO', 'LIGA_PAGO'],
    ['Garcia Franco', '5512345678', 'Raul Garcia Franco', '1-B', 'Tu colegiatura de junio está pendiente.', 'https://pago.ejemplo.com/001'],
    ['Lopez Ramirez', '5587654321', 'Maria Lopez Ramirez', '6-C', 'Tu colegiatura de junio está pendiente.', 'https://pago.ejemplo.com/002'],
    ['Martinez Trejo', '5511223344', 'Eduardo Martinez Trejo', 'K1-A', 'Tu colegiatura de junio está pendiente.', '']
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(ws_data)

  ws['!cols'] = [
    { wch: 20 }, { wch: 15 }, { wch: 28 }, { wch: 18 }, { wch: 45 }, { wch: 35 }
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Contactos')

  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
}
