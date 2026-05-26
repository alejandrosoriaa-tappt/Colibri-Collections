import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { initScheduler } from './services/scheduler.js'

// Route imports
import authRouter from './routes/auth.js'
import campaignsRouter from './routes/campaigns.js'
import contactsRouter from './routes/contacts.js'
import invoicesRouter from './routes/invoices.js'
import uploadRouter from './routes/upload.js'
import messagesRouter from './routes/messages.js'
import notificationsRouter from './routes/notifications.js'
import webhooksRouter from './routes/webhooks.js'
import adminRouter from './routes/admin.js'

const app = express()
const PORT = process.env.PORT || 3000

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false
}))

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)
    // Allow any Railway app URL
    if (origin.endsWith('.up.railway.app')) return callback(null, true)
    // Allow explicitly listed origins
    if (allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error(`CORS: Origin ${origin} not allowed`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
})
app.use(limiter)

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts' }
})

// Body parsing — webhooks need raw body for signature verification
app.use('/api/webhooks', express.raw({ type: 'application/json' }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'colibri-backend',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  })
})

// Routes
app.use('/api/auth', authLimiter, authRouter)
app.use('/api/campaigns', campaignsRouter)
app.use('/api/contacts', contactsRouter)
app.use('/api/invoices', invoicesRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/messages', messagesRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/webhooks', webhooksRouter)
app.use('/api/admin', adminRouter)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' })
  }

  if (err.message?.includes('Only Excel')) {
    return res.status(400).json({ error: err.message })
  }

  return res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`Colibrí Backend running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`Health check: http://localhost:${PORT}/health`)

  // Initialize scheduler
  initScheduler()
})

export default app
