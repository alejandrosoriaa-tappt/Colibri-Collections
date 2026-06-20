// ============================================================
// Cobranza por color — sube el reporte de cuentas por cobrar,
// la IA mapea columnas, el código agrupa por color del semáforo
// y crea campañas en borrador (una por color).
// ============================================================
import { Router } from 'express'
import multer from 'multer'
import { authMiddleware } from '../middleware/auth.js'
import { inferTenantGuard } from '../middleware/tenantGuard.js'
import { analyzeCobranzaFile, commitCobranzaCampaigns } from '../services/cobranzaImport.js'
import supabase from '../services/supabase.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

// POST /api/cobranza/analyze — preview por color (NO crea nada)
router.post('/analyze', authMiddleware, inferTenantGuard, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' })
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'La cobranza con IA no está configurada (falta ANTHROPIC_API_KEY)' })
    }
    const result = await analyzeCobranzaFile(req.file.buffer, req.tenantId)
    return res.json(result)
  } catch (err) {
    console.error('POST /cobranza/analyze error:', err)
    return res.status(500).json({ error: 'No se pudo analizar el reporte: ' + err.message })
  }
})

// GET /api/cobranza/templates — plantillas guardadas del tenant por color
router.get('/templates', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cobranza_color_templates')
      .select('color, name, concept, message')
      .eq('tenant_id', req.tenantId)
    if (error) throw error
    // Devuelve un mapa color → { name, concept, message }
    const map = {}
    for (const t of data || []) map[t.color] = { name: t.name, concept: t.concept, message: t.message }
    return res.json({ templates: map })
  } catch (err) {
    console.error('GET /cobranza/templates error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/cobranza/commit — crea las campañas en borrador confirmadas
router.post('/commit', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { campaigns } = req.body
    if (!Array.isArray(campaigns) || campaigns.length === 0) {
      return res.status(400).json({ error: 'No hay campañas para crear' })
    }
    const result = await commitCobranzaCampaigns(req.tenantId, campaigns)

    // Guardar/actualizar plantillas para que se recuerden en el futuro
    for (const c of campaigns) {
      if (!c.color || !c.name) continue
      await supabase.from('cobranza_color_templates').upsert({
        tenant_id: req.tenantId,
        color: c.color,
        name: c.name,
        concept: c.concept || '',
        message: c.message || '',
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id,color' })
    }

    return res.json(result)
  } catch (err) {
    console.error('POST /cobranza/commit error:', err)
    return res.status(500).json({ error: err.message })
  }
})

export default router
