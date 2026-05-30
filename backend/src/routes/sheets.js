/**
 * /api/sheets — Google Sheets integration
 *
 * GET  /api/sheets/preview?url=... → preview without writing to DB
 * POST /api/sheets/import          → full import into a campaign
 */
import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { inferTenantGuard } from '../middleware/tenantGuard.js'
import { previewSheet, importSheet } from '../services/sheetsService.js'
import supabase from '../services/supabase.js'

const router = Router()

// GET /api/sheets/preview?url=...
router.get('/preview', authMiddleware, inferTenantGuard, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'Parámetro url requerido' })

  try {
    const preview = await previewSheet(decodeURIComponent(url))
    return res.json(preview)
  } catch (err) {
    console.error('GET /sheets/preview error:', err.message)
    return res.status(400).json({ error: err.message })
  }
})

// POST /api/sheets/import
router.post('/import', authMiddleware, inferTenantGuard, async (req, res) => {
  const { url, campaign_id } = req.body
  if (!url)         return res.status(400).json({ error: 'Campo url requerido' })
  if (!campaign_id) return res.status(400).json({ error: 'Campo campaign_id requerido' })

  // Verify campaign belongs to this tenant
  const { data: campaign, error: campErr } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', campaign_id)
    .eq('tenant_id', req.tenantId)
    .single()

  if (campErr || !campaign) {
    return res.status(404).json({ error: 'Campaña no encontrada' })
  }

  try {
    const result = await importSheet(url, campaign_id, req.tenantId)
    return res.json(result)
  } catch (err) {
    console.error('POST /sheets/import error:', err.message)
    return res.status(400).json({ error: err.message })
  }
})

export default router
