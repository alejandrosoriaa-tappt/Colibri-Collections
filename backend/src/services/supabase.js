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
    .select('*, contacts(id, nombre, apellido, telefono, grupo), campaigns(id, name, concept)')

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

export async function getContactsByTenant(tenantId, { search, status = 'active', limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from('contacts')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('nombre', { ascending: true })
    .range(offset, offset + limit - 1)

  // Status filter: 'active' | 'inactive' | 'all'
  if (status !== 'all') {
    query = query.eq('status', status)
  }

  if (search) {
    query = query.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%,telefono.ilike.%${search}%,nombre_alumno.ilike.%${search}%`)
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
  const { data, error } = await supabase
    .from('contacts')
    .select('seccion, grado, salon, grupo')
    .eq('tenant_id', tenantId)
    .neq('status', 'inactive')
  if (error) throw error

  // Build group names from normalized structure
  const groups = new Set()
  data.forEach(c => {
    // New structure: seccion + grado + salon
    if (c.seccion && c.grado && c.salon) {
      groups.add(`${c.seccion} ${c.grado} ${c.salon}`)
    } else if (c.seccion && c.grado) {
      groups.add(`${c.seccion} ${c.grado}`)
    }
    // Fallback to old structure: grupo or grado
    else if (c.grupo) {
      groups.add(c.grupo)
    } else if (c.grado) {
      groups.add(c.grado)
    }
  })

  return [...groups].sort()
}

export async function getContactsForBroadcast(tenantId, groupFilter = null) {
  let query = supabase
    .from('contacts')
    .select('id, nombre, telefono, seccion, grado, salon, grupo')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .not('telefono', 'is', null)
    .neq('telefono', '')

  if (Array.isArray(groupFilter) && groupFilter.length > 0) {
    // Match against normalized group names: "Primaria 1ro A", "Secundaria 3ro B", etc.
    const orConditions = groupFilter.map(groupName => {
      // Parse group name like "Primaria 1ro A" into parts
      const parts = groupName.trim().split(/\s+/)
      const salon = parts[parts.length - 1] // Last part is usually salon letter
      const grado = parts[parts.length - 2] // Second to last is grado
      const seccion = parts.slice(0, -2).join(' ') // Everything else is seccion

      // Build OR condition for this group
      if (seccion && grado && salon) {
        return `(seccion.eq."${seccion}",grado.eq."${grado}",salon.eq."${salon}")`
      } else if (seccion && grado) {
        return `(seccion.eq."${seccion}",grado.eq."${grado}")`
      } else {
        // Fallback to old system
        return `(grupo.eq."${groupName}",grado.eq."${groupName}")`
      }
    }).join(',')

    query = query.or(orConditions)
  } else if (typeof groupFilter === 'string' && groupFilter) {
    // Single group filter
    const parts = groupFilter.trim().split(/\s+/)
    const salon = parts[parts.length - 1]
    const grado = parts[parts.length - 2]
    const seccion = parts.slice(0, -2).join(' ')

    if (seccion && grado && salon) {
      query = query.or(`(seccion.eq."${seccion}",grado.eq."${grado}",salon.eq."${salon}"),(grupo.eq."${groupFilter}"),(grado.eq."${groupFilter}")`)
    } else {
      query = query.or(`grupo.eq."${groupFilter}",grado.eq."${groupFilter}"`)
    }
  }

  const { data, error } = await query
  if (error) throw error
  return data
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
