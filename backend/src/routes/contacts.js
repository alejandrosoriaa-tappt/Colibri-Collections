import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { inferTenantGuard } from '../middleware/tenantGuard.js'
import supabase, {
  getContactsByTenant,
  getContact,
  getInvoicesByContact,
  getMessageLogs
} from '../services/supabase.js'

const router = Router()

// GET /api/contacts
router.get('/', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    const { data: contacts, count } = await getContactsByTenant(req.tenantId, {
      search,
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

// GET /api/contacts/:id
router.get('/:id', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const contact = await getContact(req.params.id)

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' })
    }

    if (!req.isAdmin && contact.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Get invoices and message logs in parallel
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

// POST /api/contacts — create a single contact manually
router.post('/', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { nombre, apellido, telefono, grupo, id_externo, payment_link } = req.body

    if (!nombre || !telefono) {
      return res.status(400).json({ error: 'nombre y telefono son obligatorios' })
    }

    // Normalize phone: strip spaces, ensure +52 prefix
    const phone = telefono.trim().replace(/\s+/g, '')

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        tenant_id: req.tenantId,
        nombre: nombre.trim(),
        apellido: apellido?.trim() || null,
        telefono: phone,
        grupo: grupo?.trim() || null,
        id_externo: id_externo?.trim() || null,
        payment_link: payment_link?.trim() || null,
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

// PATCH /api/contacts/:id
router.patch('/:id', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const contact = await getContact(req.params.id)

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' })
    }

    if (!req.isAdmin && contact.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const allowedFields = ['nombre', 'apellido', 'telefono', 'grupo', 'id_externo', 'status']
    const updates = {}
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field]
      }
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.json({ contact: data })
  } catch (err) {
    console.error('PATCH /contacts/:id error:', err)
    return res.status(500).json({ error: err.message })
  }
})

export default router
