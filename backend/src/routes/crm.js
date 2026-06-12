import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import pool from '../services/railwayPg.js'
import { notifyFollowupCreated, notifyFollowupCancelled } from '../services/tappt.js'

const router = Router()
router.use(authMiddleware)

// Personal CRM: the authenticated user's own ID is the tenant scope.
// No multi-tenant lookup needed — this CRM belongs to a single user (NKUVO Labs).
// CRM_ALLOWED_EMAILS (comma-separated) restricts access so Kollybry tenant
// users sharing the same Supabase project can't reach the CRM.
router.use((req, res, next) => {
  if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' })

  const allowed = (process.env.CRM_ALLOWED_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)

  if (allowed.length && !allowed.includes(req.user.email?.toLowerCase())) {
    return res.status(403).json({ error: 'Acceso restringido' })
  }

  req.tenantId = req.user.id
  next()
})

// ── Stats ─────────────────────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  const { tenantId } = req
  try {
    const [clientsRes, followupsRes] = await Promise.all([
      pool.query('SELECT status, prioridad FROM crm_clients WHERE tenant_id = $1', [tenantId]),
      pool.query(
        'SELECT id FROM crm_followups WHERE tenant_id = $1 AND completado = false AND fecha_recordatorio >= NOW()',
        [tenantId]
      )
    ])

    const por_status = {}
    const por_prioridad = {}
    clientsRes.rows.forEach(c => {
      por_status[c.status] = (por_status[c.status] || 0) + 1
      por_prioridad[c.prioridad] = (por_prioridad[c.prioridad] || 0) + 1
    })

    res.json({
      total: clientsRes.rows.length,
      por_status,
      por_prioridad,
      followups_pendientes: followupsRes.rows.length
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Upcoming follow-ups ───────────────────────────────────────────────────────

router.get('/followups/upcoming', async (req, res) => {
  const { tenantId } = req
  try {
    const result = await pool.query(`
      SELECT f.*,
        json_build_object(
          'id',              c.id,
          'razon_social',    c.razon_social,
          'nombre_contacto', c.nombre_contacto
        ) AS crm_clients
      FROM crm_followups f
      JOIN crm_clients c ON c.id = f.client_id
      WHERE f.tenant_id = $1
        AND f.completado = false
        AND f.fecha_recordatorio >= NOW()
      ORDER BY f.fecha_recordatorio ASC
      LIMIT 20
    `, [tenantId])
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Clients list ──────────────────────────────────────────────────────────────

router.get('/clients', async (req, res) => {
  const { tenantId } = req
  const { status, prioridad, q } = req.query

  const conditions = ['tenant_id = $1']
  const values = [tenantId]
  let i = 2

  if (status)   { conditions.push(`status = $${i++}`);              values.push(status) }
  if (prioridad){ conditions.push(`prioridad = $${i++}`);           values.push(prioridad) }
  if (q)        { conditions.push(`razon_social ILIKE $${i++}`);    values.push(`%${q}%`) }

  try {
    const result = await pool.query(
      `SELECT * FROM crm_clients WHERE ${conditions.join(' AND ')} ORDER BY updated_at DESC`,
      values
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Single client ─────────────────────────────────────────────────────────────

router.get('/clients/:id', async (req, res) => {
  const { tenantId } = req
  const { id } = req.params
  try {
    const [clientRes, activitiesRes, followupsRes] = await Promise.all([
      pool.query('SELECT * FROM crm_clients WHERE id = $1 AND tenant_id = $2', [id, tenantId]),
      pool.query('SELECT * FROM crm_activities WHERE client_id = $1 AND tenant_id = $2 ORDER BY fecha DESC', [id, tenantId]),
      pool.query('SELECT * FROM crm_followups WHERE client_id = $1 AND tenant_id = $2 ORDER BY fecha_recordatorio ASC', [id, tenantId])
    ])

    if (!clientRes.rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' })

    res.json({
      ...clientRes.rows[0],
      activities: activitiesRes.rows,
      followups:  followupsRes.rows
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Create client ─────────────────────────────────────────────────────────────

router.post('/clients', async (req, res) => {
  const { tenantId } = req
  const userId = req.user?.id
  const {
    razon_social, nombre_contacto, cargo, telefono, email,
    website, direccion, ciudad, estado, giro, notas, status, prioridad
  } = req.body

  if (!razon_social?.trim()) return res.status(400).json({ error: 'La razón social es requerida' })

  try {
    const result = await pool.query(`
      INSERT INTO crm_clients
        (tenant_id, razon_social, nombre_contacto, cargo, telefono, email,
         website, direccion, ciudad, estado, giro, notas, status, prioridad, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *
    `, [
      tenantId, razon_social.trim(),
      nombre_contacto || null, cargo    || null, telefono  || null,
      email      || null, website  || null, direccion || null,
      ciudad     || null, estado   || null, giro      || null,
      notas      || null, status   || 'prospecto', prioridad || 'media',
      userId
    ])
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Update client ─────────────────────────────────────────────────────────────

router.put('/clients/:id', async (req, res) => {
  const { tenantId } = req
  const { id } = req.params
  const {
    razon_social, nombre_contacto, cargo, telefono, email,
    website, direccion, ciudad, estado, giro, notas, status, prioridad
  } = req.body

  try {
    const result = await pool.query(`
      UPDATE crm_clients SET
        razon_social    = COALESCE($3, razon_social),
        nombre_contacto = $4,
        cargo           = $5,
        telefono        = $6,
        email           = $7,
        website         = $8,
        direccion       = $9,
        ciudad          = $10,
        estado          = $11,
        giro            = $12,
        notas           = $13,
        status          = COALESCE($14, status),
        prioridad       = COALESCE($15, prioridad),
        updated_at      = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [id, tenantId, razon_social, nombre_contacto, cargo, telefono, email,
        website, direccion, ciudad, estado, giro, notas, status, prioridad])

    if (!result.rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Delete client ─────────────────────────────────────────────────────────────

router.delete('/clients/:id', async (req, res) => {
  const { tenantId } = req
  const { id } = req.params
  try {
    await pool.query('DELETE FROM crm_clients WHERE id = $1 AND tenant_id = $2', [id, tenantId])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Log activity ──────────────────────────────────────────────────────────────

router.post('/clients/:id/activities', async (req, res) => {
  const { tenantId } = req
  const userId = req.user?.id
  const { id } = req.params
  const { tipo, descripcion, fecha } = req.body

  if (!tipo) return res.status(400).json({ error: 'El tipo de actividad es requerido' })

  try {
    const result = await pool.query(`
      INSERT INTO crm_activities (client_id, tenant_id, tipo, descripcion, fecha, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id, tenantId, tipo, descripcion || null, fecha || new Date().toISOString(), userId])

    await pool.query('UPDATE crm_clients SET updated_at = NOW() WHERE id = $1', [id])

    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Schedule follow-up ────────────────────────────────────────────────────────

router.post('/clients/:id/followups', async (req, res) => {
  const { tenantId } = req
  const userId = req.user?.id
  const { id } = req.params
  const { fecha_recordatorio, descripcion } = req.body

  if (!fecha_recordatorio || !descripcion?.trim()) {
    return res.status(400).json({ error: 'Fecha y descripción son requeridas' })
  }

  try {
    const result = await pool.query(`
      INSERT INTO crm_followups (client_id, tenant_id, fecha_recordatorio, descripcion, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, tenantId, fecha_recordatorio, descripcion.trim(), userId])

    const followup = result.rows[0]

    // Notificar a Tappt (no bloquea la respuesta)
    const clientRes = await pool.query(
      'SELECT id, razon_social, nombre_contacto, telefono FROM crm_clients WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    )
    notifyFollowupCreated(followup, clientRes.rows[0])

    res.status(201).json(followup)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Toggle follow-up complete ─────────────────────────────────────────────────

router.put('/followups/:id', async (req, res) => {
  const { tenantId } = req
  const { id } = req.params
  const { completado } = req.body

  try {
    const result = await pool.query(`
      UPDATE crm_followups SET completado = $3
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [id, tenantId, Boolean(completado)])

    if (!result.rows[0]) return res.status(404).json({ error: 'Follow-up no encontrado' })

    // Si se marca como completado antes de la fecha, cancelar el recordatorio en Tappt
    if (result.rows[0].completado) notifyFollowupCancelled(id)

    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Delete follow-up ──────────────────────────────────────────────────────────

router.delete('/followups/:id', async (req, res) => {
  const { tenantId } = req
  const { id } = req.params
  try {
    await pool.query('DELETE FROM crm_followups WHERE id = $1 AND tenant_id = $2', [id, tenantId])
    notifyFollowupCancelled(id)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
