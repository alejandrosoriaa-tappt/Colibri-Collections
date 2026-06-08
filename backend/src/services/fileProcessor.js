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
import { normalizePhone } from '../utils/phone.js'

// Column alias mappings (all lowercase)
const COLUMN_ALIASES = {
  nombre:          ['nombre condómino', 'nombre condomino', 'nombre familia', 'nombre_familia', 'alumno', 'nombre', 'name', 'first_name', 'primer_nombre'],
  apellido:        ['familia', 'apellido', 'apellidos', 'last_name', 'surname'],
  telefono:        ['teléfono', 'telefono', 'phone', 'celular', 'tel', 'movil', 'whatsapp'],
  grupo:           ['grupo', 'group', 'membresía', 'membresia', 'categoría', 'categoria'],
  mensaje:         ['mensaje o recordatorio', 'mensaje', 'recordatorio', 'message', 'nota', 'descripcion', 'observaciones', 'comentario'],
  liga_pago:       ['liga_pago', 'payment_link', 'url_pago', 'liga', 'link_pago', 'url'],
  // Opcionales
  id_externo:      ['matricula', 'número socio', 'numero socio', 'número contrato', 'numero contrato', 'id_externo', 'external_id', 'contrato', 'cliente', 'id', 'clave', 'expediente', 'numero_contrato', 'num. membresía', 'num membresía', 'núm. membresía', 'num_membresia', 'numero membresia', 'número membresía', 'membresia num', 'no. membresía'],
  monto:           ['monto', 'saldo', 'amount', 'importe', 'cuota', 'costo', 'precio', 'deuda', 'adeudo'],
  email:           ['correo', 'email', 'mail', 'correo_electronico', 'correo electrónico'],
  // Colegio / Academia
  nombre_alumno:   ['nombre alumno', 'nombre_alumno', 'alumno nombre', 'nombre del alumno', 'estudiante'],
  seccion:         ['sección', 'seccion', 'section', 'nivel escolar', 'nivel'],
  grado:           ['grado', 'grade', 'año escolar', 'ano escolar'],
  salon:           ['salón', 'salon', 'aula', 'grupo aula'],
  // Condominio
  fraccionamiento: ['fraccionamiento', 'privada', 'coto', 'condominio nombre', 'residencial'],
  torre:           ['torre', 'edificio', 'bloque', 'block'],
  num_interior:    ['número interior', 'numero interior', 'num_interior', 'interior', 'unidad', 'departamento', 'depto', 'no. interior'],
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

    const orgType = tenant.org_type || 'general'

    // Process each row
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i]
      const rowNum = i + 2 // 1-indexed + header row
      const rowErrors = []

      const get = (col) => colMap[col] ? (row[colMap[col]] || '').toString().trim() : ''

      const rawNombre   = get('nombre')
      const rawTelefono = get('telefono')

      // Validate nombre
      if (!rawNombre) {
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

      // Org-specific fields
      const seccion         = get('seccion')
      const grado           = get('grado')
      const salon           = get('salon')
      const fraccionamiento = get('fraccionamiento')
      const torre           = get('torre')
      const num_interior    = get('num_interior')
      const rawGrupo        = get('grupo')

      // Auto-build grupo from org-specific fields
      let grupo = rawGrupo
      if ((orgType === 'colegio' || orgType === 'academia') && (seccion || grado || salon)) {
        grupo = [seccion, grado, salon].filter(Boolean).join(' ')
      } else if (orgType === 'condominio' && (fraccionamiento || torre || num_interior)) {
        grupo = [fraccionamiento, torre, num_interior].filter(Boolean).join(' · ')
      }

      // monto es opcional; si no viene en el archivo se usa 0
      const monto = normalizeMonto(get('monto')) ?? 0

      // Usar liga de pago del tenant si no se proporcionó en el archivo
      const ligaPago = get('liga_pago') || tenant.payment_link_general || ''

      validRows.push({
        nombre:          rawNombre,
        apellido:        get('apellido'),
        telefono,
        monto,
        grupo:           grupo || null,
        id_externo:      get('id_externo'),
        mensaje:         get('mensaje'),
        liga_pago:       ligaPago,
        email:           get('email') || null,
        nombre_alumno:   get('nombre_alumno') || null,
        seccion:         seccion || null,
        grado:           grado || null,
        salon:           salon || null,
        fraccionamiento: fraccionamiento || null,
        torre:           torre || null,
        num_interior:    num_interior || null,
      })
    }

    // Upsert valid rows into DB
    let insertedCount = 0
    for (const rowData of validRows) {
      try {
        const contactData = {
          nombre:          rowData.nombre,
          apellido:        rowData.apellido || null,
          telefono:        rowData.telefono,
          grupo:           rowData.grupo,
          id_externo:      rowData.id_externo || null,
          email:           rowData.email,
          nombre_alumno:   rowData.nombre_alumno || null,
          seccion:         rowData.seccion,
          grado:           rowData.grado,
          salon:           rowData.salon,
          fraccionamiento: rowData.fraccionamiento,
          torre:           rowData.torre,
          num_interior:    rowData.num_interior,
          status:          'active'
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

// ── Template definitions per org type ────────────────────────────────────────
const TEMPLATES = {
  colegio: {
    filename: 'plantilla_colegio.xlsx',
    sheetName: 'Colegio',
    headers: ['NOMBRE FAMILIA', 'NOMBRE ALUMNO', 'TIPO RELACIÓN', 'NOMBRE PAPÁ/MAMÁ', 'TELÉFONO', 'SECCIÓN', 'GRADO', 'SALÓN', 'CORREO', 'PRIORIDAD', 'Liga_Pago', 'Matrícula'],
    rows: [
      ['García López',     'Carlos García',     'student', 'Carlos García',  '5512345678', 'Primaria',   '3ro', 'B', 'garcia@gmail.com',    '0', 'https://pago.ejemplo.com/001', 'MAT001'],
      ['García López',     'Carlos García',     'mama',    'Rosa López',     '5512345679', 'Primaria',   '3ro', 'B', 'rosa@gmail.com',      '1', 'https://pago.ejemplo.com/001', 'MAT001'],
      ['García López',     'Carlos García',     'papa',    'Juan García',    '5512345680', 'Primaria',   '3ro', 'B', 'juan@gmail.com',      '0', 'https://pago.ejemplo.com/001', 'MAT001'],
      ['Hernández Soto',   'Sofía Hernández',   'student', 'Sofía Hernández','5587654321', 'Preescolar', '2do', 'A', '',                    '0', 'https://pago.ejemplo.com/002', 'MAT002'],
      ['Hernández Soto',   'Sofía Hernández',   'mama',    'Laura Soto',     '5587654322', 'Preescolar', '2do', 'A', 'laura@gmail.com',     '1', 'https://pago.ejemplo.com/002', 'MAT002'],
    ],
    widths: [16, 18, 14, 18, 14, 12, 8, 8, 24, 10, 28, 12],
  },
  academia: {
    filename: 'plantilla_academia.xlsx',
    sheetName: 'Academia',
    headers: ['NOMBRE FAMILIA', 'NOMBRE ALUMNO', 'TELÉFONO', 'SECCIÓN', 'GRADO', 'SALÓN', 'CORREO', 'MENSAJE O RECORDATORIO', 'Liga_Pago', 'Matrícula'],
    rows: [
      ['García López',     'Carlos García',     '5512345678', 'Primaria',   '3ro', 'B', 'garcia@gmail.com',    'Tu colegiatura de junio está pendiente.',   'https://pago.ejemplo.com/001', 'MAT001'],
      ['Hernández Soto',   'Sofía Hernández',   '5587654321', 'Preescolar', '2do', 'A', '',                    'Tu colegiatura de junio está pendiente.',   'https://pago.ejemplo.com/002', 'MAT002'],
    ],
    widths: [22, 20, 14, 16, 8, 8, 28, 52, 36, 12],
  },
  condominio: {
    filename: 'plantilla_condominio.xlsx',
    sheetName: 'Condominio',
    headers: ['NOMBRE CONDÓMINO', 'TELÉFONO', 'FRACCIONAMIENTO', 'TORRE', 'NÚMERO INTERIOR', 'CORREO', 'MENSAJE O RECORDATORIO', 'Liga_Pago'],
    rows: [
      ['Juan Pérez García',   '5512345678', 'Coto Las Palmas',  'Torre A', '203', 'jperez@gmail.com',    'Tu cuota de mantenimiento de junio está pendiente.', 'https://pago.ejemplo.com/001'],
      ['María López Ruiz',    '5587654321', 'Coto Las Palmas',  'Torre B', '105', '',                    'Tu cuota de mantenimiento de junio está pendiente.', 'https://pago.ejemplo.com/002'],
      ['Carlos Martínez Vega','5511223344', 'Residencial Norte', '',        '12',  'cmv@outlook.com',    'Tu cuota de mantenimiento de junio está pendiente.', ''],
    ],
    widths: [25, 14, 22, 12, 16, 28, 52, 36],
  },
  // club covers: gym, golf, tennis, sports clubs — same structure
  club: {
    filename: 'plantilla_club.xlsx',
    sheetName: 'Club',
    headers: ['NOMBRE', 'APELLIDO', 'TELÉFONO', 'CATEGORÍA', 'SALDO', 'CORREO', 'MENSAJE O RECORDATORIO', 'Liga_Pago', 'Num. Membresía'],
    rows: [
      ['Luis',      'Ramírez Torres',  '5512345678', 'Socio Activo',   1200, 'lramirez@gmail.com', 'Tu cuota mensual está pendiente. Puedes pagarla en el siguiente enlace.', 'https://pago.ejemplo.com/001', 'SOC001'],
      ['Patricia',  'Sánchez Vega',    '5587654321', 'Socio Familiar', 2400, '',                   'Tu cuota mensual está pendiente. Puedes pagarla en el siguiente enlace.', 'https://pago.ejemplo.com/002', 'SOC002'],
      ['Roberto',   'Cruz Medina',     '5511223344', 'Socio Junior',    800, 'roberto@yahoo.com',  'Tu cuota mensual está pendiente. Puedes pagarla en el siguiente enlace.', '',                            'SOC003'],
    ],
    widths: [16, 20, 14, 18, 10, 28, 52, 36, 14],
  },
  // gimnasio is an alias for club (same template)
  gimnasio: {
    filename: 'plantilla_gimnasio.xlsx',
    sheetName: 'Gimnasio',
    headers: ['NOMBRE', 'APELLIDO', 'TELÉFONO', 'CATEGORÍA', 'SALDO', 'CORREO', 'MENSAJE O RECORDATORIO', 'Liga_Pago', 'Num. Membresía'],
    rows: [
      ['María',   'González López',    '5512345678', 'Membresía Oro',   1500, 'mgonzalez@gmail.com', 'Tu mensualidad de junio está pendiente. Puedes pagarla en el siguiente enlace.', 'https://pago.ejemplo.com/001', 'GYM001'],
      ['Carlos',  'Martínez Ruiz',     '5587654321', 'Clase Spinning',   800, '',                    'Tu mensualidad de junio está pendiente. Puedes pagarla en el siguiente enlace.', 'https://pago.ejemplo.com/002', 'GYM002'],
      ['Ana',     'López Hernández',   '5511223344', 'Membresía Plata', 1200, 'ana@hotmail.com',     'Tu mensualidad de junio está pendiente. Puedes pagarla en el siguiente enlace.', '',                            'GYM003'],
    ],
    widths: [16, 20, 14, 18, 10, 28, 52, 36, 14],
  },
  general: {
    filename: 'plantilla_general.xlsx',
    sheetName: 'Contactos',
    headers: ['NOMBRE', 'APELLIDO', 'TELÉFONO', 'GRUPO', 'CORREO', 'MENSAJE O RECORDATORIO', 'Liga_Pago', 'ID Externo'],
    rows: [
      ['María',   'González López',  '5512345678', 'Grupo A', 'mgonzalez@gmail.com', 'Tu pago de junio está pendiente.', 'https://pago.ejemplo.com/001', 'EXT001'],
      ['Carlos',  'Martínez Ruiz',   '5587654321', 'Grupo B', '',                    'Tu pago de junio está pendiente.', 'https://pago.ejemplo.com/002', 'EXT002'],
      ['Ana',     'López Hernández', '5511223344', 'Grupo A', 'ana@hotmail.com',     'Tu pago de junio está pendiente.', '',                            'EXT003'],
    ],
    widths: [16, 20, 14, 14, 28, 52, 36, 12],
  },
}

export function generateLayoutBuffer(orgType = 'general') {
  const tpl = TEMPLATES[orgType] || TEMPLATES.general

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([tpl.headers, ...tpl.rows])
  ws['!cols'] = tpl.widths.map(wch => ({ wch }))

  XLSX.utils.book_append_sheet(wb, ws, tpl.sheetName)

  return {
    buffer: XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }),
    filename: tpl.filename
  }
}
