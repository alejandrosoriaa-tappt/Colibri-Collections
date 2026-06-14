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

// POST /api/cobranza/commit — crea las campañas en borrador confirmadas
router.post('/commit', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { campaigns } = req.body
    if (!Array.isArray(campaigns) || campaigns.length === 0) {
      return res.status(400).json({ error: 'No hay campañas para crear' })
    }
    const result = await commitCobranzaCampaigns(req.tenantId, campaigns)
    return res.json(result)
  } catch (err) {
    console.error('POST /cobranza/commit error:', err)
    return res.status(500).json({ error: err.message })
  }
})

export default router
