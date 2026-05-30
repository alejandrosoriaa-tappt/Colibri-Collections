import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import * as XLSX from 'xlsx'
import { parse as csvParse } from 'csv-parse/sync'
import { authMiddleware } from '../middleware/auth.js'
import { inferTenantGuard } from '../middleware/tenantGuard.js'
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
// GET /api/contacts  — ?status=active|inactive|all
// ============================================================
router.get('/', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { search, page = 1, limit = 50, status = 'active' } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    const { data: contacts, count } = await getContactsByTenant(req.tenantId, {
      search,
      status,
      limit: Number(limit),
      offset
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
function buildGrupo({ org_type, grupo, seccion, grado, salon, torre, num_interior, fraccionamiento }) {
  if (org_type === 'colegio' || org_type === 'academia') {
    const parts = [seccion, grado, salon].filter(Boolean)
    return parts.length ? parts.join(' ') : grupo || null
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
      nombre_alumno, org_type
    } = req.body

    if (!nombre || !telefono) {
      return res.status(400).json({ error: 'nombre y telefono son obligatorios' })
    }

    const phone = telefono.trim().replace(/\s+/g, '')
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
        seccion: seccion?.trim() || null,
        grado: grado?.trim() || null,
        salon: salon?.trim() || null,
        fraccionamiento: fraccionamiento?.trim() || null,
        torre: torre?.trim() || null,
        num_interior: num_interior?.trim() || null,
        nombre_alumno: nombre_alumno?.trim() || null,
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

    return res.status(201).json({ contact: data })
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

export default router
