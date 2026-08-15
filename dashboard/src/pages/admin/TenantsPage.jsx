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
import AltaNumeroWhatsApp from '../../components/admin/AltaNumeroWhatsApp.jsx'

// ─── Helpers ────────────────────────────────────────────────────────────────

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
    nombre_director: '',
    admin_phone: '',
    plan: 'basic',
    org_type: 'general',
    waba_phone_id: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  // Salida de emergencia: si el número ya se registró antes (o por consola),
  // se pega el ID y ya. El camino normal es el asistente.
  const [altaManual, setAltaManual] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))


  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await adminAPI.onboard({
        org_name: form.org_name.trim(),
        nombre_director: form.nombre_director.trim(),
        display_name: form.org_name.trim(),
        slug: slugify(form.org_name),
        plan: form.plan,
        org_type: form.org_type,
        admin_phone: form.admin_phone.trim() || null,
        waba_phone_id: form.waba_phone_id.trim() || null
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
          <Row label="Director" value={form.nombre_director} />
          <Row label="Plan" value={result.tenant.plan} />
          {result.activacion_enviada ? (
            <div className="flex items-center gap-2 pt-2 border-t border-md-outline-variant text-green-700">
              <MessageSquare size={14} />
              <span className="text-xs">Liga de activación enviada por WhatsApp ✓</span>
            </div>
          ) : (
            <div className="pt-2 border-t border-md-outline-variant space-y-1.5">
              <p className="text-xs text-md-on-surface-variant">
                No se pudo enviar por WhatsApp{result.activacion_aviso ? `: ${result.activacion_aviso}` : ''}.
                Cópiala y mándasela tú:
              </p>
              <div className="flex gap-2">
                <input readOnly className="input text-xs font-mono flex-1" value={result.activacion_liga || ''} />
                <button type="button" onClick={() => navigator.clipboard.writeText(result.activacion_liga)}
                  className="btn-tonal text-xs px-3">Copiar</button>
              </div>
            </div>
          )}
          {result.numero_aviso && (
            <p className="text-xs text-amber-700 pt-2 border-t border-md-outline-variant">
              Sin número propio ({result.numero_aviso}). Enviará desde el número compartido.
            </p>
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
          <label className="label">Nombre del director *</label>
          <input
            className="input"
            value={form.nombre_director}
            onChange={set('nombre_director')}
            placeholder="Ana Martínez"
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

      {/* Número propio del colegio. El alta corre aquí contra Meta, sin consola
          y sin entrar al WhatsApp Manager. Vive SOLO en el panel de Admin: si
          el colegio pudiera editarlo desde su Configuración, podría poner el
          número de otro colegio y suplantarlo. */}
      {altaManual ? (
        <div>
          <label className="label">ID del número de WhatsApp (Meta)</label>
          <input
            className="input font-mono"
            value={form.waba_phone_id}
            onChange={set('waba_phone_id')}
            placeholder="Ej. 123456789012345"
          />
          <button type="button" onClick={() => setAltaManual(false)}
            className="text-xs text-md-primary underline mt-1">
            Mejor darlo de alta desde aquí
          </button>
        </div>
      ) : (
        <>
          <AltaNumeroWhatsApp
            nombreSugerido={form.org_name}
            onListo={(id) => setForm(f => ({ ...f, waba_phone_id: id }))}
          />
          <p className="text-xs text-md-on-surface-variant">
            Si lo dejas sin número, el colegio enviará desde el número compartido de
            Kollybry hasta que le asignes el suyo.{' '}
            <button type="button" onClick={() => setAltaManual(true)}
              className="text-md-primary underline">
              Ya tengo el ID de Meta
            </button>
          </p>
        </>
      )}

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


      {/* El interruptor de "enviar credenciales por WhatsApp" ya no existe: la
          liga de activación sale sola al guardar, y la contraseña la define el
          director. Nadie más la conoce ni queda en un chat. */}
      <p className="text-xs text-md-on-surface-variant flex items-start gap-2 p-3 rounded-2xl bg-md-surface-container">
        <MessageSquare size={14} className="flex-shrink-0 mt-0.5" />
        Al guardar se manda la liga de activación al WhatsApp del director. Él define
        su correo y su contraseña; tú nunca la ves.
      </p>

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
  const [ligaReenviada, setLigaReenviada] = useState(null)
  const [phoneIdManual, setPhoneIdManual] = useState('')

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

  // Reenvía la LIGA DE ACTIVACIÓN, no la bienvenida vieja: esa mandaba
  // credenciales que ya no existen —la contraseña la define el director—.
  // Genera una liga nueva y la anterior deja de servir.
  const handleResendWelcome = async () => {
    setResending(true); setResendResult(null); setLigaReenviada(null)
    try {
      const res = await adminAPI.reenviarActivacion(id)
      setResendResult(res.data.enviada ? 'ok' : 'error')
      // Si el WhatsApp no salió —hoy, sin plantilla aprobada, es lo normal—
      // se muestra la liga para copiarla en vez de dejar al admin sin salida.
      if (!res.data.enviada) setLigaReenviada(res.data.liga)
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

        {/* Reenviar la liga de activación */}
        {tenant.admin_phone && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button
                onClick={handleResendWelcome}
                disabled={resending}
                className="btn-outline text-sm flex items-center gap-2"
              >
                {resending
                  ? <Loader2 size={13} className="animate-spin" />
                  : <MessageSquare size={13} />}
                {resending ? 'Generando...' : 'Reenviar liga de activación'}
              </button>
              {resendResult === 'ok' && (
                <span className="text-xs text-green-700 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Enviada por WhatsApp ✓
                </span>
              )}
              {resendResult === 'error' && !ligaReenviada && (
                <span className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle size={13} /> No se pudo generar
                </span>
              )}
            </div>

            {ligaReenviada && (
              <div className="flex items-center gap-2 max-w-xl">
                <input readOnly className="input flex-1 text-xs font-mono" value={ligaReenviada} />
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(ligaReenviada)}
                  className="btn-tonal text-xs px-3"
                >
                  Copiar
                </button>
              </div>
            )}
            {ligaReenviada && (
              <p className="text-xs text-md-on-surface-variant">
                No salió por WhatsApp, mándasela tú. La liga anterior ya no sirve.
              </p>
            )}
          </div>
        )}

        <div className="card">
          <h2 className="text-base font-semibold text-md-on-surface mb-4">Editar organización</h2>
          <TenantForm initial={tenant} onSave={handleUpdate} isSaving={isSaving} error={formError} />
        </div>

        {/* Número propio del colegio.
            El asistente vivía solo en el alta, así que un colegio creado sin
            número se quedaba sin forma de conseguirlo desde el panel. Casi
            siempre el chip llega después del alta, no antes. */}
        <div className="card">
          <h2 className="text-base font-semibold text-md-on-surface mb-1">Número de WhatsApp</h2>
          {tenant.waba_phone_id ? (
            <>
              <p className="text-sm text-md-on-surface-variant mb-3">
                Este colegio ya envía desde su propio número.
              </p>
              <Row label="Phone number ID" value={tenant.waba_phone_id} mono />
            </>
          ) : (
            <>
              <p className="text-sm text-md-on-surface-variant mb-4">
                Hoy envía desde el número compartido de Kollybry. Da de alta el suyo
                cuando tengas el chip a la mano.
              </p>
              <AltaNumeroWhatsApp
                nombreSugerido={tenant.display_name || tenant.name}
                onListo={(phoneId) => handleUpdate({ ...tenant, waba_phone_id: phoneId })}
              />

              {/* Si el número se dio de alta a mano en el WhatsApp Manager
                  —o si el token todavía no tiene permiso de administración—,
                  basta con pegar el ID que Meta ya asignó. */}
              <div className="mt-4 pt-4 border-t border-md-outline-variant">
                <label className="label">¿Ya lo diste de alta en el WhatsApp Manager?</label>
                <div className="flex gap-2">
                  <input
                    className="input flex-1 font-mono"
                    value={phoneIdManual}
                    onChange={e => setPhoneIdManual(e.target.value.replace(/\D/g, ''))}
                    placeholder="Pega aquí el Phone number ID"
                  />
                  <button
                    type="button"
                    disabled={!phoneIdManual || isSaving}
                    onClick={() => handleUpdate({ ...tenant, waba_phone_id: phoneIdManual })}
                    className="btn-tonal text-sm disabled:opacity-50"
                  >
                    Asignar
                  </button>
                </div>
                <p className="text-xs text-md-on-surface-variant mt-1">
                  Meta lo muestra en Cuentas de WhatsApp → Números de teléfono, debajo del número.
                </p>
              </div>
            </>
          )}
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
