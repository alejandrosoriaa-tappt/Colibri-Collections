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

const MODEL = 'claude-opus-4-8'

// ── Hojas que nunca son listas de contactos ──────────────────────────────────
const SKIP_SHEET_PATTERNS = [
  /baja/i, /acuerdo/i, /graduad/i, /egresad/i, /firmar/i,
  /pagos?/i, /estado\s*de\s*cuenta/i, /resumen/i, /^hoja\d/i
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
function titleCase(str) {
  return tidy(str)
    .toLowerCase()
    .replace(/\b([a-záéíóúñü])/g, (m) => m.toUpperCase())
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

// ── Claude mapea columnas y asigna salon/seccion por hoja ────────────────────
async function askClaudeForMapping(sheets) {
  const client = new Anthropic()

  const system = `Eres un asistente que normaliza listas de contactos de colegios, condominios, gimnasios y clubes al esquema de Kollybry. Respondes SOLO con JSON válido, sin texto adicional ni markdown.`

  const sheetsForModel = sheets.map((s) => ({
    name: s.name,
    total_rows: s.total_rows,
    first_rows: s.preview
  }))

  const prompt = `Analiza estas hojas de Excel de un directorio escolar. Cada hoja puede ser un salón distinto.

Nuestro esquema: nombre, apellido, telefono, email, seccion, grado, salon, nombre_familia, relationship_type ("student"|"mama"|"papa"|"member"), nombre_alumno, id_externo.

REGLAS IMPORTANTES:
1. Si cada fila tiene alumno + datos de mamá y papá → estructura de familia (has_family_structure=true). Por cada fila generar: 1 alumno (student, sin tel) + mamá + papá.
2. El NOMBRE DE LA PESTAÑA suele ser el salón. Asigna salon y seccion a cada hoja según su nombre:
   - "INGRESO CASA", "CN A ROSY", "CN B SOFIA", "CN C BETY" → seccion="Casa de Niños"
   - "TRANSITORIO A/B", "INGRESOS A TRANSITORIO*" → seccion="Transitorio"
   - "TALLER IA/IB/IC/ID", "INGRESOS A TALLER 1*" → seccion="Taller I"
   - "TALLER IIA/IIB/IIC", "INGRESOS A TALLER 2*" → seccion="Taller II"
   - Si no reconoces, déjalo en null y usa el nombre de la hoja como salon.
3. nombre_familia = primeros 2 apellidos del alumno (extrae de nombre_alumno en código, no en columna).
4. Indica header_row (base 0) por hoja — puede variar entre hojas.
5. Si hay columnas de email para mamá y papá, indícalas.

Hojas:
${JSON.stringify(sheetsForModel, null, 1)}

Devuelve EXACTAMENTE este JSON:
{
  "org_type": "colegio|colegio-montessori|condominio|gimnasio|general",
  "has_family_structure": true,
  "sheet_is_salon": true,
  "confidence": 0.95,
  "needs_admin_review": false,
  "notes": "explicación breve en español",
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
    "id_externo": "B"
  },
  "header_row_by_sheet": { "NombreHoja": 2 },
  "seccion_by_sheet": { "NombreHoja": "Casa de Niños" }
}`

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    thinking: { type: 'adaptive' },
    system,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = resp.content.find((b) => b.type === 'text')?.text || ''
  const jsonStr = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
  return JSON.parse(jsonStr)
}

// ── Aplica el mapeo a TODAS las filas ────────────────────────────────────────
function applyMapping(sheets, mapping) {
  const colIdx = (letter) => (letter && letter !== 'null' ? XLSX.utils.decode_col(letter) : null)
  const C = mapping.columns || {}
  const cols = {
    alumno:   colIdx(C.nombre_alumno),
    grado:    colIdx(C.grado),
    mamaNom:  colIdx(C.mama_nombre),
    mamaTel:  colIdx(C.mama_telefono),
    mamaEmail:colIdx(C.mama_email),
    papaNom:  colIdx(C.papa_nombre),
    papaTel:  colIdx(C.papa_telefono),
    papaEmail:colIdx(C.papa_email),
    tel:      colIdx(C.telefono),
    email:    colIdx(C.email),
    mat:      colIdx(C.id_externo)
  }

  const contacts = []
  const byPhone = new Set()
  let alumnos = 0

  for (const s of sheets) {
    const headerRow = (mapping.header_row_by_sheet || {})[s.name] ?? 1
    const salon = mapping.sheet_is_salon ? tidy(s.name) : null
    const seccion = (mapping.seccion_by_sheet || {})[s.name] || null

    for (let r = headerRow + 1; r < s._grid.length; r++) {
      const row = s._grid[r]
      if (!row) continue
      const get = (i) => (i == null ? '' : tidy(row[i]))

      if (mapping.has_family_structure) {
        const alumnoFull = get(cols.alumno)
        if (!alumnoFull || alumnoFull.length < 2) continue
        // Skip residual header/title rows
        if (/^(nombre|alumno|#)/i.test(alumnoFull)) continue

        const { apellidos, nombres } = splitSurnameName(alumnoFull)
        const familia = titleCase(apellidos)
        const grado = get(cols.grado) || null
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

        for (const [tipo, nomI, telI, emailI] of [
          ['mama', cols.mamaNom, cols.mamaTel, cols.mamaEmail],
          ['papa', cols.papaNom, cols.papaTel, cols.papaEmail]
        ]) {
          const nom = get(nomI)
          const emailVal = get(emailI) || null
          for (const tel of parsePhones(telI == null ? '' : row[telI])) {
            if (byPhone.has(tel)) continue
            byPhone.add(tel)
            contacts.push({
              relationship_type: tipo,
              nombre: titleCase(nom) || (tipo === 'mama' ? 'Mamá' : 'Papá'),
              apellido: familia,
              nombre_familia: familia,
              salon: null, seccion: null, grado: null, grupo: null,
              telefono: tel,
              email: emailVal
            })
          }
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
        contacts.push({
          relationship_type: 'member',
          nombre: titleCase(nombres) || titleCase(nomFull),
          apellido: titleCase(apellidos),
          nombre_familia: titleCase(apellidos),
          grupo: get(cols.grado) || (mapping.sheet_is_salon ? tidy(s.name) : null),
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

  const mapping = await askClaudeForMapping(sheets)
  const { contacts, alumnos } = applyMapping(sheets, mapping)

  const conTel = contacts.filter((c) => c.telefono).length
  const salones = [...new Set(contacts.map((c) => c.salon).filter(Boolean))].sort()
  const secciones = [...new Set(contacts.map((c) => c.seccion).filter(Boolean))].sort()

  return {
    mapping,
    summary: {
      total_contactos: contacts.length,
      alumnos,
      con_telefono: conTel,
      hojas_procesadas: sheets.length,
      salones: salones.length,
      salones_lista: salones.slice(0, 40),
      secciones_lista: secciones
    },
    contacts
  }
}
