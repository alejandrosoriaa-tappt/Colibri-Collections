import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { inferTenantGuard } from '../middleware/tenantGuard.js'
import supabase from '../services/supabase.js'

const router = Router()

router.use(authMiddleware)
router.use(inferTenantGuard)

// ── Stats ─────────────────────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  const { tenantId } = req

  const [clientsRes, followupsRes] = await Promise.all([
    supabase.from('crm_clients').select('status, prioridad').eq('tenant_id', tenantId),
    supabase.from('crm_followups')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('completado', false)
      .gte('fecha_recordatorio', new Date().toISOString())
  ])

  if (clientsRes.error) return res.status(500).json({ error: clientsRes.error.message })

  const clients = clientsRes.data || []
  const por_status = {}
  const por_prioridad = {}

  clients.forEach(c => {
    por_status[c.status] = (por_status[c.status] || 0) + 1
    por_prioridad[c.prioridad] = (por_prioridad[c.prioridad] || 0) + 1
  })

  res.json({
    total: clients.length,
    por_status,
    por_prioridad,
    followups_pendientes: followupsRes.data?.length || 0
  })
})

// ── Upcoming follow-ups ───────────────────────────────────────────────────────

router.get('/followups/upcoming', async (req, res) => {
  const { tenantId } = req

  const { data, error } = await supabase
    .from('crm_followups')
    .select('*, crm_clients(id, razon_social, nombre_contacto)')
    .eq('tenant_id', tenantId)
    .eq('completado', false)
    .gte('fecha_recordatorio', new Date().toISOString())
    .order('fecha_recordatorio', { ascending: true })
    .limit(20)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ── Clients list ──────────────────────────────────────────────────────────────

router.get('/clients', async (req, res) => {
  const { tenantId } = req
  const { status, prioridad, q } = req.query

  let query = supabase
    .from('crm_clients')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (prioridad) query = query.eq('prioridad', prioridad)
  if (q) query = query.ilike('razon_social', `%${q}%`)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ── Single client ─────────────────────────────────────────────────────────────

router.get('/clients/:id', async (req, res) => {
  const { tenantId } = req
  const { id } = req.params

  const [clientRes, activitiesRes, followupsRes] = await Promise.all([
    supabase.from('crm_clients').select('*').eq('id', id).eq('tenant_id', tenantId).single(),
    supabase.from('crm_activities').select('*').eq('client_id', id).eq('tenant_id', tenantId).order('fecha', { ascending: false }),
    supabase.from('crm_followups').select('*').eq('client_id', id).eq('tenant_id', tenantId).order('fecha_recordatorio', { ascending: true })
  ])

  if (clientRes.error) return res.status(404).json({ error: 'Cliente no encontrado' })

  res.json({
    ...clientRes.data,
    activities: activitiesRes.data || [],
    followups: followupsRes.data || []
  })
})

// ── Create client ─────────────────────────────────────────────────────────────

router.post('/clients', async (req, res) => {
  const { tenantId } = req
  const userId = req.user?.id
  const {
    razon_social, nombre_contacto, cargo, telefono, email,
    website, direccion, ciudad, estado, giro, notas, status, prioridad
  } = req.body

  if (!razon_social?.trim()) {
    return res.status(400).json({ error: 'La razón social es requerida' })
  }

  const { data, error } = await supabase
    .from('crm_clients')
    .insert({
      tenant_id: tenantId,
      razon_social: razon_social.trim(),
      nombre_contacto: nombre_contacto || null,
      cargo: cargo || null,
      telefono: telefono || null,
      email: email || null,
      website: website || null,
      direccion: direccion || null,
      ciudad: ciudad || null,
      estado: estado || null,
      giro: giro || null,
      notas: notas || null,
      status: status || 'prospecto',
      prioridad: prioridad || 'media',
      created_by: userId
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// ── Update client ─────────────────────────────────────────────────────────────

router.put('/clients/:id', async (req, res) => {
  const { tenantId } = req
  const { id } = req.params
  const updates = { ...req.body }

  delete updates.id
  delete updates.tenant_id
  delete updates.created_by
  delete updates.created_at
  delete updates.activities
  delete updates.followups
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('crm_clients')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ── Delete client ─────────────────────────────────────────────────────────────

router.delete('/clients/:id', async (req, res) => {
  const { tenantId } = req
  const { id } = req.params

  const { error } = await supabase
    .from('crm_clients')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// ── Log activity ──────────────────────────────────────────────────────────────

router.post('/clients/:id/activities', async (req, res) => {
  const { tenantId } = req
  const userId = req.user?.id
  const { id } = req.params
  const { tipo, descripcion, fecha } = req.body

  if (!tipo) return res.status(400).json({ error: 'El tipo de actividad es requerido' })

  const { data, error } = await supabase
    .from('crm_activities')
    .insert({
      client_id: id,
      tenant_id: tenantId,
      tipo,
      descripcion: descripcion || null,
      fecha: fecha || new Date().toISOString(),
      created_by: userId
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  await supabase
    .from('crm_clients')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  res.status(201).json(data)
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

  const { data, error } = await supabase
    .from('crm_followups')
    .insert({
      client_id: id,
      tenant_id: tenantId,
      fecha_recordatorio,
      descripcion: descripcion.trim(),
      created_by: userId
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// ── Toggle follow-up complete ─────────────────────────────────────────────────

router.put('/followups/:id', async (req, res) => {
  const { tenantId } = req
  const { id } = req.params
  const { completado } = req.body

  const { data, error } = await supabase
    .from('crm_followups')
    .update({ completado: Boolean(completado) })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// ── Delete follow-up ──────────────────────────────────────────────────────────

router.delete('/followups/:id', async (req, res) => {
  const { tenantId } = req
  const { id } = req.params

  const { error } = await supabase
    .from('crm_followups')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

export default router
