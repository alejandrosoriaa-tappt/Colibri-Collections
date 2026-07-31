// ============================================================================
// AI Import — interpreta el archivo de contactos de CUALQUIER tenant en su
// propio formato y lo normaliza a nuestra tabla `contacts`.
//
// Arquitectura (barata y escalable):
//   1. Leemos el Excel/CSV y sacamos un PREVIEW de cada hoja relevante
//      (encabezados + primeras filas) — NO mandamos todas las filas al modelo.
//   2. Una sola llamada a Claude mapea columnas, detecta org_type, y asigna
//      salon/seccion por hoja.
//   3. Aplicamos ese mapeo en código a TODAS las filas (rápido, sin tokens).
// ============================================================================
import Anthropic from '@anthropic-ai/sdk'
import * as XLSX from 'xlsx'
import { normalizePhone } from '../utils/phone.js'

const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-6'

// ── Hojas que nunca son listas de contactos ──────────────────────────────────
const SKIP_SHEET_PATTERNS = [
  /baja/i, /acuerdo/i, /graduad/i, /egresad/i, /firmar/i,
  /pagos?/i, /estado\s*de\s*cuenta/i, /resumen/i, /^hoja\d/i,
  /^ingreso/i  // hojas de nuevos ingresos: layout distinto y se solapan con salones
]
function isContactSheet(name, rowCount) {
  if (rowCount < 4) return false
  return !SKIP_SHEET_PATTERNS.some((re) => re.test(name))
}

// ── Texto limpio ──────────────────────────────────────────────────────────────
function tidy(str) {
  if (str == null) return ''
  return String(str).replace(/\s+/g, ' ').trim()
}
// "GUTIÉRREZ MENDOZA" → "Gutiérrez Mendoza".
// Usa \s como separador (no \b) porque \b trata É/Í/Á como límite de palabra
// y devolvía "GutiÉRrez". Mismo criterio que toTitleCase del dashboard.
function titleCase(str) {
  return tidy(str)
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
}

// ── Marcadores de "no hay dato" ──────────────────────────────────────────────
// Los colegios escriben "NA", "N/A", "-" o "X" cuando no existe ese papá o no
// dieron el teléfono. Sin esto se daba de alta un contacto llamado "Na".
const PLACEHOLDERS = new Set(['na', 'n/a', 'n.a.', 'no', 'no aplica', 'ninguno', 'nd', 's/n', '-', '--', 'x', '.'])
function esPlaceholder(v) {
  return PLACEHOLDERS.has(tidy(v).toLowerCase())
}
function limpioODefault(v) {
  const s = tidy(v)
  return esPlaceholder(s) ? '' : s
}

// ── Teléfonos: soporta varios separados por / , ; ────────────────────────────
function parsePhones(value) {
  if (value == null) return []
  return String(value)
    .split(/[/,;]+/)
    .map((p) => {
      const digits = p.replace(/\D/g, '')
      if (!digits) return null
      if (digits.length === 10) return '+52' + digits
      if (digits.length === 12 && digits.startsWith('52')) return '+' + digits
      if (digits.startsWith('001') && digits.length === 13) return '+1' + digits.slice(3)
      try { return normalizePhone(p) } catch { return null }
    })
    .filter(Boolean)
}

// ── Apellidos compuestos mexicanos: "Álvarez de la Cuadra Romero Pablo" ──────
const PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y'])
function splitSurnameName(full) {
  const toks = tidy(full).split(' ')
  if (toks.length <= 2) return { apellidos: toks[0] || '', nombres: toks.slice(1).join(' ') }
  let i = 0, surnameTokens = [], surnamesTaken = 0
  while (i < toks.length && surnamesTaken < 2) {
    surnameTokens.push(toks[i])
    if (!PARTICLES.has(toks[i].toLowerCase())) surnamesTaken++
    i++
    while (i < toks.length && PARTICLES.has(toks[i].toLowerCase())) {
      surnameTokens.push(toks[i]); i++
    }
  }
  return { apellidos: surnameTokens.join(' '), nombres: toks.slice(i).join(' ') }
}

// ── Lee todas las hojas relevantes con preview ────────────────────────────────
function buildSheetPreviews(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheets = []
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name]
    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
    if (!isContactSheet(name, grid.length)) continue
    const preview = grid.slice(0, 14).map((row) => {
      const obj = {}
      row.forEach((val, c) => {
        const v = tidy(val)
        if (v) obj[XLSX.utils.encode_col(c)] = v.slice(0, 50)
      })
      return obj
    })
    sheets.push({ name, total_rows: grid.length, preview, _grid: grid })
  }
  return sheets
}

// ── Detección del template estándar Kollybry ──────────────────────────────────
// Reconoce dos formatos sin gastar tokens de Claude:
//   "standard" — FAMILIA | MAMÁ | CELULAR MAMÁ | PAPÁ | CELULAR PAPÁ | NOMBRE DEL ALUMNO | GRADO | GRUPO
//   "legacy"   — MAMÁ | CELULAR | PAPÁ | CELULAR | NOMBRE DEL ALUMNO | GRADO | GRUPO  (sin FAMILIA)
// Retorna un objeto mapping listo para applyMapping, o null si no reconoce el formato.
function detectKollybryTemplate(sheets) {
  const STANDARD_HEADERS = ['FAMILIA', 'MAMÁ', 'CELULAR MAMÁ', 'PAPÁ', 'CELULAR PAPÁ', 'NOMBRE DEL ALUMNO', 'GRADO', 'GRUPO']
  const LEGACY_HEADERS   = ['MAMÁ', 'CELULAR', 'PAPÁ', 'CELULAR', 'NOMBRE DEL ALUMNO', 'GRADO', 'GRUPO']

  const normalize = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()

  const formatoDeFila = (vals) => {
    // Standard: 8 columnas con FAMILIA primero
    if (vals.length >= 8 && vals[0] === 'FAMILIA' && vals[1] === normalize(STANDARD_HEADERS[1])) {
      return 'kollybry-standard'
    }
    // Legacy: 7 columnas, empieza con MAMÁ
    if (vals.length >= 7 && vals[0] === 'MAMA' && vals[2] === 'PAPA' && (vals[4] || '').includes('ALUMNO')) {
      return 'kollybry-legacy'
    }
    return null
  }

  // El header NO está en la misma fila en todas las hojas: unas traen un título
  // arriba ("CASA DE NIÑOS \"A\" ROSY - FER") y otras no. Si se asume una sola
  // fila para todas, en las demás se pierde el primer alumno. Por eso se busca
  // hoja por hoja.
  let formato = null
  const headerRowBySheet = {}
  for (const s of sheets) {
    const maxFilas = Math.min(s._grid.length, 6)
    for (let r = 0; r < maxFilas; r++) {
      const f = formatoDeFila((s._grid[r] || []).map(normalize))
      if (!f) continue
      if (!formato) formato = f          // el primer formato reconocido manda
      if (f === formato) headerRowBySheet[s.name] = r
      break
    }
  }
  if (!formato) return null

  const esStandard = formato === 'kollybry-standard'
  return {
    _format: formato,
    org_type: 'colegio',
    has_family_structure: true,
    // En el standard el grupo viene en su columna; en el legacy la hoja hace de salón
    sheet_is_salon: !esStandard,
    confidence: 1,
    notes: esStandard
      ? 'Template estándar Kollybry detectado (con columna FAMILIA)'
      : 'Formato legacy Kollybry detectado (sin columna FAMILIA)',
    default_header_row: Object.values(headerRowBySheet)[0] ?? 1,
    header_row_by_sheet: headerRowBySheet,
    columns: esStandard
      ? {
          nombre_familia: 'A', mama_nombre: 'B', mama_telefono: 'C',
          papa_nombre: 'D', papa_telefono: 'E',
          nombre_alumno: 'F', grado: 'G', salon_col: 'H',
          mama_email: 'null', papa_email: 'null', telefono: 'null', email: 'null', id_externo: 'null'
        }
      : {
          mama_nombre: 'A', mama_telefono: 'B',
          papa_nombre: 'C', papa_telefono: 'D',
          nombre_alumno: 'E', grado: 'F', salon_col: 'G',
          mama_email: 'null', papa_email: 'null', telefono: 'null', email: 'null', id_externo: 'null'
        }
  }
}

// ── Claude mapea columnas y asigna salon/seccion por hoja ────────────────────
// Asigna seccion a partir del nombre de la hoja (sin gastar tokens)
function inferSeccion(sheetName) {
  const n = sheetName.toUpperCase()
  if (/CASA|^CN\b|INGRESO CASA/i.test(n)) return 'Casa de Niños'
  if (/TRANSIT/i.test(n)) return 'Transitorio'
  if (/TALLER\s*II/i.test(n)) return 'Taller II'   // check II before I
  if (/TALLER\s*I/i.test(n)) return 'Taller I'     // catches IA, IB, IC, ID
  if (/PRIMARIA|PRIM\b/i.test(n)) return 'Primaria'
  if (/SECUNDARIA|SEC\b/i.test(n)) return 'Secundaria'
  if (/PREESCOLAR|PREESC\b|KINDER|KG?\b/i.test(n)) return 'Preescolar'
  return null
}

// El nombre de la hoja de Casa de Niños suele traer a la guía pegada
// ("CASA DE NIÑOS A - LAURA"), y eso terminaba como nombre del grupo.
// El salón debe quedar solo como CNA / CNB / CNC.
function normalizeSalonHoja(sheetName, seccion) {
  const limpio = tidy(sheetName)
  if (seccion !== 'Casa de Niños') return limpio
  const sinPrefijo = limpio
    .toUpperCase()
    .replace(/^\s*(INGRESO\s+)?(CASA\s*DE\s*NI[ÑN]OS|CN)\s*/, '')
  const letra = sinPrefijo.match(/^[-–—\s]*([A-E])\b/)
  return letra ? `CN${letra[1]}` : limpio
}

async function askClaudeForMapping(sheets) {
  const client = new Anthropic()

  const system = `Eres un asistente que normaliza listas de contactos de colegios al esquema de Kollybry. Respondes SOLO con JSON válido, sin texto adicional ni markdown.`

  // Solo mandamos hasta 3 hojas de muestra para detectar columnas (todas tienen la misma estructura)
  const SAMPLE_COUNT = 3
  const sampleSheets = sheets.slice(0, SAMPLE_COUNT).map((s) => ({
    name: s.name,
    total_rows: s.total_rows,
    first_rows: s.preview.slice(0, 8) // máximo 8 filas
  }))

  // header_row por hoja — solo para las muestras; el resto hereda el default
  const sheetNames = sheets.map((s) => s.name)

  const prompt = `Analiza estas hojas de muestra de un directorio escolar (${sheets.length} hojas en total, misma estructura).

Nuestro esquema: nombre, apellido, telefono, email, seccion, grado, salon, nombre_familia, relationship_type ("student"|"mama"|"papa"|"member"), nombre_alumno, id_externo.

REGLAS:
1. Si cada fila tiene alumno + mamá + papá → has_family_structure=true.
2. Detecta qué columna es cada campo y el header_row (base 0) de las hojas de muestra.
3. Si el header_row varía entre hojas indicalo; si es igual para todas usa "default".
4. Si existe una columna GRUPO/SALÓN con el nombre corto del grupo ("CNA",
   "TI D", "1A"), mapeala como "salon_col": tiene prioridad sobre el nombre de
   la hoja, que suele traer al maestro o guía pegado.
   Si existe una columna FAMILIA/APELLIDOS, mapeala como "nombre_familia".
5. Valores como "NA", "N/A", "-" o "X" significan que ese dato NO existe.

Hojas de muestra:
${JSON.stringify(sampleSheets, null, 1)}

Todos los nombres de hoja (para referencia):
${JSON.stringify(sheetNames)}

Devuelve EXACTAMENTE este JSON (sin texto extra):
{
  "org_type": "colegio|colegio-montessori|condominio|gimnasio|general",
  "has_family_structure": true,
  "sheet_is_salon": true,
  "confidence": 0.95,
  "notes": "explicación breve",
  "columns": {
    "nombre_alumno": "C",
    "grado": "D",
    "mama_nombre": "F",
    "mama_telefono": "G",
    "mama_email": "H",
    "papa_nombre": "I",
    "papa_telefono": "J",
    "papa_email": "K",
    "telefono": "null",
    "email": "null",
    "salon_col": "G",
    "nombre_familia": "null",
    "id_externo": "B"
  },
  "default_header_row": 1,
  "header_row_by_sheet": { "NombreHoja": 2 }
}`

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: 'adaptive' },
    system,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = resp.content.find((b) => b.type === 'text')?.text || ''
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) {
    console.error('aiImport: Claude no devolvió JSON. stop_reason:', resp.stop_reason, 'text snippet:', text.slice(0, 200))
    throw new Error(`Claude no devolvió JSON válido (stop_reason: ${resp.stop_reason})`)
  }
  const jsonStr = text.slice(start, end + 1)
  try {
    return JSON.parse(jsonStr)
  } catch (e) {
    console.error('aiImport: JSON parse error. jsonStr snippet:', jsonStr.slice(0, 300))
    throw new Error('No se pudo parsear la respuesta de Claude: ' + e.message)
  }
}

// ── Aplica el mapeo a TODAS las filas ────────────────────────────────────────
// Agrupa hermanos: papás/mamás se deduplicán por clave familia|rol|nombre.
// Exportada para poder verificarla sin llamar a Claude.
export function applyMapping(sheets, mapping) {
  const colIdx = (letter) => (letter && letter !== 'null' ? XLSX.utils.decode_col(letter) : null)
  const C = mapping.columns || {}
  const cols = {
    alumno:    colIdx(C.nombre_alumno),
    grado:     colIdx(C.grado),
    salonCol:  colIdx(C.salon_col),       // GRUPO por fila (template estándar)
    familiaCol:colIdx(C.nombre_familia),  // FAMILIA explícita (template estándar)
    mamaNom:   colIdx(C.mama_nombre),
    mamaTel:   colIdx(C.mama_telefono),
    mamaEmail: colIdx(C.mama_email),
    papaNom:   colIdx(C.papa_nombre),
    papaTel:   colIdx(C.papa_telefono),
    papaEmail: colIdx(C.papa_email),
    tel:       colIdx(C.telefono),
    email:     colIdx(C.email),
    mat:       colIdx(C.id_externo)
  }

  const contacts = []
  const byPhone = new Set()
  const parentsSeen = new Map()   // "familia|rol|nombre" → contacto ya creado
  let alumnos = 0

  for (const s of sheets) {
    const headerRow = (mapping.header_row_by_sheet || {})[s.name] ?? (mapping.default_header_row ?? 1)
    const seccion     = inferSeccion(s.name) || null
    // Respaldo cuando la hoja hace de salón: normaliza "CASA DE NIÑOS A - LAURA"
    // → "CNA". Si el archivo trae columna GRUPO, esa manda (ver más abajo).
    const sheetSalon  = mapping.sheet_is_salon ? normalizeSalonHoja(s.name, seccion) : null

    for (let r = headerRow + 1; r < s._grid.length; r++) {
      const row = s._grid[r]
      if (!row) continue
      const get = (i) => (i == null ? '' : tidy(row[i]))

      if (mapping.has_family_structure) {
        const alumnoFull = get(cols.alumno)
        if (!alumnoFull || alumnoFull.length < 2) continue
        if (/^(nombre|alumno|#|familia|ejemplo)/i.test(alumnoFull)) continue

        // FAMILIA: usar columna explícita si existe, si no extraer de apellidos del alumno
        let familia
        if (cols.familiaCol != null) {
          const fVal = limpioODefault(get(cols.familiaCol))
          familia = fVal ? titleCase(fVal) : null
        }
        if (!familia) {
          const { apellidos } = splitSurnameName(alumnoFull)
          familia = titleCase(apellidos)
        }

        const { nombres } = splitSurnameName(alumnoFull)
        const grado  = limpioODefault(get(cols.grado)) || null
        // salon: por fila (GRUPO col) > por hoja
        const salon  = (cols.salonCol != null ? limpioODefault(get(cols.salonCol)) : null) || sheetSalon
        alumnos++

        contacts.push({
          relationship_type: 'student',
          nombre: titleCase(nombres),
          apellido: familia,
          nombre_alumno: titleCase(alumnoFull),
          nombre_familia: familia,
          salon, seccion, grado,
          grupo: salon || grado || null,
          id_externo: get(cols.mat) || null,
          telefono: null,
          email: null
        })

        // Mamá / Papá — deduplicar por teléfono, agrupando hermanos
        for (const [tipo, nomI, telI, emailI] of [
          ['mama', cols.mamaNom, cols.mamaTel, cols.mamaEmail],
          ['papa', cols.papaNom, cols.papaTel, cols.papaEmail]
        ]) {
          // "NA", "N/A", "-", "X"… significan que ese papá/mamá no existe o no
          // dieron el dato. Se limpian en nombre, correo Y teléfono: si no, se
          // daba de alta un contacto llamado "Na".
          const nom = limpioODefault(get(nomI))
          const emailVal = limpioODefault(get(emailI)) || null
          const celda = telI == null ? '' : row[telI]
          const telefonos = esPlaceholder(celda) ? [] : parsePhones(celda)

          if (!nom && telefonos.length === 0) continue

          const nombreLimpio = titleCase(nom) || (tipo === 'mama' ? 'Mamá' : 'Papá')
          const clave = `${familia}|${tipo}|${nombreLimpio}`

          const tel = telefonos.find((t) => !byPhone.has(t)) || null

          // Hermanos: papás ya creados — completar datos faltantes sin duplicar
          const yaCreado = parentsSeen.get(clave)
          if (yaCreado) {
            if (!yaCreado.telefono && tel) { yaCreado.telefono = tel; byPhone.add(tel) }
            if (!yaCreado.email && emailVal) yaCreado.email = emailVal
            continue
          }

          if (tel) byPhone.add(tel)
          const padre = {
            relationship_type: tipo,
            nombre: nombreLimpio,
            apellido: familia,
            nombre_familia: familia,
            salon: null, seccion: null, grado: null, grupo: null,
            telefono: tel,
            email: emailVal
          }
          parentsSeen.set(clave, padre)
          contacts.push(padre)
        }
      } else {
        // Estructura simple: una fila = un contacto
        const nomFull = get(cols.alumno)
        if (!nomFull) continue
        const phones = parsePhones(cols.tel == null ? '' : row[cols.tel])
        const { apellidos, nombres } = splitSurnameName(nomFull)
        const tel = phones[0] || null
        if (tel && byPhone.has(tel)) continue
        if (tel) byPhone.add(tel)
        const salon = (cols.salonCol != null ? get(cols.salonCol) : null) || sheetSalon
        contacts.push({
          relationship_type: 'member',
          nombre: titleCase(nombres) || titleCase(nomFull),
          apellido: titleCase(apellidos),
          nombre_familia: titleCase(apellidos),
          grupo: get(cols.grado) || salon || null,
          salon, seccion,
          telefono: tel,
          email: get(cols.email) || null
        })
      }
    }
  }

  return { contacts, alumnos }
}

// ── API pública ──────────────────────────────────────────────────────────────
export async function analyzeContactsFile(buffer) {
  const sheets = buildSheetPreviews(buffer)
  if (sheets.length === 0) throw new Error('No se encontraron hojas con datos de contactos')

  // El layout de Kollybry es obligatorio: se lee tal cual, sin que un modelo
  // decida qué columna es qué. Cuando la IA interpretaba el archivo, el
  // resultado variaba entre corridas y se perdían papás y alumnos sin aviso.
  const detected = detectKollybryTemplate(sheets)
  if (!detected) {
    if (process.env.AI_IMPORT_FALLBACK !== '1') {
      throw new Error(
        'El archivo no tiene el layout de Kollybry. Cada hoja debe iniciar con una fila de ' +
        'encabezados con estas columnas, en este orden: ' +
        'FAMILIA | MAMÁ | CELULAR MAMÁ | PAPÁ | CELULAR PAPÁ | NOMBRE DEL ALUMNO | GRADO | GRUPO. ' +
        'También se acepta el formato sin la columna FAMILIA: ' +
        'MAMÁ | CELULAR | PAPÁ | CELULAR | NOMBRE DEL ALUMNO | GRADO | GRUPO. ' +
        'Descarga la plantilla desde Contactos y vacía ahí tus listas.'
      )
    }
    // Respaldo opt-in para archivos raros: hay que prenderlo a propósito.
    console.warn('aiImport: layout no reconocido, usando interpretación con IA (AI_IMPORT_FALLBACK=1)')
  }
  const mapping = detected ?? await askClaudeForMapping(sheets)
  const { contacts, alumnos } = applyMapping(sheets, mapping)

  const conTel = contacts.filter((c) => c.telefono).length
  const salones = [...new Set(contacts.map((c) => c.salon).filter(Boolean))].sort()
  const secciones = [...new Set(contacts.map((c) => c.seccion).filter(Boolean))].sort()

  const mamas = contacts.filter((c) => c.relationship_type === 'mama').length
  const papas = contacts.filter((c) => c.relationship_type === 'papa').length
  // Un padre/madre sin teléfono se importa igual, pero no puede recibir
  // WhatsApp: hay que mostrarlo para que el colegio complete el dato.
  const padresSinTel = contacts.filter(
    (c) => (c.relationship_type === 'mama' || c.relationship_type === 'papa') && !c.telefono
  ).length

  return {
    mapping,
    summary: {
      total_contactos: contacts.length,
      alumnos,
      mamas,
      papas,
      padres_sin_telefono: padresSinTel,
      con_telefono: conTel,
      hojas_procesadas: sheets.length,
      salones: salones.length,
      salones_lista: salones.slice(0, 40),
      secciones_lista: secciones
    },
    contacts
  }
}
