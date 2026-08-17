import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import * as XLSX from 'xlsx'
import { parse as csvParse } from 'csv-parse/sync'
import { authMiddleware } from '../middleware/auth.js'
import { inferTenantGuard } from '../middleware/tenantGuard.js'
import { createConektaCustomer, isConektaConfigured } from '../services/conekta.js'
import { buildEscolarGrupo } from '../utils/schoolCatalog.js'
import { analyzeContactsFile } from '../services/aiImport.js'
import supabase, {
  getContactsByTenant,
  getContact,
  getInvoicesByContact,
  getMessageLogs,
  getTenant
} from '../services/supabase.js'

const router = Router()

// Multer for sync uploads (contacts page)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.xlsx', '.xls', '.csv']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowedExts.includes(ext)) return cb(null, true)
    cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls) o CSV'))
  }
})

// Quita acentos y pasa a minúsculas para comparar: nadie escribe los acentos
// al buscar, así que "sarachaga" debe encontrar a "Saráchaga".
function sinAcentos(v) {
  return String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

// ── Phone normalization (same logic as fileProcessor) ────────────────────────
function normalizePhone(raw) {
  if (!raw) return null
  let phone = String(raw).trim().replace(/[\s\-\(\)\.]/g, '')
  const hadPlus = phone.startsWith('+')
  if (hadPlus) phone = phone.substring(1)
  if (phone.startsWith('521') && phone.length === 13) return '+' + phone
  if (phone.startsWith('52') && phone.length === 12) return '+521' + phone.substring(2)
  if (phone.length === 10) return '+521' + phone
  if (phone.length === 11 && phone.startsWith('1')) return '+' + phone
  return null
}

// ── Parse uploaded file and return rows ──────────────────────────────────────
function parseContactFile(buffer, fileType) {
  const PHONE_ALIASES  = ['teléfono','telefono','phone','celular','tel','movil','whatsapp']
  const NAME_ALIASES   = ['nombre','name','first_name','primer_nombre','familia']
  const LAST_ALIASES   = ['apellido','apellidos','last_name','surname']
  const GROUP_ALIASES  = ['grupo','group','seccion','salon','grado','seccion o salon']
  const ALUMNO_ALIASES = ['nombre_alumno','alumno','nombre alumno','estudiante','nombre del alumno']

  let rows = []

  if (fileType === 'csv') {
    rows = csvParse(buffer, { columns: true, skip_empty_lines: true, trim: true })
  } else {
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
  }

  if (!rows.length) return []

  // Detect columns from first row keys
  const headers = Object.keys(rows[0]).map(h => h.toLowerCase().trim())
  const findCol = (aliases) => {
    for (const alias of aliases) {
      const idx = headers.indexOf(alias)
      if (idx !== -1) return Object.keys(rows[0])[idx]
    }
    return null
  }

  const colPhone  = findCol(PHONE_ALIASES)
  const colName   = findCol(NAME_ALIASES)
  const colLast   = findCol(LAST_ALIASES)
  const colGroup  = findCol(GROUP_ALIASES)
  const colAlumno = findCol(ALUMNO_ALIASES)

  if (!colPhone) return []

  return rows.map(row => ({
    telefono:      normalizePhone(row[colPhone]),
    nombre:        colName   ? String(row[colName] || '').trim()   : '',
    apellido:      colLast   ? String(row[colLast] || '').trim()   : '',
    grupo:         colGroup  ? String(row[colGroup] || '').trim()  : '',
    nombre_alumno: colAlumno ? String(row[colAlumno] || '').trim() : ''
  })).filter(r => r.telefono)
}

// ── Cleanup: delete contacts past grace period ────────────────────────────────
async function runGracePeriodCleanup(tenantId) {
  // Get tenant grace period setting
  const tenant = await getTenant(tenantId)
  // Effective grace = tenant config + 30 fixed buffer days
  const days = (tenant?.contact_grace_period_days ?? 30) + 30

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const { data: deleted, error } = await supabase
    .from('contacts')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('status', 'inactive')
    .lt('inactive_since', cutoff.toISOString())
    .select('id')

  if (error) throw error
  return deleted?.length ?? 0
}

// ============================================================
// GET /api/contacts/groups
// ============================================================
router.get('/groups', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('grupo')
      .eq('tenant_id', req.tenantId)
      .eq('status', 'active')
      .not('grupo', 'is', null)
      .neq('grupo', '')

    if (error) throw error
    const groups = [...new Set(data.map(r => r.grupo))].sort()
    return res.json({ groups })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// ============================================================
// GET /api/contacts/catalog
// Distinct seccion/grado/salon combinations actually present for this
// tenant. The Contactos filters build their options from this, so the
// catalog adapts per tenant (a colegio shows Primaria/Secundaria, a
// Montessori shows Casa de Niños/Taller, etc.) without hardcoding.
// ============================================================
router.get('/catalog', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('seccion, grado, salon')
      .eq('tenant_id', req.tenantId)
      .eq('relationship_type', 'student')
      .neq('status', 'inactive')
    if (error) throw error

    // Un grado válido contiene dígito o empieza con keyword académica conocida.
    // Esto descarta nombres de papás que hayan quedado en el campo grado por import mal mapeado.
    const isValidGrado = (v) => {
      if (!v) return true
      if (/\d/.test(v)) return true
      if (/^(taller|casa|cn\b|transitorio|preescolar|kinder|primaria|secundaria|bachillerato)/i.test(v)) return true
      return false
    }

    // Distinct {seccion, grado, salon} combos (any field may be null).
    // Se cuenta cuántos alumnos hay en cada combinación: sin ese número, el
    // director no tiene forma de saber si su padrón se cargó completo. Es lo
    // primero que pidió al cargar el suyo.
    const porCombo = new Map()
    for (const r of data) {
      if (!r.seccion && !r.grado && !r.salon) continue
      if (!isValidGrado(r.grado)) continue
      const key = `${r.seccion || ''}|${r.grado || ''}|${r.salon || ''}`
      const previo = porCombo.get(key)
      if (previo) { previo.alumnos++; continue }
      porCombo.set(key, {
        seccion: r.seccion || null,
        grado: r.grado || null,
        salon: r.salon || null,
        alumnos: 1
      })
    }
    return res.json({ combos: [...porCombo.values()] })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// ============================================================
// POST /api/contacts/ai-import/analyze
// Sube el archivo del tenant EN SU PROPIO FORMATO. La IA (Claude)
// detecta las columnas, normaliza y devuelve un PREVIEW — no inserta.
// ============================================================
router.post('/ai-import/analyze', authMiddleware, inferTenantGuard, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' })
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'La importación con IA no está configurada (falta ANTHROPIC_API_KEY)' })
    }
    const result = await analyzeContactsFile(req.file.buffer)
    return res.json(result)
  } catch (err) {
    console.error('POST /contacts/ai-import/analyze error:', err)
    return res.status(500).json({ error: 'No se pudo analizar el archivo: ' + err.message })
  }
})

// ============================================================
// POST /api/contacts/ai-import/commit
// Inserta los contactos ya normalizados (confirmados por el tenant).
// ============================================================
router.post('/ai-import/commit', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { contacts } = req.body
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'No hay contactos para importar' })
    }
    const ALLOWED = ['nombre', 'apellido', 'telefono', 'email', 'seccion', 'grado', 'salon',
                     'grupo', 'nombre_familia', 'relationship_type', 'nombre_alumno', 'id_externo']
    const rows = contacts.map((c) => {
      const row = { tenant_id: req.tenantId, status: 'active' }
      for (const k of ALLOWED) row[k] = c[k] ?? null
      return row
    })

    let inserted = 0, duplicados = 0
    const fallidos = []   // { nombre, familia, rol, motivo }

    const describe = (r) =>
      `${r.relationship_type || 'contacto'} ${r.nombre || '(sin nombre)'} ${r.apellido || ''}`.trim() +
      (r.nombre_familia ? ` — familia ${r.nombre_familia}` : '')

    // Fila por fila. Es más lento que un upsert masivo, pero un lote entero ya
    // no se cae por culpa de una sola fila mala y, sobre todo, sabemos QUÉ se
    // quedó fuera: antes todo error se contaba como "omitido" sin explicación
    // y el colegio veía desaparecer papás y alumnos sin ninguna pista.
    for (const row of rows) {
      const { error } = await supabase.from('contacts').insert(row)
      if (!error) { inserted++; continue }

      if (error.code === '23505') {
        // Ya existe alguien con ese teléfono en este tenant
        duplicados++
      } else {
        fallidos.push({
          contacto: describe(row),
          grupo: row.grupo || null,
          motivo: error.message
        })
      }
    }

    if (fallidos.length > 0) {
      console.error('POST /contacts/ai-import/commit — filas rechazadas:',
        JSON.stringify(fallidos.slice(0, 20), null, 2))
    }

    return res.json({
      inserted,
      duplicados,
      fallidos: fallidos.length,
      // Muestra acotada para que el dashboard pueda explicar qué pasó
      detalle_fallidos: fallidos.slice(0, 20),
      total: rows.length,
      // compatibilidad con el front anterior
      skipped: duplicados + fallidos.length
    })
  } catch (err) {
    console.error('POST /contacts/ai-import/commit error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ============================================================
// GET /api/contacts  — ?status=active|inactive|all
// ============================================================
router.get('/', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { search, page = 1, limit = 50, status = 'active', seccion, grado, salon, agrupar } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    // agrupar=familia → la página cuenta FAMILIAS, no contactos, y devuelve
    // completos a todos sus integrantes (ver getContactsByTenant).
    const porFamilia = agrupar === 'familia'

    const { data: contacts, count } = await getContactsByTenant(req.tenantId, {
      search,
      status,
      limit: Number(limit),
      offset,
      porFamilia,
      seccion: seccion || undefined,
      grado:   grado   || undefined,
      salon:   salon   || undefined
    })

    return res.json({
      contacts,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(count / Number(limit))
      }
    })
  } catch (err) {
    console.error('GET /contacts error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ============================================================
// GET /api/contacts/:id
// ============================================================
router.get('/:id', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const contact = await getContact(req.params.id)
    if (!contact) return res.status(404).json({ error: 'Contact not found' })
    if (!req.isAdmin && contact.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const [invoices, messages] = await Promise.all([
      getInvoicesByContact(contact.id),
      getMessageLogs({ contactId: contact.id, limit: 100 })
    ])

    return res.json({ contact, invoices, messages })
  } catch (err) {
    console.error('GET /contacts/:id error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ── Build auto grupo from org-specific fields ─────────────────────────────────
/**
 * If the tenant has SPEI add-on enabled and Conekta is configured,
 * creates a Conekta customer and stores the CLABE on the contact.
 * Returns the (possibly updated) contact object.
 */
async function maybeAssignCLABE(contact, tenantId) {
  try {
    if (!isConektaConfigured()) return contact

    const { data: tenant } = await supabase
      .from('tenants')
      .select('spei_addon_enabled, display_name, name')
      .eq('id', tenantId)
      .maybeSingle()

    if (!tenant?.spei_addon_enabled) return contact

    const result = await createConektaCustomer({
      nombre: contact.nombre,
      apellido: contact.apellido,
      email: contact.email,
      telefono: contact.telefono,
      tenantName: tenant.display_name || tenant.name
    })

    if (!result.success) {
      console.warn(`CLABE generation failed for contact ${contact.id}:`, result.error)
      return contact
    }

    const { data: updated } = await supabase
      .from('contacts')
      .update({ clabe: result.clabe, conekta_customer_id: result.conekta_customer_id })
      .eq('id', contact.id)
      .select()
      .single()

    console.log(`CLABE assigned to contact ${contact.id}: ${result.clabe}`)
    return updated || contact
  } catch (err) {
    console.error('maybeAssignCLABE error:', err)
    return contact
  }
}

function buildGrupo({ org_type, grupo, seccion, grado, salon, torre, num_interior, fraccionamiento }) {
  if (org_type === 'colegio' || org_type === 'academia') {
    // Vocabulario controlado: normaliza y arma "Seccion Grado Salon" consistente
    const { grupo: g } = buildEscolarGrupo({ seccion, grado, salon })
    return g || grupo || null
  }
  if (org_type === 'condominio') {
    const parts = [fraccionamiento, torre, num_interior].filter(Boolean)
    return parts.length ? parts.join(' · ') : grupo || null
  }
  return grupo || null
}

// ============================================================
// POST /api/contacts — create single contact manually
// ============================================================
router.post('/', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const {
      nombre, apellido, telefono, grupo, id_externo, payment_link,
      email, seccion, grado, salon, fraccionamiento, torre, num_interior,
      nombre_alumno, org_type, relationship_type, student_id, nombre_familia
    } = req.body

    // Validación: nombre siempre requerido
    if (!nombre) {
      return res.status(400).json({ error: 'nombre es obligatorio' })
    }

    // Teléfono es obligatorio EXCEPTO para estudiantes (relationship_type === 'student')
    if (!telefono && relationship_type !== 'student') {
      return res.status(400).json({ error: 'telefono es obligatorio' })
    }

    const phone = telefono ? telefono.trim().replace(/\s+/g, '') : null

    // Normaliza sección/grado/salón contra el catálogo canónico (colegio/academia)
    const isEscolar = org_type === 'colegio' || org_type === 'academia'
    const esc = isEscolar
      ? buildEscolarGrupo({ seccion, grado, salon })
      : { grupo: null, seccion: null, grado: null, salon: null }

    const autoGrupo = buildGrupo({ org_type, grupo, seccion, grado, salon, torre, num_interior, fraccionamiento })

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        tenant_id: req.tenantId,
        nombre: nombre.trim(),
        apellido: apellido?.trim() || null,
        telefono: phone,
        grupo: autoGrupo,
        id_externo: id_externo?.trim() || null,
        payment_link: payment_link?.trim() || null,
        email: email?.trim() || null,
        seccion: isEscolar ? esc.seccion : (seccion?.trim() || null),
        grado: isEscolar ? esc.grado : (grado?.trim() || null),
        salon: isEscolar ? esc.salon : (salon?.trim() || null),
        fraccionamiento: fraccionamiento?.trim() || null,
        torre: torre?.trim() || null,
        num_interior: num_interior?.trim() || null,
        nombre_alumno: nombre_alumno?.trim() || null,
        // Campos de familia
        relationship_type: relationship_type?.trim() || null,
        student_id: student_id || null,
        nombre_familia: nombre_familia?.trim() || null,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Ya existe un contacto con ese teléfono' })
      }
      return res.status(500).json({ error: error.message })
    }

    // Auto-generate CLABE if tenant has SPEI add-on enabled
    const contact = await maybeAssignCLABE(data, req.tenantId)

    return res.status(201).json({ contact })
  } catch (err) {
    console.error('POST /contacts error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ============================================================
// PATCH /api/contacts/:id — general field update
// ============================================================
router.patch('/:id', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const contact = await getContact(req.params.id)
    if (!contact) return res.status(404).json({ error: 'Contact not found' })
    if (!req.isAdmin && contact.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const allowedFields = [
      'nombre', 'apellido', 'telefono', 'grupo', 'id_externo', 'status', 'payment_link',
      'email', 'seccion', 'grado', 'salon', 'fraccionamiento', 'torre', 'num_interior',
      'nombre_alumno'
    ]
    const updates = {}
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field]
    }
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ contact: data })
  } catch (err) {
    console.error('PATCH /contacts/:id error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ============================================================
// PATCH /api/contacts/:id/deactivate
// ============================================================
router.patch('/:id/deactivate', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const contact = await getContact(req.params.id)
    if (!contact) return res.status(404).json({ error: 'Contact not found' })
    if (contact.tenant_id !== req.tenantId) return res.status(403).json({ error: 'Access denied' })

    const { data, error } = await supabase
      .from('contacts')
      .update({ status: 'inactive', inactive_since: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ contact: data })
  } catch (err) {
    console.error('PATCH /contacts/:id/deactivate error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ============================================================
// PATCH /api/contacts/:id/reactivate
// ============================================================
router.patch('/:id/reactivate', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const contact = await getContact(req.params.id)
    if (!contact) return res.status(404).json({ error: 'Contact not found' })
    if (contact.tenant_id !== req.tenantId) return res.status(403).json({ error: 'Access denied' })

    const { data, error } = await supabase
      .from('contacts')
      .update({ status: 'active', inactive_since: null, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ contact: data })
  } catch (err) {
    console.error('PATCH /contacts/:id/reactivate error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ============================================================
// POST /api/contacts/bulk-deactivate  — { ids: [...] }
// ============================================================
router.post('/bulk-deactivate', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array requerido' })
    }

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('contacts')
      .update({ status: 'inactive', inactive_since: now, updated_at: now })
      .eq('tenant_id', req.tenantId)
      .in('id', ids)
      .select('id')

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ deactivated: data?.length ?? 0 })
  } catch (err) {
    console.error('POST /contacts/bulk-deactivate error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ============================================================
// POST /api/contacts/bulk-reactivate  — { ids: [...] }
// ============================================================
router.post('/bulk-reactivate', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array requerido' })
    }

    const { data, error } = await supabase
      .from('contacts')
      .update({ status: 'active', inactive_since: null, updated_at: new Date().toISOString() })
      .eq('tenant_id', req.tenantId)
      .in('id', ids)
      .select('id')

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ reactivated: data?.length ?? 0 })
  } catch (err) {
    console.error('POST /contacts/bulk-reactivate error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ============================================================
// DELETE /api/contacts/all  — borra TODOS los contactos del tenant (sin IDs)
router.delete('/all', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .delete()
      .eq('tenant_id', req.tenantId)
      .select('id')
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ deleted: data?.length ?? 0 })
  } catch (err) {
    console.error('DELETE /contacts/all error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// DELETE /api/contacts/bulk-delete  — { ids: [...] }  (permanent)
// ============================================================
router.delete('/bulk-delete', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array requerido' })
    }

    const { data, error } = await supabase
      .from('contacts')
      .delete()
      .eq('tenant_id', req.tenantId)
      .in('id', ids)
      .select('id')

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ deleted: data?.length ?? 0 })
  } catch (err) {
    console.error('DELETE /contacts/bulk-delete error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ============================================================
// POST /api/contacts/sync  — multipart, file upload (padron sync)
// Returns diff and applies changes in one step
// ============================================================
router.post(
  '/sync',
  authMiddleware,
  inferTenantGuard,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' })

      const ext = path.extname(req.file.originalname).toLowerCase()
      const fileType = ext === '.csv' ? 'csv' : 'xlsx'

      // Parse the uploaded file
      const rows = parseContactFile(req.file.buffer, fileType)
      if (!rows.length) {
        return res.status(400).json({ error: 'El archivo no contiene contactos válidos o falta la columna de teléfono' })
      }

      // Build set of phones in the file
      const incomingPhones = new Set(rows.map(r => r.telefono))

      // Get all existing contacts for this tenant (active + inactive)
      const { data: existingContacts } = await supabase
        .from('contacts')
        .select('id, telefono, nombre, apellido, grupo, status')
        .eq('tenant_id', req.tenantId)

      const existingByPhone = new Map()
      for (const c of (existingContacts || [])) {
        existingByPhone.set(c.telefono, c)
      }

      // Compute diff
      const toCreate = []
      const toUpdate = []
      const toDeactivate = []

      // New or update
      for (const row of rows) {
        const existing = existingByPhone.get(row.telefono)
        if (!existing) {
          toCreate.push(row)
        } else if (existing.status === 'inactive') {
          // Re-activate contact that appears again in the padron
          toUpdate.push({ id: existing.id, reactivate: true, ...row })
        } else {
          // Active contact — update name/group/alumno if changed
          const changed = (
            (row.nombre && row.nombre !== existing.nombre) ||
            (row.apellido && row.apellido !== existing.apellido) ||
            (row.grupo && row.grupo !== existing.grupo) ||
            (row.nombre_alumno && row.nombre_alumno !== existing.nombre_alumno)
          )
          if (changed) toUpdate.push({ id: existing.id, reactivate: false, ...row })
        }
      }

      // Deactivate: active contacts NOT in the incoming file
      for (const c of (existingContacts || [])) {
        if (c.status === 'active' && !incomingPhones.has(c.telefono)) {
          toDeactivate.push(c.id)
        }
      }

      const now = new Date().toISOString()

      // Apply: create new contacts
      if (toCreate.length) {
        await supabase.from('contacts').insert(
          toCreate.map(r => ({
            tenant_id: req.tenantId,
            nombre: r.nombre || 'Sin nombre',
            apellido: r.apellido || null,
            telefono: r.telefono,
            grupo: r.grupo || null,
            nombre_alumno: r.nombre_alumno || null,
            status: 'active'
          }))
        )
      }

      // Apply: update existing contacts
      for (const r of toUpdate) {
        const patch = { updated_at: now }
        if (r.reactivate) { patch.status = 'active'; patch.inactive_since = null }
        if (r.nombre) patch.nombre = r.nombre
        if (r.apellido) patch.apellido = r.apellido
        if (r.grupo) patch.grupo = r.grupo
        if (r.nombre_alumno) patch.nombre_alumno = r.nombre_alumno
        await supabase.from('contacts').update(patch).eq('id', r.id)
      }

      // Apply: deactivate missing contacts
      if (toDeactivate.length) {
        await supabase
          .from('contacts')
          .update({ status: 'inactive', inactive_since: now, updated_at: now })
          .in('id', toDeactivate)
      }

      // Auto-cleanup: delete contacts past grace period
      const cleaned = await runGracePeriodCleanup(req.tenantId)

      return res.json({
        created:     toCreate.length,
        updated:     toUpdate.filter(r => !r.reactivate).length,
        reactivated: toUpdate.filter(r => r.reactivate).length,
        deactivated: toDeactivate.length,
        deleted:     cleaned
      })
    } catch (err) {
      console.error('POST /contacts/sync error:', err)
      return res.status(500).json({ error: err.message })
    }
  }
)

// ============================================================
// POST /api/contacts/cleanup  — manual grace-period cleanup
// ============================================================
router.post('/cleanup', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const deleted = await runGracePeriodCleanup(req.tenantId)
    return res.json({ deleted })
  } catch (err) {
    console.error('POST /contacts/cleanup error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ============================================================
// FAMILY STRUCTURE — Link parents/guardians to students
// ============================================================

// GET /api/contacts/families/search?q=Perez%20Hernandez
// Search families by name, return students + parents for each family
router.get('/families/search', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { q } = req.query
    if (!q || q.trim().length === 0) {
      return res.json({ families: [] })
    }

    const searchTerm = `%${q.trim()}%`

    // Paso 1: familias que coinciden. Se buscan las FAMILIAS y no los contactos
    // sueltos porque quien recibe el WhatsApp es el papá/mamá: si alguien busca
    // a un alumno espera que el mensaje llegue a sus papás, no que no llegue a
    // nadie.
    //
    // El filtrado se hace en memoria y no con ILIKE porque ILIKE respeta los
    // acentos: buscar "sarachaga" no encontraría a "Saráchaga", y nadie escribe
    // los acentos al buscar. Se traen solo las cuatro columnas de texto, así
    // que es una consulta ligera aunque el padrón tenga miles de contactos.
    const { data: candidatos, error: cErr } = await supabase
      .from('contacts')
      .select('nombre_familia, nombre_alumno, nombre, apellido')
      .eq('tenant_id', req.tenantId)
      .neq('status', 'inactive')
      .not('nombre_familia', 'is', null)
    if (cErr) throw cErr

    const aguja = sinAcentos(q)
    const familias = [...new Set(
      (candidatos || [])
        .filter(c =>
          sinAcentos(c.nombre_familia).includes(aguja) ||
          sinAcentos(c.nombre_alumno).includes(aguja)  ||
          sinAcentos(c.nombre).includes(aguja)         ||
          sinAcentos(c.apellido).includes(aguja)
        )
        .map(c => c.nombre_familia)
        .filter(Boolean)
    )]
    if (familias.length === 0) return res.json({ families: [] })

    // Paso 2: traer TODOS los integrantes de esas familias
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('id, nombre, apellido, telefono, nombre_alumno, grado, salon, relationship_type, status, nombre_familia')
      .eq('tenant_id', req.tenantId)
      .in('nombre_familia', familias)
      .neq('status', 'inactive')
      .order('relationship_type, nombre_alumno', { ascending: true })

    if (error) throw error

    // Group by familia and separate students from parents
    const familiesMap = {}
    for (const contact of contacts || []) {
      const familyKey = contact.nombre_familia
      if (!familiesMap[familyKey]) {
        familiesMap[familyKey] = {
          nombre_familia: familyKey,
          estudiantes: [],
          papas: []
        }
      }

      if (contact.relationship_type === 'student') {
        familiesMap[familyKey].estudiantes.push({
          id: contact.id,
          nombre: contact.nombre,
          apellido: contact.apellido,
          nombre_alumno: contact.nombre_alumno,
          grado: contact.grado,
          salon: contact.salon
        })
      } else {
        familiesMap[familyKey].papas.push({
          id: contact.id,
          nombre: contact.nombre,
          apellido: contact.apellido,
          telefono: contact.telefono,
          relationship_type: contact.relationship_type
        })
      }
    }

    const families = Object.values(familiesMap)
    return res.json({ families })
  } catch (err) {
    console.error('GET /families/search error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// GET /api/contacts/family/by-student/:studentName
// Get all family members (parents/guardians) for a student
router.get('/family/by-student/:studentName', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { studentName } = req.params
    const { data: family, error } = await supabase
      .from('contacts')
      .select('id, nombre, apellido, telefono, relationship_type, status')
      .eq('tenant_id', req.tenantId)
      .eq('nombre_alumno', studentName)
      .neq('relationship_type', 'student')
      .not('student_id', 'is', null)
      .order('relationship_type', { ascending: true })

    if (error) throw error
    return res.json({ family: family || [] })
  } catch (err) {
    console.error('GET /family/by-student error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/contacts/:contactId/link-student
// Link a parent/guardian to a student
router.post('/:contactId/link-student', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { contactId } = req.params
    const { studentId, relationshipType } = req.body

    if (!studentId || !relationshipType) {
      return res.status(400).json({ error: 'studentId and relationshipType required' })
    }

    if (!['papa', 'mama', 'tutor', 'otro'].includes(relationshipType)) {
      return res.status(400).json({ error: 'Invalid relationshipType' })
    }

    // Verify both contacts exist and belong to same tenant
    const [contactErr, studentErr] = await Promise.all([
      supabase.from('contacts').select('id').eq('id', contactId).eq('tenant_id', req.tenantId).single(),
      supabase.from('contacts').select('id').eq('id', studentId).eq('tenant_id', req.tenantId).single()
    ])

    if (contactErr || studentErr) {
      return res.status(404).json({ error: 'Contact or student not found' })
    }

    const { data, error } = await supabase
      .from('contacts')
      .update({
        student_id: studentId,
        relationship_type: relationshipType,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId)
      .select()
      .single()

    if (error) throw error
    return res.json({ contact: data })
  } catch (err) {
    console.error('POST /link-student error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// GET /api/contacts/:studentId/family
// Get all family members for a student by student contact ID
router.get('/:studentId/family', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { studentId } = req.params
    const { data: family, error } = await supabase
      .from('contacts')
      .select('id, nombre, apellido, telefono, relationship_type, status')
      .eq('tenant_id', req.tenantId)
      .eq('student_id', studentId)
      .order('relationship_type', { ascending: true })

    if (error) throw error
    return res.json({ family: family || [] })
  } catch (err) {
    console.error('GET /:studentId/family error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/contacts/:contactId/unlink-student
// Unlink a parent/guardian from a student
router.post('/:contactId/unlink-student', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { contactId } = req.params

    const { data, error } = await supabase
      .from('contacts')
      .update({
        student_id: null,
        relationship_type: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId)
      .eq('tenant_id', req.tenantId)
      .select()
      .single()

    if (error) throw error
    return res.json({ contact: data })
  } catch (err) {
    console.error('POST /unlink-student error:', err)
    return res.status(500).json({ error: err.message })
  }
})

export default router
