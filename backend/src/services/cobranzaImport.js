// ============================================================================
// Cobranza por color — interpreta el reporte de cuentas por cobrar de un
// colegio (semáforo de Excel) y lo convierte en campañas en borrador.
//
// Arquitectura:
//   1. Leemos el .xlsx con exceljs y, por cada fila de datos, detectamos el
//      COLOR de relleno (semáforo). Los colores son determinísticos -> no
//      gastan tokens.
//   2. Una sola llamada a Claude mapea qué columna es el alumno y cuál el
//      monto (igual que el AI Import de contactos).
//   3. Por cada fila: matcheamos el nombre del alumno contra los contactos
//      cargados (relationship_type=student) -> resolvemos su familia
//      (nombre_familia) -> traemos los papás con teléfono.
//   4. Agrupamos por color y devolvemos un preview con sumatorias, familias
//      resueltas y las que no hicieron match (para revisión del tenant).
// ============================================================================
import Anthropic from '@anthropic-ai/sdk'
import ExcelJS from 'exceljs'
import supabase from './supabase.js'

const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-6'

// ── Texto ────────────────────────────────────────────────────────────────────
function tidy(str) {
  if (str == null) return ''
  return String(str).replace(/\s+/g, ' ').trim()
}
// Normaliza para comparar nombres: minúsculas, sin acentos, sin puntuación
function normName(str) {
  return tidy(str)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
function parseMonto(value) {
  if (value == null) return 0
  if (typeof value === 'number') return Math.round(value * 100) / 100
  const digits = String(value).replace(/[^0-9.,-]/g, '').replace(/,/g, '')
  const n = parseFloat(digits)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

// ── Semáforo: clasifica un relleno ARGB a una etiqueta de color ───────────────
// Códigos exactos del semáforo de Excel (condicional verde/amarillo/rojo) +
// un clasificador por tono para tolerar variantes de matiz.
const EXACT = {
  FFC6EFCE: 'verde',    // verde claro (al corriente)
  FFFFEB9C: 'naranja',  // amarillo claro
  FFFFCC99: 'naranja',  // naranja claro
  FFFFC7CE: 'rojo'      // rojo claro (vencido)
}
function classifyColor(argb) {
  if (!argb) return 'sin_color'
  const hex = String(argb).toUpperCase().slice(-6)
  if (hex === 'FFFFFF' || hex === '000000') return 'sin_color'
  if (EXACT[String(argb).toUpperCase()]) return EXACT[String(argb).toUpperCase()]
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return 'sin_color'
  // tono aproximado
  if (r > 180 && g > 180 && b > 180) return 'sin_color' // casi blanco
  if (g >= r && g > b + 20) return 'verde'
  if (r > 150 && g > 120 && b < 150) return 'naranja'   // amarillo/naranja
  if (r > g + 20 && r > b + 20) return 'rojo'
  return 'otro'
}

// Lee el relleno de una fila: toma el primer color "real" entre sus celdas.
function rowColor(row) {
  let found = null
  row.eachCell({ includeEmpty: false }, (cell) => {
    if (found) return
    const fill = cell.fill
    const argb = fill?.fgColor?.argb || fill?.bgColor?.argb
    if (fill?.type === 'pattern' && fill.pattern !== 'none' && argb) {
      const label = classifyColor(argb)
      if (label !== 'sin_color') found = label
    }
  })
  return found || 'sin_color'
}

// Orden de presentación y emoji por color (solo UI, sin significado asumido)
const COLOR_ORDER = { verde: 1, naranja: 2, rojo: 3, sin_color: 4, otro: 5 }
const COLOR_EMOJI = { verde: '🟢', naranja: '🟠', rojo: '🔴', sin_color: '⚪', otro: '🎨' }

// ── Claude mapea columnas: alumno, monto y opcionalmente estatus ──────────────
async function askClaudeForColumns(headerRows) {
  const client = new Anthropic()
  const system = 'Eres un asistente que interpreta reportes de cuentas por cobrar de colegios. Respondes SOLO con JSON válido, sin texto adicional.'
  const prompt = `Te paso las primeras filas de un reporte de cobranza (cada celda con su letra de columna).
Identifica:
1. Columna con NOMBRE DEL ALUMNO
2. Columna con MONTO adeudado
3. Columna con ESTATUS o ESTADO (valores como "Al corriente", "Vencido", "Pendiente", "Pagado", etc.) — si existe. Si no hay, pon null.
4. Fila de encabezados (header_row, base 0)

Filas:
${JSON.stringify(headerRows, null, 1)}

Devuelve EXACTAMENTE este JSON:
{
  "header_row": 0,
  "confidence": 0.0,
  "notes": "breve explicación en español de qué detectaste",
  "columns": { "alumno": "A", "monto": "C", "estatus": "D|null", "concepto": "B|null" }
}`
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    thinking: { type: 'adaptive' },
    system,
    messages: [{ role: 'user', content: prompt }]
  })
  const text = resp.content.find((b) => b.type === 'text')?.text || ''
  const jsonStr = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
  return JSON.parse(jsonStr)
}

// ── Carga el índice de alumnos del tenant (nombre normalizado -> familia) ─────
async function loadStudentIndex(tenantId) {
  const { data, error } = await supabase
    .from('contacts')
    .select('id, nombre_alumno, nombre, apellido, nombre_familia, grupo')
    .eq('tenant_id', tenantId)
    .eq('relationship_type', 'student')
    .neq('status', 'inactive')
  if (error) throw error
  const index = new Map()
  for (const s of data || []) {
    const full = s.nombre_alumno || `${s.nombre || ''} ${s.apellido || ''}`
    const key = normName(full)
    if (key) index.set(key, s)
  }
  return index
}

// Trae los papás (no-alumnos) con teléfono de una lista de familias.
async function loadParentsByFamilies(tenantId, families) {
  if (families.size === 0) return new Map()
  const { data, error } = await supabase
    .from('contacts')
    .select('id, nombre, apellido, telefono, nombre_familia, relationship_type')
    .eq('tenant_id', tenantId)
    .neq('relationship_type', 'student')
    .neq('status', 'inactive')
    .in('nombre_familia', [...families])
    .not('telefono', 'is', null)
    .neq('telefono', '')
  if (error) throw error
  const byFamily = new Map()
  for (const p of data || []) {
    const arr = byFamily.get(p.nombre_familia) || []
    arr.push({ contact_id: p.id, nombre: p.nombre, apellido: p.apellido, telefono: p.telefono })
    byFamily.set(p.nombre_familia, arr)
  }
  return byFamily
}

// ── API pública ──────────────────────────────────────────────────────────────
export async function analyzeCobranzaFile(buffer, tenantId) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  const ws = wb.worksheets.find((s) => s.rowCount > 1) || wb.worksheets[0]
  if (!ws) throw new Error('El archivo no tiene hojas con datos')

  // Preview de encabezados para Claude (primeras 12 filas, con letra de col)
  const headerRows = []
  for (let r = 1; r <= Math.min(12, ws.rowCount); r++) {
    const obj = {}
    ws.getRow(r).eachCell({ includeEmpty: false }, (cell, col) => {
      const v = tidy(cell.text)
      if (v) obj[colLetter(col)] = v.slice(0, 40)
    })
    if (Object.keys(obj).length) headerRows.push({ _row: r - 1, ...obj })
  }
  const mapping = await askClaudeForColumns(headerRows)

  const colAlumno = letterToIndex(mapping.columns?.alumno)
  const colMonto  = letterToIndex(mapping.columns?.monto)
  const colEstatus = letterToIndex(mapping.columns?.estatus)
  const headerRow = (mapping.header_row ?? 0) + 1 // exceljs es 1-based

  // Recorremos las filas: color de celda + alumno + monto + estatus (texto)
  const rows = []
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)
    const alumno = colAlumno ? tidy(row.getCell(colAlumno).text) : ''
    if (!alumno) continue
    const monto   = colMonto ? parseMonto(row.getCell(colMonto).value) : 0
    const estatus = colEstatus ? tidy(row.getCell(colEstatus).text) : ''
    rows.push({ alumno, monto, color: rowColor(row), estatus })
  }

  // Detectar si el archivo no usa colores (todos sin_color) → usar columna estatus
  const allSinColor = rows.length > 0 && rows.every((r) => r.color === 'sin_color')
  const useEstatus  = allSinColor && colEstatus && rows.some((r) => r.estatus)
  if (useEstatus) mapping._groupBy = 'estatus'

  // Resolvemos alumno -> familia -> papás
  const studentIndex = await loadStudentIndex(tenantId)
  const matchedFamilies = new Set()
  for (const row of rows) {
    const s = studentIndex.get(normName(row.alumno))
    if (s) {
      row.matched = true
      row.nombre_familia = s.nombre_familia
      row.grupo = s.grupo
      if (s.nombre_familia) matchedFamilies.add(s.nombre_familia)
    } else {
      row.matched = false
    }
  }
  const parentsByFamily = await loadParentsByFamilies(tenantId, matchedFamilies)
  for (const row of rows) {
    row.recipients = row.matched ? (parentsByFamily.get(row.nombre_familia) || []) : []
  }

  // Agrupar por estatus (texto) o por color de celda
  const groupKey = (row) => useEstatus ? (row.estatus || 'Sin estatus') : row.color

  // Emoji heurístico para valores de estatus de texto
  function estatusEmoji(val) {
    const v = val.toLowerCase()
    if (/corriente|pagad|ok|activ/.test(v)) return '🟢'
    if (/venc|mora|atras|pend/.test(v)) return '🔴'
    if (/próx|prox|por venc|parc/.test(v)) return '🟠'
    if (/reinscr|inscr/.test(v)) return '⚪'
    return '🏷️'
  }

  const groupsMap = new Map()
  for (const row of rows) {
    const key = groupKey(row)
    const g = groupsMap.get(key) || []
    g.push(row)
    groupsMap.set(key, g)
  }

  const groups = [...groupsMap.entries()]
    .map(([key, gRows]) => {
      const familias = gRows.map((row) => ({
        alumno: row.alumno,
        monto: row.monto,
        matched: row.matched,
        nombre_familia: row.nombre_familia || null,
        grupo: row.grupo || null,
        recipients: row.recipients
      }))
      const resueltas = familias.filter((f) => f.matched && f.recipients.length > 0)
      const sinMatch  = familias.filter((f) => !f.matched || f.recipients.length === 0)
      const emoji = useEstatus ? estatusEmoji(key) : (COLOR_EMOJI[key] || '🎨')
      return {
        color: key,   // cuando es estatus, color = texto del estatus (sirve como clave de template)
        emoji,
        group_type: useEstatus ? 'estatus' : 'color',
        count_filas: familias.length,
        count_familias_resueltas: resueltas.length,
        count_sin_match: sinMatch.length,
        count_destinatarios: resueltas.reduce((acc, f) => acc + f.recipients.length, 0),
        suma_monto: Math.round(familias.reduce((acc, f) => acc + (f.monto || 0), 0) * 100) / 100,
        familias
      }
    })
    .sort((a, b) => {
      if (!useEstatus) return (COLOR_ORDER[a.color] || 9) - (COLOR_ORDER[b.color] || 9)
      return a.color.localeCompare(b.color, 'es')
    })

  const summary = {
    total_filas: rows.length,
    familias_resueltas: rows.filter((r) => r.matched && r.recipients.length > 0).length,
    sin_match: rows.filter((r) => !r.matched || r.recipients.length === 0).length,
    suma_total: Math.round(rows.reduce((acc, r) => acc + (r.monto || 0), 0) * 100) / 100
  }

  return { mapping, summary, groups }
}

// Crea una campaña en borrador por cada color que el tenant decida conservar.
export async function commitCobranzaCampaigns(tenantId, campaignsPayload) {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('payment_link_general')
    .eq('id', tenantId)
    .single()

  const created = []
  for (const c of campaignsPayload) {
    const { data: campaign, error: cErr } = await supabase
      .from('campaigns')
      .insert({
        tenant_id: tenantId,
        name: c.name,
        concept: c.concept || 'pago',
        cycle_start_date: new Date().toISOString().slice(0, 10),
        due_date: c.due_date || null,
        late_fee_pct: 0,
        grupo_filter: null,
        status: 'draft',
        total_contacts: 0, paid_count: 0, pending_count: 0, total_amount: 0, paid_amount: 0
      })
      .select()
      .single()
    if (cErr) throw cErr

    await supabase.from('campaign_messages').insert({
      campaign_id: campaign.id,
      tenant_id: tenantId,
      message_number: 1,
      trigger_day: 1,
      send_to: 'all',
      message_template: c.message,
      sent_at: null, sent_count: 0, failed_count: 0
    })

    // Una factura por destinatario (papá), con el monto de su familia
    let added = 0
    for (const item of c.items || []) {
      if (!item.contact_id) continue
      try {
        await supabase.from('invoices').upsert({
          campaign_id: campaign.id,
          contact_id: item.contact_id,
          tenant_id: tenantId,
          monto: Number(item.monto) || 0,
          liga_pago: tenant?.payment_link_general || '',
          status: 'pending',
          updated_at: new Date().toISOString()
        }, { onConflict: 'campaign_id,contact_id', ignoreDuplicates: false })
        added++
      } catch (err) {
        console.error('commitCobranza: error upserting invoice', err.message)
      }
    }
    created.push({ id: campaign.id, name: campaign.name, color: c.color, destinatarios: added })
  }
  return { created }
}

// ── Utilidades de columnas (A=1) ──────────────────────────────────────────────
function colLetter(col) {
  let s = ''
  while (col > 0) { const m = (col - 1) % 26; s = String.fromCharCode(65 + m) + s; col = Math.floor((col - 1) / 26) }
  return s
}
function letterToIndex(letter) {
  if (!letter || letter === 'null') return null
  let n = 0
  for (const ch of String(letter).toUpperCase()) {
    if (ch < 'A' || ch > 'Z') continue
    n = n * 26 + (ch.charCodeAt(0) - 64)
  }
  return n || null
}
