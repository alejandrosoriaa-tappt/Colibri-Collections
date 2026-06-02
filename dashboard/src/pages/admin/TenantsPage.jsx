import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Loader2, Plus, Send, Building2,
  AlertCircle, CheckCircle2, X, UserPlus, RefreshCw,
  Eye, EyeOff, Copy, Check, MessageSquare, Sparkles
} from 'lucide-react'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { adminAPI } from '../../lib/api.js'
import { ORG_TYPE_OPTIONS } from '../../config/orgTypeConfig.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

function generatePassword() {
  const words = ['Kolibri', 'Kllybry', 'Mensajes', 'Aviso', 'Comunica']
  const word = words[Math.floor(Math.random() * words.length)]
  const num = Math.floor(100 + Math.random() * 900)
  const symbols = ['!', '@', '#', '*']
  const sym = symbols[Math.floor(Math.random() * symbols.length)]
  return `${word}${num}${sym}`
}

function slugify(str) {
  return str.toLowerCase().replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e')
    .replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u')
    .replace(/[ñ]/g, 'n').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const PLANS = ['basic', 'pro', 'enterprise']
const STATUSES = ['trial', 'active', 'suspended', 'cancelled']
const ORG_TYPES = ORG_TYPE_OPTIONS

// ─── Onboarding Modal ────────────────────────────────────────────────────────

function OnboardModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    org_name: '',
    email: '',
    admin_phone: '',
    plan: 'basic',
    org_type: 'general',
    password: generatePassword(),
    send_whatsapp: true
  })
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleCopy = () => {
    navigator.clipboard.writeText(form.password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await adminAPI.onboard({
        org_name: form.org_name.trim(),
        display_name: form.org_name.trim(),
        slug: slugify(form.org_name),
        plan: form.plan,
        org_type: form.org_type,
        admin_phone: form.admin_phone.trim() || null,
        email: form.email.trim(),
        password: form.password,
        send_whatsapp: form.send_whatsapp
      })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Success screen ──
  if (result) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center text-center pt-2 pb-4">
          <div className="w-14 h-14 rounded-full bg-md-primary-container flex items-center justify-center mb-3">
            <CheckCircle2 size={28} className="text-md-on-primary-container" />
          </div>
          <h3 className="text-lg font-semibold text-md-on-surface">¡Cliente registrado!</h3>
          <p className="text-sm text-md-on-surface-variant mt-1">
            {result.tenant.display_name} ya tiene acceso a Kollybry
          </p>
        </div>

        <div className="bg-md-surface-container rounded-2xl p-4 space-y-2 text-sm">
          <Row label="Organización" value={result.tenant.display_name} />
          <Row label="Email" value={result.user.email} />
          <Row label="Contraseña temporal" value={form.password} mono />
          <Row label="Plan" value={result.tenant.plan} />
          {result.whatsapp_sent && (
            <div className="flex items-center gap-2 pt-2 border-t border-md-outline-variant text-green-700">
              <MessageSquare size={14} />
              <span className="text-xs">WhatsApp de bienvenida enviado ✓</span>
            </div>
          )}
          {!result.whatsapp_sent && form.admin_phone && (
            <div className="flex items-center gap-2 pt-2 border-t border-md-outline-variant text-md-on-surface-variant">
              <MessageSquare size={14} />
              <span className="text-xs">WhatsApp no enviado (verifica credenciales WA)</span>
            </div>
          )}
        </div>

        <button onClick={() => { onSuccess(); onClose() }} className="btn-primary w-full">
          Listo
        </button>
      </div>
    )
  }

  // ── Form ──
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-3 p-3 bg-md-error-container rounded-2xl">
          <AlertCircle size={15} className="text-md-on-error-container flex-shrink-0 mt-0.5" />
          <p className="text-sm text-md-on-error-container">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Nombre de la organización *</label>
          <input
            className="input"
            value={form.org_name}
            onChange={set('org_name')}
            placeholder="Ej. Colegio Las Américas"
            required autoFocus
          />
        </div>
        <div>
          <label className="label">Tipo de organización</label>
          <select className="input" value={form.org_type} onChange={set('org_type')}>
            {ORG_TYPES.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Email del admin *</label>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="director@empresa.com"
            required
          />
        </div>
        <div>
          <label className="label">WhatsApp del admin</label>
          <input
            className="input"
            value={form.admin_phone}
            onChange={set('admin_phone')}
            placeholder="+521XXXXXXXXXX"
          />
        </div>
      </div>

      <div>
        <label className="label">Plan</label>
        <div className="flex gap-2">
          {PLANS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setForm(f => ({ ...f, plan: p }))}
              className={`flex-1 py-2 rounded-full text-sm font-medium border transition-colors ${
                form.plan === p
                  ? 'bg-md-primary-container text-md-on-primary-container border-md-primary-container'
                  : 'border-md-outline text-md-on-surface-variant hover:bg-md-surface-container'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="label mb-0">Contraseña temporal *</label>
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, password: generatePassword() }))}
            className="text-xs text-md-primary flex items-center gap-1 hover:underline"
          >
            <RefreshCw size={11} /> Generar nueva
          </button>
        </div>
        <div className="relative">
          <input
            className="input pr-20 font-mono text-sm"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={set('password')}
            required
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            <button type="button" onClick={handleCopy}
              className="p-1.5 rounded-lg text-md-on-surface-variant hover:text-md-on-surface transition-colors"
              title="Copiar">
              {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            </button>
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="p-1.5 rounded-lg text-md-on-surface-variant hover:text-md-on-surface transition-colors">
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <p className="text-xs text-md-on-surface-variant mt-1.5">
          El cliente la cambia en Configuración al primer acceso
        </p>
      </div>

      {/* Send WhatsApp toggle */}
      <label className="flex items-center gap-3 p-3 rounded-2xl bg-md-surface-container cursor-pointer">
        <div
          onClick={() => setForm(f => ({ ...f, send_whatsapp: !f.send_whatsapp }))}
          className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${
            form.send_whatsapp ? 'bg-md-primary' : 'bg-md-outline'
          }`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            form.send_whatsapp ? 'translate-x-5' : 'translate-x-1'
          }`} />
        </div>
        <div>
          <p className="text-sm font-medium text-md-on-surface">Enviar WhatsApp de bienvenida</p>
          <p className="text-xs text-md-on-surface-variant">Manda credenciales al número del admin</p>
        </div>
      </label>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-outline flex-1">
          Cancelar
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {saving ? 'Creando...' : 'Crear cliente'}
        </button>
      </div>
    </form>
  )
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-md-on-surface-variant flex-shrink-0">{label}</span>
      <span className={`text-md-on-surface truncate text-right ${mono ? 'font-mono text-xs' : 'font-medium'}`}>
        {value}
      </span>
    </div>
  )
}

// ─── Tenant Form ─────────────────────────────────────────────────────────────

function TenantForm({ initial, onSave, onCancel, isSaving, error }) {
  const EMPTY = { name: '', display_name: '', slug: '', plan: 'basic', status: 'trial', admin_phone: '', payment_link_general: '', subscription_amount: '' }
  const [form, setForm] = useState(initial || EMPTY)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ ...form, subscription_amount: form.subscription_amount ? Number(form.subscription_amount) : 0 }) }} className="space-y-4">
      {error && (
        <div className="flex items-start gap-3 p-3 bg-md-error-container rounded-2xl">
          <AlertCircle size={15} className="text-md-on-error-container flex-shrink-0 mt-0.5" />
          <p className="text-sm text-md-on-error-container">{error}</p>
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
          <label className="label">Slug (URL)</label>
          <input className="input font-mono" value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="mi-empresa" />
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
        {onCancel && <button type="button" onClick={onCancel} className="btn-outline flex-1">Cancelar</button>}
        <button type="submit" className="btn-primary flex-1" disabled={isSaving}>
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isSaving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TenantsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tenant, setTenant] = useState(null)
  const [tenants, setTenants] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [showOnboard, setShowOnboard] = useState(false)
  const [msg, setMsg] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [msgSent, setMsgSent] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendResult, setResendResult] = useState(null) // 'ok' | 'error'

  const loadTenants = () =>
    adminAPI.listTenants()
      .then(res => setTenants(res.data.tenants || []))
      .catch(console.error)
      .finally(() => setIsLoading(false))

  useEffect(() => {
    if (id) {
      adminAPI.getTenant(id)
        .then(res => setTenant(res.data.tenant))
        .catch(console.error)
        .finally(() => setIsLoading(false))
    } else {
      loadTenants()
    }
  }, [id])

  const handleUpdate = async (data) => {
    setIsSaving(true); setFormError(null)
    try {
      const res = await adminAPI.updateTenant(id, data)
      setTenant(res.data.tenant)
    } catch (err) {
      setFormError(err.response?.data?.error || err.message)
    } finally { setIsSaving(false) }
  }

  const handleResendWelcome = async () => {
    setResending(true); setResendResult(null)
    try {
      const res = await adminAPI.resendWelcome(id)
      setResendResult(res.data.success ? 'ok' : 'error')
    } catch {
      setResendResult('error')
    } finally {
      setResending(false)
      setTimeout(() => setResendResult(null), 4000)
    }
  }

  const handleSendMessage = async () => {
    if (!msg.trim() || !id) return
    setSendingMsg(true)
    try {
      await adminAPI.sendMessage(id, msg.trim())
      setMsg(''); setMsgSent(true)
      setTimeout(() => setMsgSent(false), 3000)
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    } finally { setSendingMsg(false) }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="text-md-primary animate-spin" />
      </div>
    )
  }

  // ── Detail view ──
  if (id && tenant) {
    return (
      <div className="space-y-5 max-w-2xl">
        <button onClick={() => navigate('/admin/tenants')} className="flex items-center gap-1 text-sm text-md-on-surface-variant hover:text-md-on-surface">
          <ArrowLeft size={16} /> Tenants
        </button>

        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-md-on-surface">{tenant.display_name || tenant.name}</h1>
          <StatusBadge status={tenant.status} />
          <span
            className={`text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
              tenant.whatsapp_confirmed_at
                ? 'bg-green-100 text-green-700'
                : 'bg-md-surface-container text-md-on-surface-variant'
            }`}
          >
            <MessageSquare size={11} />
            {tenant.whatsapp_confirmed_at
              ? `WA confirmado ${new Date(tenant.whatsapp_confirmed_at).toLocaleDateString('es-MX')}`
              : 'WA pendiente'}
          </span>
        </div>

        {/* Resend welcome WhatsApp */}
        {tenant.admin_phone && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleResendWelcome}
              disabled={resending}
              className="btn-outline text-sm flex items-center gap-2"
            >
              {resending
                ? <Loader2 size={13} className="animate-spin" />
                : <MessageSquare size={13} />}
              {resending ? 'Enviando...' : 'Reenviar WhatsApp de bienvenida'}
            </button>
            {resendResult === 'ok' && (
              <span className="text-xs text-green-700 flex items-center gap-1">
                <CheckCircle2 size={13} /> Enviado ✓
              </span>
            )}
            {resendResult === 'error' && (
              <span className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle size={13} /> Error al enviar
              </span>
            )}
          </div>
        )}

        <div className="card">
          <h2 className="text-base font-semibold text-md-on-surface mb-4">Editar organización</h2>
          <TenantForm initial={tenant} onSave={handleUpdate} isSaving={isSaving} error={formError} />
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-md-on-surface mb-4">Enviar mensaje al admin</h2>
          {msgSent && (
            <div className="flex items-center gap-2 p-3 bg-md-primary-container rounded-2xl mb-3">
              <CheckCircle2 size={15} className="text-md-on-primary-container" />
              <p className="text-sm text-md-on-primary-container">Mensaje enviado al admin</p>
            </div>
          )}
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Mensaje via WhatsApp al número admin..."
              value={msg}
              onChange={e => setMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            />
            <button onClick={handleSendMessage} disabled={sendingMsg || !msg.trim()} className="btn-primary text-sm">
              {sendingMsg ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Enviar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── List view ──
  return (
    <div className="space-y-5 max-w-3xl">

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-md-on-surface">Clientes</h1>
          <p className="text-sm text-md-on-surface-variant mt-0.5">{tenants.length} organizaciones registradas</p>
        </div>
        <button onClick={() => setShowOnboard(true)} className="btn-primary text-sm">
          <UserPlus size={15} />
          Nuevo cliente
        </button>
      </div>

      {/* Onboard Modal */}
      {showOnboard && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowOnboard(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-md3-5 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white rounded-t-3xl px-6 pt-5 pb-4 border-b border-md-outline-variant flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-md-on-surface">Nuevo cliente</h2>
                  <p className="text-xs text-md-on-surface-variant mt-0.5">Crea cuenta y acceso en un solo paso</p>
                </div>
                <button onClick={() => setShowOnboard(false)} className="p-2 rounded-full text-md-on-surface-variant hover:bg-md-surface-container">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6">
                <OnboardModal
                  onClose={() => setShowOnboard(false)}
                  onSuccess={loadTenants}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tenants list */}
      <div className="card p-0 overflow-hidden">
        {tenants.length === 0 ? (
          <div className="text-center py-14">
            <div className="w-14 h-14 rounded-full bg-md-surface-container-high flex items-center justify-center mx-auto mb-3">
              <Building2 size={24} className="text-md-on-surface-variant/40" />
            </div>
            <p className="text-md-on-surface font-medium">Sin clientes aún</p>
            <p className="text-sm text-md-on-surface-variant mt-1">Toca "Nuevo cliente" para empezar</p>
          </div>
        ) : (
          <div className="divide-y divide-md-outline-variant/40">
            {tenants.map(t => (
              <div
                key={t.id}
                className="flex items-center justify-between px-5 py-4 hover:bg-md-surface-container-low cursor-pointer transition-colors"
                onClick={() => navigate(`/admin/tenants/${t.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-md-primary-container flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-md-on-primary-container">
                      {(t.display_name || t.name).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-md-on-surface">{t.display_name || t.name}</p>
                    <p className="text-xs text-md-on-surface-variant">{t.slug} · {t.plan}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    title={t.whatsapp_confirmed_at
                      ? `WA confirmado ${new Date(t.whatsapp_confirmed_at).toLocaleDateString('es-MX')}`
                      : 'WA pendiente de confirmar'}
                    className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-full ${
                      t.whatsapp_confirmed_at
                        ? 'bg-green-100 text-green-700'
                        : 'bg-md-surface-container text-md-on-surface-variant'
                    }`}
                  >
                    <MessageSquare size={10} />
                    {t.whatsapp_confirmed_at ? '✓' : '…'}
                  </span>
                  <StatusBadge status={t.status} size="xs" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
