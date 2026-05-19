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
  nombre: ['nombre', 'name', 'first_name', 'primer_nombre'],
  apellido: ['apellido', 'apellidos', 'last_name', 'surname'],
  telefono: ['telefono', 'telefono', 'phone', 'celular', 'tel', 'movil', 'whatsapp'],
  monto: ['monto', 'amount', 'importe', 'cuota', 'costo', 'precio'],
  grupo: ['grupo', 'group', 'grado', 'seccion', 'edificio', 'clase', 'salon'],
  id_externo: ['id_externo', 'external_id', 'id', 'clave', 'matricula', 'expediente'],
  liga_pago: ['liga_pago', 'payment_link', 'url_pago', 'liga', 'link_pago', 'url']
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

    if (!colMap.telefono) {
      throw new Error('Could not detect phone column. Expected: telefono, phone, celular, tel')
    }
    if (!colMap.monto) {
      throw new Error('Could not detect amount column. Expected: monto, amount, importe, cuota')
    }
    if (!colMap.nombre) {
      throw new Error('Could not detect name column. Expected: nombre, name, first_name')
    }

    // Process each row
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i]
      const rowNum = i + 2 // 1-indexed + header row
      const rowErrors = []

      const rawNombre = colMap.nombre ? row[colMap.nombre] : ''
      const rawTelefono = colMap.telefono ? row[colMap.telefono] : ''
      const rawMonto = colMap.monto ? row[colMap.monto] : ''
      const rawApellido = colMap.apellido ? row[colMap.apellido] : ''
      const rawGrupo = colMap.grupo ? row[colMap.grupo] : ''
      const rawIdExterno = colMap.id_externo ? row[colMap.id_externo] : ''
      const rawLigaPago = colMap.liga_pago ? row[colMap.liga_pago] : ''

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

      // Validate monto
      const monto = normalizeMonto(rawMonto)
      if (monto === null) {
        rowErrors.push({
          row: rowNum,
          field: 'monto',
          error: `Monto inválido: "${rawMonto}". Debe ser un número positivo.`
        })
      }

      if (rowErrors.length > 0) {
        errorDetails.push(...rowErrors)
        continue
      }

      // Use tenant general payment link if not provided
      const ligaPago = (rawLigaPago || '').toString().trim() || tenant.payment_link_general || ''

      validRows.push({
        nombre,
        apellido: (rawApellido || '').toString().trim(),
        telefono,
        monto,
        grupo: (rawGrupo || '').toString().trim(),
        id_externo: (rawIdExterno || '').toString().trim(),
        liga_pago: ligaPago
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
          monto: rowData.monto,
          liga_pago: rowData.liga_pago,
          status: 'pending'
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
    ['nombre', 'apellido', 'telefono', 'monto', 'grupo', 'id_externo', 'liga_pago'],
    ['Juan', 'García López', '5512345678', '2500', '3A', 'EXP001', 'https://pago.ejemplo.com/001'],
    ['María', 'Rodríguez', '5587654321', '2500', '3B', 'EXP002', ''],
    ['Carlos', 'Martínez', '5511223344', '3000', '4A', 'EXP003', '']
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(ws_data)

  // Column widths
  ws['!cols'] = [
    { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 10 },
    { wch: 12 }, { wch: 15 }, { wch: 40 }
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Contactos')

  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
}
