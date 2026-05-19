import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { inferTenantGuard } from '../middleware/tenantGuard.js'
import { getSystemNotifications, markNotificationRead } from '../services/supabase.js'
import supabase from '../services/supabase.js'

const router = Router()

// GET /api/notifications
router.get('/', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    const notifications = await getSystemNotifications(req.tenantId, {
      limit: Number(limit),
      offset
    })

    // Get unread count
    const { count } = await supabase
      .from('system_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', req.tenantId)
      .eq('read', false)

    return res.json({ notifications, unread_count: count || 0 })
  } catch (err) {
    console.error('GET /notifications error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    // Verify notification belongs to tenant
    const { data: notif, error: fetchError } = await supabase
      .from('system_notifications')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !notif) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    if (!req.isAdmin && notif.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const updated = await markNotificationRead(req.params.id)
    return res.json({ notification: updated })
  } catch (err) {
    console.error('PATCH /notifications/:id/read error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/notifications/mark-all-read
router.post('/mark-all-read', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { error } = await supabase
      .from('system_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('tenant_id', req.tenantId)
      .eq('read', false)

    if (error) return res.status(500).json({ error: error.message })

    return res.json({ success: true })
  } catch (err) {
    console.error('POST /notifications/mark-all-read error:', err)
    return res.status(500).json({ error: err.message })
  }
})

export default router
