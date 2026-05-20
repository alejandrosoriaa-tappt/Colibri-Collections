import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { inferTenantGuard } from '../middleware/tenantGuard.js'
import { getMessageLogs } from '../services/supabase.js'

const router = Router()

// GET /api/messages
router.get('/', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const {
      campaign_id,
      contact_id,
      status,
      phone,
      page = 1,
      limit = 50
    } = req.query

    const offset = (Number(page) - 1) * Number(limit)

    const { data: messages, count } = await getMessageLogs({
      tenantId: req.tenantId,
      campaignId: campaign_id || null,
      contactId: contact_id || null,
      phone: phone || null,
      limit: Number(limit),
      offset
    })

    const filtered = status ? messages.filter(m => m.status === status) : messages

    return res.json({ messages: filtered, total: count })
  } catch (err) {
    console.error('GET /messages error:', err)
    return res.status(500).json({ error: err.message })
  }
})

export default router
