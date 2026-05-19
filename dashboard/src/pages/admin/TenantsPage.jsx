import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Loader2, Plus, Send, Building2,
  AlertCircle, CheckCircle2, X
} from 'lucide-react'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { adminAPI } from '../../lib/api.js'

const EMPTY_FORM = {
  name: '',
  display_name: '',
  slug: '',
  plan: 'basic',
  status: 'trial',
  admin_phone: '',
  payment_link_general: '',
  subscription_amount: ''
}

const PLANS = ['basic', 'pro', 'enterprise']
const STATUSES = ['trial', 'active', 'suspended', 'cancelled']

function TenantForm({ initial, onSave, onCancel, isSaving, error }) {
  const [form, setForm] = useState(initial || EMPTY_FORM)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...form,
      subscription_amount: form.subscription_amount ? Number(form.subscription_amount) : 0
    })
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Nombre interno *</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
        </div>
        <div>
          <label className="label">Nombre a mostrar *</label>
          <input className="input" value={form.display_name} onChange={e => set('display_name', e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Slug (URL) *</label>
          <input
            className="input font-mono"
            value={form.slug}
            onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            required
            placeholder="mi-empresa"
          />
        </div>
        <div>
          <label className="label">Teléfono admin</label>
          <input className="input" value={form.admin_phone} onChange={e => set('admin_phone', e.target.value)} placeholder="+521XXXXXXXXXX" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Plan</label>
          <select className="input" value={form.plan} onChange={e => set('plan', e.target.value)}>
            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Estado</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Liga de pago general</label>
          <input className="input" value={form.payment_link_general} onChange={e => set('payment_link_general', e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <label className="label">Cuota mensual (MXN)</label>
          <input type="number" className="input" value={form.subscription_amount} onChange={e => set('subscription_amount', e.target.value)} placeholder="0" />
        </div>
      </div>

      <div className="flex gap-3">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary flex-1">
            Cancelar
          </button>
        )}
        <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={isSaving}>
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isSaving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

export default function TenantsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tenant, setTenant] = useState(null)
  const [tenants, setTenants] = useState([])
  const [isLoading, setIsLoading] = useState(!!id)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [msg, setMsg] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [msgSent, setMsgSent] = useState(false)

  useEffect(() => {
    if (id) {
      adminAPI.getTenant(id)
        .then(res => setTenant(res.data.tenant))
        .catch(console.error)
        .finally(() => setIsLoading(false))
    } else {
      adminAPI.listTenants()
        .then(res => setTenants(res.data.tenants || []))
        .catch(console.error)
        .finally(() => setIsLoading(false))
      setIsLoading(false)
    }
  }, [id])

  const handleCreate = async (data) => {
    setIsSaving(true)
    setFormError(null)
    try {
      await adminAPI.createTenant(data)
      setShowCreate(false)
      const res = await adminAPI.listTenants()
      setTenants(res.data.tenants || [])
    } catch (err) {
      setFormError(err.response?.data?.error || err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = async (data) => {
    setIsSaving(true)
    setFormError(null)
    try {
      const res = await adminAPI.updateTenant(id, data)
      setTenant(res.data.tenant)
    } catch (err) {
      setFormError(err.response?.data?.error || err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendMessage = async () => {
    if (!msg.trim() || !id) return
    setSendingMsg(true)
    try {
      await adminAPI.sendMessage(id, msg.trim())
      setMsg('')
      setMsgSent(true)
      setTimeout(() => setMsgSent(false), 3000)
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    } finally {
      setSendingMsg(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="text-colibri animate-spin" />
      </div>
    )
  }

  // Detail view
  if (id && tenant) {
    return (
      <div className="space-y-6 max-w-2xl">
        <button onClick={() => navigate('/admin')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> Admin
        </button>

        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{tenant.display_name || tenant.name}</h1>
          <StatusBadge status={tenant.status} />
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Editar tenant</h2>
          <TenantForm
            initial={tenant}
            onSave={handleUpdate}
            isSaving={isSaving}
            error={formError}
          />
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Enviar mensaje al admin</h2>
          {msgSent && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl mb-3">
              <CheckCircle2 size={15} className="text-green-600" />
              <p className="text-sm text-green-700">Mensaje enviado al admin</p>
            </div>
          )}
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Mensaje para el admin via WhatsApp..."
              value={msg}
              onChange={e => setMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={sendingMsg || !msg.trim()}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              {sendingMsg ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Enviar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-gray-500 text-sm mt-1">{tenants.length} organizaciones</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={15} /> Nuevo tenant
        </button>
      </div>

      {showCreate && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Crear tenant</h2>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <TenantForm
            onSave={handleCreate}
            onCancel={() => setShowCreate(false)}
            isSaving={isSaving}
            error={formError}
          />
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {tenants.length === 0 ? (
          <div className="text-center py-12">
            <Building2 size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay tenants</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tenants.map(t => (
              <div
                key={t.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/admin/tenants/${t.id}`)}
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.display_name || t.name}</p>
                  <p className="text-xs text-gray-400">{t.slug} · {t.plan}</p>
                </div>
                <StatusBadge status={t.status} size="xs" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
