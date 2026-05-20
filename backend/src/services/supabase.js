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

export async function getTenantByUser(userId) {
  const { data, error } = await supabase
    .from('tenant_users')
    .select('tenant_id, role, tenants(*)')
    .eq('user_id', userId)
    .single()
  if (error) throw error
  return data
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

export async function getContactsByTenant(tenantId, { search, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from('contacts')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('nombre', { ascending: true })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%,telefono.ilike.%${search}%`)
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
  return data
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
