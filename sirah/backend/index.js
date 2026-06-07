const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

const { createTablesIfNotExist } = require('./db');
const apiRoutes = require('./routes/api');
const { errorHandler, loggerMiddleware } = require('./middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : null; // null = permitir todos (útil en Railway sin configurar la variable)

app.use(cors({
  origin: (origin, cb) => {
    // Sin ALLOWED_ORIGINS configurado → abrir para todos (Railway, Vercel, dev)
    if (!allowedOrigins) return cb(null, true);
    // Con origen no definido (curl, Postman, server-to-server) → permitir
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

// ─── Middlewares ────────────────────────────────────────────────────────────
app.use(loggerMiddleware);
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'SIRAH Backend',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: true, message: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// ─── Error handler ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────────────────────
async function start() {
  try {
    await createTablesIfNotExist();
    console.log('✓ Base de datos verificada');

    app.listen(PORT, () => {
      console.log(`✓ SIRAH Backend corriendo en http://localhost:${PORT}`);
      console.log(`✓ Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Health: http://localhost:${PORT}/health`);
      console.log(`📂 API:    http://localhost:${PORT}/api/expedientes`);
    });
  } catch (err) {
    console.error('✗ Error fatal al iniciar:', err.message);
    process.exit(1);
  }
}

start();
