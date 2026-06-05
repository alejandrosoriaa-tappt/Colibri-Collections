import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { inferTenantGuard } from '../middleware/tenantGuard.js'
import {
  getBroadcastsByTenant,
  createBroadcast,
  updateBroadcast,
  getContactGroupsByTenant,
  getContactsForBroadcast,
  getTenant
} from '../services/supabase.js'
import { sendWhatsAppTemplate } from '../services/whatsapp.js'
import {
  TEMPLATE_NAMES,
  comunicadoComponents,
  comunicadoImagenComponents
} from '../templates/whatsappTemplates.js'

const router = Router()

// GET /api/broadcasts
router.get('/', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (Number(page) - 1) * Number(limit)
    const { data, count } = await getBroadcastsByTenant(req.tenantId, {
      limit: Number(limit),
      offset
    })
    return res.json({ broadcasts: data, total: count })
  } catch (err) {
    console.error('GET /broadcasts error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// GET /api/broadcasts/groups — available groups for this tenant
router.get('/groups', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const groups = await getContactGroupsByTenant(req.tenantId)
    return res.json({ groups })
  } catch (err) {
    console.error('GET /broadcasts/groups error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// GET /api/broadcasts/preview — count contacts for group(s)
router.get('/preview', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    // group can be a single string or comma-separated list
    const { group } = req.query
    let groupFilter = null
    if (group) {
      const parts = group.split(',').map(s => s.trim()).filter(Boolean)
      groupFilter = parts.length === 1 ? parts[0] : parts
    }
    const contacts = await getContactsForBroadcast(req.tenantId, groupFilter)
    return res.json({ count: contacts.length })
  } catch (err) {
    console.error('GET /broadcasts/preview error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/broadcasts — create and send
router.post('/', authMiddleware, inferTenantGuard, async (req, res) => {
  const { title, message, group_filter, group_filters, media_url, media_type, media_filename } = req.body

  if (!title || !message) {
    return res.status(400).json({ error: 'title and message are required' })
  }

  // Support both group_filters (array) and legacy group_filter (string)
  let effectiveFilter = null
  if (Array.isArray(group_filters) && group_filters.length > 0) {
    effectiveFilter = group_filters
  } else if (group_filter) {
    effectiveFilter = group_filter
  }

  // Get contacts
  let contacts
  try {
    contacts = await getContactsForBroadcast(req.tenantId, effectiveFilter)
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get contacts' })
  }

  if (contacts.length === 0) {
    return res.status(400).json({ error: 'No hay contactos en el grupo seleccionado' })
  }

  // Label for display
  const groupLabel = Array.isArray(effectiveFilter)
    ? effectiveFilter.join(', ')
    : (effectiveFilter || null)

  // Create broadcast record
  let broadcast
  try {
    broadcast = await createBroadcast({
      tenant_id: req.tenantId,
      title,
      message,
      group_filter: groupLabel,
      media_url: media_url || null,
      media_type: media_type || null,
      media_filename: media_filename || null,
      total_contacts: contacts.length,
      sent_count: 0,
      failed_count: 0,
      status: 'sending'
    })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create broadcast' })
  }

  // Respond immediately so UI doesn't hang
  res.json({ broadcast, sending: true })

  // Send messages in background
  let sentCount = 0
  let failedCount = 0

  // Check credentials once before loop
  const phoneNumberId = process.env.WABA_PHONE_NUMBER_ID
  const accessToken = process.env.WABA_ACCESS_TOKEN
  if (!phoneNumberId || !accessToken) {
    console.error(`Broadcast "${title}": WhatsApp credentials not configured (WABA_PHONE_NUMBER_ID or WABA_ACCESS_TOKEN missing)`)
    await updateBroadcast(broadcast.id, { sent_count: 0, failed_count: contacts.length, status: 'sent' }).catch(() => {})
    return
  }

  // Get tenant name for template
  let orgName = ''
  try {
    const tenant = await getTenant(req.tenantId)
    orgName = tenant?.display_name || tenant?.name || ''
  } catch (e) {
    console.warn('Broadcast: could not load tenant name:', e.message)
  }

  // Determine which template to use
  const useImage = !!(media_url && media_type?.startsWith('image'))
  const tpl = useImage ? TEMPLATE_NAMES.COMUNICADO_IMAGEN : TEMPLATE_NAMES.COMUNICADO

  for (const contact of contacts) {
    try {
      if (!contact.telefono) { failedCount++; continue }

      // Substitute {nombre}, {apellido}, {nombre_completo} in the message body
      const nombre = contact.nombre || ''
      const apellido = contact.apellido || ''
      const personalizedMessage = message
        .replace(/\{nombre_completo\}/gi, [nombre, apellido].filter(Boolean).join(' '))
        .replace(/\{nombre\}/gi, nombre)
        .replace(/\{apellido\}/gi, apellido)

      // Append document/link URL to the body when it's not an image
      const isDocument = media_url && !media_type?.startsWith('image')
      const withLink = isDocument
        ? `${personalizedMessage} 🔗 ${media_url}`
        : personalizedMessage

      // Meta error 132018: template params cannot have \n, \r, \t or 4+ consecutive spaces
      const cuerpoFinal = withLink
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/ {4,}/g, '   ')

      const components = useImage
        ? comunicadoImagenComponents({ titulo: title, orgName, cuerpo: cuerpoFinal, imageUrl: media_url })
        : comunicadoComponents({ titulo: title, orgName, cuerpo: cuerpoFinal })

      const result = await sendWhatsAppTemplate(contact.telefono, tpl.name, tpl.lang, components)
      if (result.success) {
        sentCount++
        console.log(`Broadcast: ✓ sent to ${contact.telefono} (${contact.nombre})`)
      } else {
        failedCount++
        console.error(`Broadcast: ✗ failed ${contact.telefono} — code:${result.error_code} msg:${result.error}`)
      }

      await new Promise(r => setTimeout(r, 150))
    } catch (err) {
      failedCount++
      console.error(`Broadcast: error sending to contact ${contact.id}:`, err)
    }
  }

  try {
    await updateBroadcast(broadcast.id, {
      sent_count: sentCount,
      failed_count: failedCount,
      status: 'sent'
    })
  } catch (err) {
    console.error('Broadcast: failed to update stats:', err)
  }

  console.log(`Broadcast "${title}": sent ${sentCount}, failed ${failedCount} of ${contacts.length}`)
})

export default router
