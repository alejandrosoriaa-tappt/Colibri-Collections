import { Router } from 'express'
import multer from 'multer'
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
import supabase from '../services/supabase.js'
import { sendWhatsAppTemplate } from '../services/whatsapp.js'
import {
  TEMPLATE_NAMES,
  comunicadoComponents,
  comunicadoImagenComponents
} from '../templates/whatsappTemplates.js'

const router = Router()

const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
})

// POST /api/broadcasts/media — upload an attachment to Supabase Storage,
// returns a public URL the broadcast can reference (media_url)
router.post('/media', authMiddleware, inferTenantGuard, mediaUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' })

    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Solo PDF o imágenes (JPG, PNG, WEBP)' })
    }

    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${req.tenantId}/${Date.now()}-${safeName}`

    const { error: upErr } = await supabase.storage
      .from('broadcast-media')
      .upload(path, req.file.buffer, { contentType: req.file.mimetype })
    if (upErr) throw upErr

    const { data: pub } = supabase.storage.from('broadcast-media').getPublicUrl(path)
    return res.json({
      url: pub.publicUrl,
      type: req.file.mimetype,
      filename: req.file.originalname
    })
  } catch (err) {
    console.error('POST /broadcasts/media error:', err)
    return res.status(500).json({ error: 'Error al subir el archivo' })
  }
})

// GET /api/broadcasts
router.get('/', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (Number(page) - 1) * Number(limit)
    const { data, count } = await getBroadcastsByTenant(req.tenantId, {
      limit: Number(limit),
      offset
    })

    // Aggregate delivery/read KPIs from message_logs per broadcast.
    // (clicked_count needs a link-redirect tracker; WhatsApp doesn't report clicks.)
    const ids = (data || []).map(b => b.id)
    const stats = {}
    if (ids.length > 0) {
      const { data: logs, error: logErr } = await supabase
        .from('message_logs')
        .select('broadcast_id, status, delivered_at, read_at')
        .in('broadcast_id', ids)
      if (!logErr) {
        for (const l of logs || []) {
          const s = stats[l.broadcast_id] || (stats[l.broadcast_id] = { delivered: 0, read: 0 })
          // status is the source of truth (webhook always updates it);
          // timestamps were only added later, so use both. read ⇒ delivered.
          const isRead = !!l.read_at || l.status === 'read'
          const isDelivered = isRead || !!l.delivered_at || l.status === 'delivered'
          if (isRead) s.read++
          if (isDelivered) s.delivered++
        }
      }
    }

    const broadcasts = (data || []).map(b => ({
      ...b,
      delivered_count: stats[b.id]?.delivered || 0,
      read_count: stats[b.id]?.read || 0,
      clicked_count: 0
    }))

    return res.json({ broadcasts, total: count })
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

// GET /api/broadcasts/preview — count + recipient list for group(s)
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
    // Return the recipients so the UI can show who will receive the message
    const recipients = contacts.slice(0, 200).map(c => ({
      id: c.id,
      nombre: c.nombre,
      apellido: c.apellido || '',
      telefono: c.telefono,
      grupo: c.grupo || null
    }))
    return res.json({ count: contacts.length, contacts: recipients })
  } catch (err) {
    console.error('GET /broadcasts/preview error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/broadcasts — create and send
router.post('/', authMiddleware, inferTenantGuard, async (req, res) => {
  const { title, message, group_filter, group_filters, contact_ids, media_url, media_type, media_filename } = req.body

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
    if (Array.isArray(contact_ids) && contact_ids.length > 0) {
      // Direct send to specific contacts (e.g. one family from the Contactos page)
      const { data, error } = await supabase
        .from('contacts')
        .select('id, nombre, apellido, telefono, grupo')
        .eq('tenant_id', req.tenantId)
        .eq('status', 'active')
        .in('id', contact_ids)
        .not('telefono', 'is', null)
        .neq('telefono', '')
      if (error) throw error
      contacts = data
    } else {
      contacts = await getContactsForBroadcast(req.tenantId, effectiveFilter)
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get contacts' })
  }

  if (contacts.length === 0) {
    return res.status(400).json({ error: 'No hay contactos con teléfono en la selección' })
  }

  // Label for display — for contact_ids sends the frontend passes a label in group_filter
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

  // Determine which template to use. Text comunicados go out as UTILITY
  // (kollybry_comunicado_util) so they're exempt from Meta's per-user
  // marketing frequency cap; the image template only exists as MARKETING.
  const useImage = !!(media_url && media_type?.startsWith('image'))
  const tpl = useImage ? TEMPLATE_NAMES.COMUNICADO_IMAGEN : TEMPLATE_NAMES.COMUNICADO_UTIL

  for (const contact of contacts) {
    try {
      if (!contact.telefono) { failedCount++; continue }

      // Substitute {nombre}, {apellido}, {nombre_completo} in the message body
      const nombre = contact.nombre || ''
      const apellido = contact.apellido || ''
      let personalizedMessage = message
        .replace(/\{nombre_completo\}/gi, [nombre, apellido].filter(Boolean).join(' '))
        .replace(/\{nombre\}/gi, nombre)
        .replace(/\{apellido\}/gi, apellido)

      // Meta rejects template body params containing newlines, tabs, or 4+
      // consecutive spaces (error 132018). Collapse all whitespace to single spaces.
      personalizedMessage = personalizedMessage.replace(/\s+/g, ' ').trim()

      // Non-image attachments (e.g. PDF) ride inside the body as a link —
      // only images get their own template header (comunicado_imagen)
      if (media_url && !useImage) {
        personalizedMessage = `${personalizedMessage} 📎 Documento: ${media_url}`
      }

      const components = useImage
        ? comunicadoImagenComponents({ titulo: title, orgName, cuerpo: personalizedMessage, imageUrl: media_url })
        : comunicadoComponents({ titulo: title, orgName, cuerpo: personalizedMessage })

      // Each template carries its own Meta-registered language code (tpl.lang)
      const result = await sendWhatsAppTemplate(contact.telefono, tpl.name, tpl.lang, components)
      if (result.success) {
        sentCount++
        console.log(`Broadcast: ✓ sent to ${contact.telefono} (${contact.nombre})`)

        // Log the message in message_logs table
        try {
          await supabase.from('message_logs').insert({
            tenant_id: req.tenantId,
            contact_id: contact.id,
            broadcast_id: broadcast.id,
            phone: contact.telefono,
            wa_message_id: result.wa_message_id,
            type: 'broadcast',
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          console.log(`Broadcast: logged message for ${contact.telefono}`)
        } catch (logErr) {
          console.error(`Broadcast: failed to log message for contact ${contact.id}:`, logErr)
        }
      } else {
        failedCount++
        console.error(`Broadcast: ✗ failed ${contact.telefono} — code:${result.error_code} msg:${result.error}`)

        // Log the failed message
        try {
          await supabase.from('message_logs').insert({
            tenant_id: req.tenantId,
            contact_id: contact.id,
            broadcast_id: broadcast.id,
            phone: contact.telefono,
            type: 'broadcast',
            status: 'failed',
            error_message: result.error,
            sent_at: new Date().toISOString()
          })
        } catch (logErr) {
          console.error(`Broadcast: failed to log error for contact ${contact.id}:`, logErr)
        }
      }

      await new Promise(r => setTimeout(r, 150))
    } catch (err) {
      failedCount++
      console.error(`Broadcast: error sending to contact ${contact.id}:`, err)

      // Log the error
      try {
        await supabase.from('message_logs').insert({
          tenant_id: req.tenantId,
          contact_id: contact.id,
          broadcast_id: broadcast.id,
          type: 'broadcast',
          status: 'failed',
          error_message: err.message,
          sent_at: new Date().toISOString()
        })
      } catch (logErr) {
        console.error(`Broadcast: failed to log exception for contact ${contact.id}:`, logErr)
      }
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
