import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { authMiddleware } from '../middleware/auth.js'
import { inferTenantGuard } from '../middleware/tenantGuard.js'
import supabase, { createFileUpload, getCampaign } from '../services/supabase.js'
import { processFile, generateLayoutBuffer } from '../services/fileProcessor.js'

const router = Router()

const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv'
    ]
    const allowedExts = ['.xlsx', '.xls', '.csv']
    const ext = path.extname(file.originalname).toLowerCase()

    if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
      return cb(null, true)
    }
    cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'))
  }
})

// GET /api/upload/layout — generate and return Excel layout
router.get('/layout', authMiddleware, async (req, res) => {
  try {
    const buffer = generateLayoutBuffer()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="colibri_layout.xlsx"')
    return res.send(buffer)
  } catch (err) {
    console.error('GET /upload/layout error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// GET /api/upload/:id — status
router.get('/:id', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { data: upload, error } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error || !upload) {
      return res.status(404).json({ error: 'Upload not found' })
    }

    if (!req.isAdmin && upload.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    return res.json({ upload })
  } catch (err) {
    console.error('GET /upload/:id error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/upload — multipart/form-data
router.post(
  '/',
  authMiddleware,
  inferTenantGuard,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }

      const { campaign_id } = req.body
      if (!campaign_id) {
        return res.status(400).json({ error: 'campaign_id is required' })
      }

      // Verify campaign belongs to tenant
      const campaign = await getCampaign(campaign_id)
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' })
      }

      if (!req.isAdmin && campaign.tenant_id !== req.tenantId) {
        return res.status(403).json({ error: 'Access denied' })
      }

      // Determine file type
      const ext = path.extname(req.file.originalname).toLowerCase()
      const fileType = ext === '.csv' ? 'csv' : 'xlsx'

      // Create file upload record
      const fileUploadRecord = await createFileUpload({
        tenant_id: req.tenantId,
        campaign_id,
        filename: req.file.originalname,
        file_type: fileType,
        file_size: req.file.size,
        status: 'processing',
        uploaded_by: req.user.id,
        created_at: new Date().toISOString()
      })

      // Process file
      const result = await processFile({
        fileBuffer: req.file.buffer,
        fileType,
        campaignId: campaign_id,
        tenantId: req.tenantId,
        fileUploadId: fileUploadRecord.id
      })

      return res.status(200).json({
        upload_id: fileUploadRecord.id,
        total: result.total,
        valid: result.valid,
        errors: result.errors,
        error_details: result.errorDetails,
        message: `Processed ${result.valid} contacts successfully${result.errors > 0 ? ` with ${result.errors} errors` : ''}`
      })
    } catch (err) {
      console.error('POST /upload error:', err)
      return res.status(500).json({ error: err.message })
    }
  }
)

export default router
