import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { inferTenantGuard } from '../middleware/tenantGuard.js'
import {
  getBroadcastsByTenant,
  createBroadcast,
  updateBroadcast,
  getContactGroupsByTenant,
  getContactsForBroadcast
} from '../services/supabase.js'
import { sendWhatsAppMessage } from '../services/whatsapp.js'
import { buildMessage } from '../templates/messages.js'

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

// GET /api/broadcasts/preview — count contacts for a group
router.get('/preview', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { group } = req.query
    const contacts = await getContactsForBroadcast(req.tenantId, group || null)
    return res.json({ count: contacts.length })
  } catch (err) {
    console.error('GET /broadcasts/preview error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/broadcasts — create and send
router.post('/', authMiddleware, inferTenantGuard, async (req, res) => {
  const { title, message, group_filter, media_url, media_type, media_filename } = req.body

  if (!title || !message) {
    return res.status(400).json({ error: 'title and message are required' })
  }

  // Get contacts
  let contacts
  try {
    contacts = await getContactsForBroadcast(req.tenantId, group_filter || null)
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get contacts' })
  }

  if (contacts.length === 0) {
    return res.status(400).json({ error: 'No contacts found for the selected group' })
  }

  // Create broadcast record
  let broadcast
  try {
    broadcast = await createBroadcast({
      tenant_id: req.tenantId,
      title,
      message,
      group_filter: group_filter || null,
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

  for (const contact of contacts) {
    try {
      if (!contact.telefono) { failedCount++; continue }

      // Personalize message with contact name
      const text = message
        .replace(/{nombre}/g, contact.nombre || '')
        .replace(/{grupo}/g, contact.grupo || '')

      const result = await sendWhatsAppMessage(contact.telefono, text)
      if (result.success) {
        sentCount++
      } else {
        failedCount++
        console.error(`Broadcast: failed to send to ${contact.telefono}:`, result.error)
      }

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 150))
    } catch (err) {
      failedCount++
      console.error(`Broadcast: error sending to contact ${contact.id}:`, err)
    }
  }

  // Update broadcast with final stats
  try {
    await updateBroadcast(broadcast.id, {
      sent_count: sentCount,
      failed_count: failedCount,
      status: 'sent'
    })
  } catch (err) {
    console.error('Broadcast: failed to update stats:', err)
  }

  console.log(`Broadcast "${title}": sent ${sentCount}, failed ${failedCount}`)
})

export default router
