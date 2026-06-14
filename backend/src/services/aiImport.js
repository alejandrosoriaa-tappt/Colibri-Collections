// ============================================================================
// AI Import — interpreta el archivo de contactos de CUALQUIER tenant en su
// propio formato y lo normaliza a nuestra tabla `contacts`.
//
// Arquitectura (barata y escalable):
//   1. Leemos el Excel/CSV y sacamos un PREVIEW de cada hoja (encabezados +
//      primeras filas) — NO mandamos las 600 filas al modelo.
//   2. Una sola llamada a la API de Claude mapea las columnas → nuestro
//      esquema, detecta org_type y estructura de familia.
//   3. Aplicamos ese mapeo en código a TODAS las filas (rápido, sin tokens).
// ============================================================================
import Anthropic from '@anthropic-ai/sdk'
import * as XLSX from 'xlsx'
import { normalizePhone } from '../utils/phone.js'

const MODEL = 'claude-opus-4-8'

// ── Limpieza de texto (ortografía ligera: espacios, mayúsculas) ──────────────
function tidy(str) {
  if (str == null) return ''
  return String(str).replace(/\s+/g, ' ').trim()
}
function titleCase(str) {
  return tidy(str)
    .toLowerCase()
    .replace(/\b([a-záéíóúñü])/g, (m) => m.toUpperCase())
}

// ── Teléfonos: soporta varios separados por / , ; y formatea a E.164 ─────────
function parsePhones(value) {
  if (value == null) return []
  let s = String(value).replace(/ /g, ' ')
  return s
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

// ── Apellidos compuestos (Mexican naming): "Álvarez de la Cuadra Romero Pablo"
const PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y'])
function splitSurnameName(full) {
  const toks = tidy(full).split(' ')
  if (toks.length <= 2) return { apellidos: toks[0] || '', nombres: toks.slice(1).join(' ') }
  // Tomamos 2 apellidos, pegando partículas (de/del/la...) al apellido
  let i = 0, surnameTokens = []
  let surnamesTaken = 0
  while (i < toks.length && surnamesTaken < 2) {
    surnameTokens.push(toks[i])
    if (!PARTICLES.has(toks[i].toLowerCase())) surnamesTaken++
    i++
    // si lo que sigue es partícula, pégala también
    while (i < toks.length && PARTICLES.has(toks[i].toLowerCase())) {
      surnameTokens.push(toks[i]); i++
    }
  }
  return { apellidos: surnameTokens.join(' '), nombres: toks.slice(i).join(' ') }
}

// ── Construye un preview compacto de cada hoja para mandárselo al modelo ─────
function buildSheetPreviews(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheets = []
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name]
    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
    // primeras 12 filas con letra de columna
    const preview = grid.slice(0, 12).map((row) => {
      const obj = {}
      row.forEach((val, c) => {
        const v = tidy(val)
        if (v) obj[XLSX.utils.encode_col(c)] = v.slice(0, 40)
      })
      return obj
    })
    sheets.push({ name, total_rows: grid.length, preview, _grid: grid })
  }
  return { wb, sheets }
}

// ── Llama a Claude para obtener el mapeo de columnas ─────────────────────────
async function askClaudeForMapping(sheets) {
  const client = new Anthropic() // lee ANTHROPIC_API_KEY del entorno

  const sheetsForModel = sheets.map((s) => ({
    name: s.name,
    total_rows: s.total_rows,
    first_rows: s.preview
  }))

  const system = `Eres un asistente que normaliza listas de contactos de colegios, condominios, gimnasios y clubes a un esquema único. Respondes SOLO con JSON válido, sin texto adicional.`

  const prompt = `Analiza estas hojas de Excel (cada celda viene con su letra de columna) y devuelve cómo mapear las columnas a nuestro esquema.

Nuestro esquema de contacto: nombre, apellido, telefono, email, seccion, grado, salon, nombre_familia, relationship_type ("student"|"mama"|"papa"|"member"), nombre_alumno, id_externo.

Reglas:
- Si cada FILA representa un alumno con sus papás (columnas de mamá/celular y papá/celular), es un colegio con estructura de familia: por cada fila generamos 1 alumno (student, sin teléfono) + mamá + papá.
- El nombre de la PESTAÑA suele ser el salón.
- Detecta el org_type: "colegio", "colegio-montessori" (si los niveles son Casa de Niños/Taller), "condominio", "gimnasio" o "general".
- Indica en qué fila están los encabezados (header_row, base 0) por hoja.

Hojas:
${JSON.stringify(sheetsForModel, null, 1)}

Devuelve EXACTAMENTE este JSON:
{
  "org_type": "colegio|colegio-montessori|condominio|gimnasio|general",
  "has_family_structure": true|false,
  "sheet_is_salon": true|false,
  "confidence": 0.0-1.0,
  "needs_admin_review": true|false,
  "notes": "explicación breve en español de qué detectaste y por qué",
  "columns": {
    "nombre_alumno": "C|null",
    "grado": "D|null",
    "mama_nombre": "F|null",
    "mama_telefono": "G|null",
    "papa_nombre": "I|null",
    "papa_telefono": "J|null",
    "telefono": "null",
    "email": "null",
    "id_externo": "B|null"
  },
  "header_row_by_sheet": { "NombreHoja": 1 }
}`

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    system,
    messages: [
      { role: 'user', content: prompt }
    ]
  })

  const text = resp.content.find((b) => b.type === 'text')?.text || ''
  const jsonStr = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
  return JSON.parse(jsonStr)
}

// ── Aplica el mapeo a TODAS las filas y produce contactos normalizados ───────
function applyMapping(sheets, mapping) {
  const colIdx = (letter) => (letter && letter !== 'null' ? XLSX.utils.decode_col(letter) : null)
  const C = mapping.columns || {}
  const cols = {
    alumno: colIdx(C.nombre_alumno),
    grado: colIdx(C.grado),
    mamaNom: colIdx(C.mama_nombre),
    mamaTel: colIdx(C.mama_telefono),
    papaNom: colIdx(C.papa_nombre),
    papaTel: colIdx(C.papa_telefono),
    tel: colIdx(C.telefono),
    email: colIdx(C.email),
    mat: colIdx(C.id_externo)
  }

  const contacts = []
  const byPhone = new Set()          // dedup global de teléfonos
  let alumnos = 0

  for (const s of sheets) {
    const headerRow = (mapping.header_row_by_sheet || {})[s.name] ?? 0
    const salon = mapping.sheet_is_salon ? tidy(s.name) : null

    for (let r = headerRow + 1; r < s._grid.length; r++) {
      const row = s._grid[r]
      if (!row) continue
      const get = (i) => (i == null ? '' : tidy(row[i]))

      if (mapping.has_family_structure) {
        const alumnoFull = get(cols.alumno)
        if (!alumnoFull) continue
        const { apellidos, nombres } = splitSurnameName(alumnoFull)
        const familia = apellidos
        const grado = get(cols.grado) || null
        const grupo = salon || grado || null
        alumnos++
        // alumno
        contacts.push({
          relationship_type: 'student',
          nombre: titleCase(nombres),
          apellido: titleCase(apellidos),
          nombre_alumno: titleCase(alumnoFull),
          nombre_familia: titleCase(familia),
          salon, grado, grupo,
          id_externo: get(cols.mat) || null,
          telefono: null
        })
        // mamá / papá (con dedup por teléfono)
        for (const [tipo, nomI, telI] of [['mama', cols.mamaNom, cols.mamaTel], ['papa', cols.papaNom, cols.papaTel]]) {
          const nom = get(nomI)
          for (const tel of parsePhones(telI == null ? '' : row[telI])) {
            if (byPhone.has(tel)) continue
            byPhone.add(tel)
            contacts.push({
              relationship_type: tipo,
              nombre: titleCase(nom) || (tipo === 'mama' ? 'Mamá' : 'Papá'),
              apellido: titleCase(apellidos),
              nombre_familia: titleCase(familia),
              salon: null, grado: null, grupo: null,
              telefono: tel
            })
          }
        }
      } else {
        // estructura simple: una fila = un contacto
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
  const { sheets } = buildSheetPreviews(buffer)
  const mapping = await askClaudeForMapping(sheets)
  const { contacts, alumnos } = applyMapping(sheets, mapping)

  // resumen para el preview
  const conTel = contacts.filter((c) => c.telefono).length
  const grupos = [...new Set(contacts.map((c) => c.grupo).filter(Boolean))].sort()

  return {
    mapping,                        // qué detectó la IA (org_type, notas, confianza)
    summary: {
      total_contactos: contacts.length,
      alumnos,
      con_telefono: conTel,
      grupos: grupos.length,
      grupos_lista: grupos.slice(0, 30)
    },
    contacts                        // normalizados, listos para insertar al confirmar
  }
}
