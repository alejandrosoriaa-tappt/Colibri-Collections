import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export default supabase

export async function getActiveCampaigns() {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*, tenants(id, name, display_name, admin_phone, payment_link_general, slug)')
    .eq('status', 'active')
  if (error) throw error
  return data
}

export async function getCampaignMessages(campaignId) {
  const { data, error } = await supabase
    .from('campaign_messages')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('message_number', { ascending: true })
  if (error) throw error
  return data
}

export async function getInvoices({ campaign_id, status } = {}) {
  let query = supabase
    .from('invoices')
    .select('*, contacts(id, nombre, apellido, telefono, grupo, nombre_alumno), campaigns(id, name, concept)')

  if (campaign_id) query = query.eq('campaign_id', campaign_id)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getContact(contactId) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single()
  if (error) throw error
  return data
}

export async function getTenant(tenantId) {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single()
  if (error) throw error
  return data
}

export async function getActiveTenants() {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .in('status', ['active', 'trial'])
  if (error) throw error
  return data
}

export async function updateInvoice(id, updates) {
  const { data, error } = await supabase
    .from('invoices')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCampaignMessage(id, updates) {
  const { data, error } = await supabase
    .from('campaign_messages')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function logMessage(data) {
  const { data: result, error } = await supabase
    .from('message_logs')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return result
}

export async function getPendingCount(campaignId) {
  const { count, error } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')
  if (error) throw error
  return count
}

export async function upsertContact(tenantId, contactData) {
  const { data, error } = await supabase
    .from('contacts')
    .upsert(
      { tenant_id: tenantId, ...contactData, updated_at: new Date().toISOString() },
      { onConflict: 'tenant_id,telefono', ignoreDuplicates: false }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function upsertInvoice(campaignId, contactId, tenantId, data) {
  const { data: result, error } = await supabase
    .from('invoices')
    .upsert(
      {
        campaign_id: campaignId,
        contact_id: contactId,
        tenant_id: tenantId,
        ...data,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'campaign_id,contact_id', ignoreDuplicates: false }
    )
    .select()
    .single()
  if (error) throw error
  return result
}

export async function updateCampaignStats(campaignId) {
  const { data: invoices, error: invError } = await supabase
    .from('invoices')
    .select('status, monto')
    .eq('campaign_id', campaignId)
  if (invError) throw invError

  const total = invoices.length
  const paid = invoices.filter(i => i.status === 'paid').length
  const pending = invoices.filter(i => i.status === 'pending').length
  const totalAmount = invoices.reduce((sum, i) => sum + Number(i.monto || 0), 0)
  const paidAmount = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + Number(i.monto || 0), 0)

  const { data, error } = await supabase
    .from('campaigns')
    .update({
      total_contacts: total,
      paid_count: paid,
      pending_count: pending,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      updated_at: new Date().toISOString()
    })
    .eq('id', campaignId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createFileUpload(data) {
  const { data: result, error } = await supabase
    .from('file_uploads')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return result
}

export async function updateFileUpload(id, data) {
  const { data: result, error } = await supabase
    .from('file_uploads')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return result
}

export async function markInvoicePaid(id, { reference, notes }) {
  const { data, error } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_reference: reference || null,
      notes: notes || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Maps legacy role names to the current RBAC roles.
 * Legacy schema used: 'owner' | 'admin' | 'member'
 * Current RBAC uses:  'owner' | 'billing' | 'comms'
 */
export function normalizeRole(role) {
  const legacyMap = { admin: 'owner', member: 'comms' }
  return legacyMap[role] ?? role ?? null
}

export async function getTenantByUser(userId) {
  const { data, error } = await supabase
    .from('tenant_users')
    .select('tenant_id, role, tenants(*)')
    .eq('user_id', userId)
    .single()
  if (error) throw error
  if (!data) return data
  return { ...data, role: normalizeRole(data.role) }
}

export async function isAdminUser(userId) {
  const { data, error } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return !!data
}

export async function getSystemNotifications(tenantId, { limit = 20, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from('tenant_notifications')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return data
}

export async function markNotificationRead(id) {
  const { data, error } = await supabase
    .from('tenant_notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getMessageLogs({ tenantId, campaignId, contactId, phone, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from('message_logs')
    .select('*, contacts(id, nombre, apellido, telefono), campaigns(id, name)', { count: 'exact' })
    .order('sent_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (tenantId) query = query.eq('tenant_id', tenantId)
  if (campaignId) query = query.eq('campaign_id', campaignId)
  if (contactId) query = query.eq('contact_id', contactId)
  if (phone) query = query.ilike('phone', `%${phone}%`)

  const { data, error, count } = await query
  if (error) throw error
  return { data, count }
}

export async function getAllTenants() {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createTenant(data) {
  const { data: result, error } = await supabase
    .from('tenants')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return result
}

export async function updateTenant(id, data) {
  const { data: result, error } = await supabase
    .from('tenants')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return result
}

export async function getCampaign(campaignId) {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*, tenants(id, name, display_name, admin_phone, payment_link_general)')
    .eq('id', campaignId)
    .single()
  if (error) throw error
  return data
}

export async function getContactsByTenant(tenantId, { search, status = 'active', limit = 50, offset = 0, seccion, grado, salon } = {}) {
  const hasSchoolFilter = seccion || grado || salon

  // School filters live on the student contact. We resolve the matching
  // nombre_familia values first, then fetch ALL family members so the
  // frontend can show complete family rows (mamá + papá + alumno).
  let familyNames = null
  if (hasSchoolFilter) {
    let sq = supabase
      .from('contacts')
      .select('nombre_familia')
      .eq('tenant_id', tenantId)
      .eq('relationship_type', 'student')
      .not('nombre_familia', 'is', null)
    if (seccion) sq = sq.eq('seccion', seccion)
    if (grado)   sq = sq.eq('grado', grado)
    if (salon)   sq = sq.eq('salon', salon)
    const { data: students, error: sErr } = await sq
    if (sErr) throw sErr
    familyNames = [...new Set((students || []).map(s => s.nombre_familia).filter(Boolean))]
    if (familyNames.length === 0) return { data: [], count: 0 }
  }

  let query = supabase
    .from('contacts')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('nombre', { ascending: true })
    .range(offset, offset + limit - 1)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  if (search) {
    query = query.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%,telefono.ilike.%${search}%,nombre_alumno.ilike.%${search}%`)
  }

  if (familyNames) {
    query = query.in('nombre_familia', familyNames)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data, count }
}

export async function getCampaignsByTenant(tenantId) {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  if (error) throw error

  if (!data || data.length === 0) return data

  const campaignIds = data.map(c => c.id)
  const { data: logs } = await supabase
    .from('message_logs')
    .select('campaign_id, status')
    .in('campaign_id', campaignIds)

  const statsByCampaign = {}
  for (const log of logs || []) {
    if (!statsByCampaign[log.campaign_id]) {
      statsByCampaign[log.campaign_id] = { sent: 0, delivered: 0, read: 0, failed: 0 }
    }
    const s = statsByCampaign[log.campaign_id]
    if (['sent', 'delivered', 'read'].includes(log.status)) s.sent++
    if (['delivered', 'read'].includes(log.status)) s.delivered++
    if (log.status === 'read') s.read++
    if (log.status === 'failed') s.failed++
  }

  return data.map(c => ({ ...c, msg_stats: statsByCampaign[c.id] || { sent: 0, delivered: 0, read: 0, failed: 0 } }))
}

export async function getInvoicesByContact(contactId) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, campaigns(id, name, concept, cycle_start_date)')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ================================================================
// BROADCASTS
// ================================================================

export async function getBroadcastsByTenant(tenantId, { limit = 50, offset = 0 } = {}) {
  const { data, count, error } = await supabase
    .from('broadcasts')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return { data, count }
}

export async function createBroadcast(data) {
  const { data: broadcast, error } = await supabase
    .from('broadcasts')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return broadcast
}

export async function updateBroadcast(id, updates) {
  const { data, error } = await supabase
    .from('broadcasts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getContactGroupsByTenant(tenantId) {
  // grupo is now always built consistently ("Seccion Grado Salon") by the
  // backend, so the dropdown can rely on it directly.
  const { data, error } = await supabase
    .from('contacts')
    .select('grupo')
    .eq('tenant_id', tenantId)
    .neq('status', 'inactive')
    .not('grupo', 'is', null)
    .neq('grupo', '')
  if (error) throw error
  const groups = [...new Set(data.map(c => c.grupo).filter(Boolean))].sort()
  return groups
}

export async function getContactsForBroadcast(tenantId, groupFilter = null) {
  // Normalize filter to an array of group names (or null = everyone)
  let groups = null
  if (Array.isArray(groupFilter) && groupFilter.length > 0) groups = groupFilter
  else if (typeof groupFilter === 'string' && groupFilter) groups = [groupFilter]

  // No filter → everyone active with a phone
  if (!groups) {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, nombre, apellido, telefono, grupo')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .not('telefono', 'is', null)
      .neq('telefono', '')
    if (error) throw error
    return data
  }

  // Filtered by school group(s). In schools the grade lives on the STUDENT
  // (who usually has no phone), so we must resolve students → their parents
  // (linked by nombre_familia) and message the parents' phones.
  const { data: matched, error: mErr } = await supabase
    .from('contacts')
    .select('id, nombre, apellido, telefono, grupo, relationship_type, nombre_familia')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .in('grupo', groups)
  if (mErr) throw mErr

  const byPhone = new Map()
  const families = new Set()

  for (const c of matched) {
    if (c.relationship_type === 'student') {
      if (c.nombre_familia) families.add(c.nombre_familia)
      // a student WITH a phone also gets included directly
      if (c.telefono) byPhone.set(c.telefono, { id: c.id, nombre: c.nombre, apellido: c.apellido, telefono: c.telefono, grupo: c.grupo })
    } else if (c.telefono) {
      // non-student directly tagged with the group (e.g. standalone parent)
      byPhone.set(c.telefono, { id: c.id, nombre: c.nombre, apellido: c.apellido, telefono: c.telefono, grupo: c.grupo })
    }
  }

  // Pull parents/guardians of the matched students' families
  if (families.size > 0) {
    const { data: parents, error: pErr } = await supabase
      .from('contacts')
      .select('id, nombre, apellido, telefono, grupo, relationship_type, nombre_familia')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .in('nombre_familia', [...families])
      .neq('relationship_type', 'student')
      .not('telefono', 'is', null)
      .neq('telefono', '')
    if (pErr) throw pErr
    for (const p of parents) {
      if (!byPhone.has(p.telefono)) {
        byPhone.set(p.telefono, { id: p.id, nombre: p.nombre, apellido: p.apellido, telefono: p.telefono, grupo: p.grupo })
      }
    }
  }

  return [...byPhone.values()]
}

// ================================================================
// FAMILY STRUCTURE
// ================================================================

/**
 * Get all family members (parents/guardians) for a student
 * @param tenantId - tenant UUID
 * @param studentId - student contact ID
 * @returns array of family contacts with relationship type
 */
export async function getStudentFamily(tenantId, studentId) {
  const { data, error } = await supabase
    .from('contacts')
    .select('id, nombre, apellido, telefono, relationship_type, priority, status')
    .eq('tenant_id', tenantId)
    .eq('student_id', studentId)
    .neq('status', 'inactive')
    .order('priority', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get all family members by student name (nombre_alumno)
 * Useful for campaigns where you search by student name
 */
export async function getStudentFamilyByName(tenantId, studentName) {
  const { data, error } = await supabase
    .from('contacts')
    .select('id, nombre, apellido, telefono, relationship_type, priority, status, nombre_alumno')
    .eq('tenant_id', tenantId)
    .eq('nombre_alumno', studentName)
    .not('student_id', 'is', null)
    .neq('relationship_type', 'student')
    .neq('status', 'inactive')
    .order('priority', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get all students (contacts with nombre_alumno) for a tenant
 * Used to populate student selectors in campaign creation
 */
export async function getStudentsByTenant(tenantId, { limit = 100, offset = 0 } = {}) {
  const { data, count, error } = await supabase
    .from('contacts')
    .select('id, nombre_alumno, grupo, nombre', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .not('nombre_alumno', 'is', null)
    .neq('nombre_alumno', '')
    .neq('status', 'inactive')
    .order('nombre_alumno', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return { data, count }
}
