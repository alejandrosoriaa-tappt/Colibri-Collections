import { useState, useEffect } from 'react'
import {
  Settings, Save, Loader2, CheckCircle2, AlertCircle,
  MessageSquareMore, Building2, Eye, EyeOff, ExternalLink, Info
} from 'lucide-react'
import useAuthStore from '../store/authStore.js'
import { settingsAPI } from '../lib/api.js'

const ORG_TYPES = [
  { value: 'general',    label: 'General' },
  { value: 'condominio', label: 'Condominio' },
  { value: 'colegio',    label: 'Colegio / Escuela' },
  { value: 'gimnasio',   label: 'Gimnasio' },
  { value: 'club',       label: 'Club deportivo' },
  { value: 'academia',   label: 'Academia' },
]

function StatusBadge({ ok, label }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
      ok ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-gray-400'}`} />
      {label}
    </span>
  )
}

export default function SettingsPage() {
  const { tenant, updateTenant } = useAuthStore()

  const [form, setForm] = useState({
    display_name: '',
    admin_phone: '',
    payment_link_general: '',
    org_type: 'general',
    waba_phone_id: '',
    waba_token: '',
    waba_business_id: ''
  })

  const [waStatus, setWaStatus] = useState(null)
  const [showToken, setShowToken] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      settingsAPI.get(),
      settingsAPI.whatsappStatus().catch(() => ({ data: null }))
    ]).then(([sRes, waRes]) => {
      const t = sRes.data.tenant
      setForm({
        display_name: t.display_name || '',
        admin_phone: t.admin_phone || '',
        payment_link_general: t.payment_link_general || '',
        org_type: t.org_type || 'general',
        waba_phone_id: t.waba_phone_id || '',
        waba_token: '',           // never pre-fill token
        waba_business_id: t.waba_business_id || ''
      })
      if (waRes.data) setWaStatus(waRes.data)
    }).catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setSaved(false)
    try {
      const payload = {
        display_name: form.display_name.trim(),
        admin_phone: form.admin_phone.trim(),
        payment_link_general: form.payment_link_general.trim(),
        org_type: form.org_type,
        waba_phone_id: form.waba_phone_id.trim(),
        waba_business_id: form.waba_business_id.trim()
      }
      // Only send token if the user actually typed one
      if (form.waba_token.trim()) {
        payload.waba_token = form.waba_token.trim()
      }

      const res = await settingsAPI.update(payload)
      updateTenant(res.data.tenant)

      // Refresh WA status
      const waRes = await settingsAPI.whatsappStatus().catch(() => null)
      if (waRes?.data) setWaStatus(waRes.data)

      setSaved(true)
      setForm(f => ({ ...f, waba_token: '' })) // clear token field after save
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="text-colibri animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 text-sm mt-1">Ajustes de tu cuenta y organización</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 size={16} className="text-green-600" />
          <p className="text-sm text-green-700">Cambios guardados correctamente</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">

        {/* ── Organización ── */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Building2 size={16} className="text-colibri" />
            Datos de la organización
          </h2>

          <div>
            <label className="label">Nombre de la organización</label>
            <input
              className="input"
              value={form.display_name}
              onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
              placeholder="Ej. Colegio Las Américas"
            />
          </div>

          <div>
            <label className="label">Tipo de organización</label>
            <select
              className="input"
              value={form.org_type}
              onChange={e => setForm(f => ({ ...f, org_type: e.target.value }))}
            >
              {ORG_TYPES.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Teléfono administrador (WhatsApp)</label>
            <input
              className="input"
              value={form.admin_phone}
              onChange={e => setForm(f => ({ ...f, admin_phone: e.target.value }))}
              placeholder="+521XXXXXXXXXX"
            />
            <p className="text-xs text-gray-400 mt-1">Recibe notificaciones operativas del sistema</p>
          </div>

          <div>
            <label className="label">Liga de pago general</label>
            <input
              className="input"
              value={form.payment_link_general}
              onChange={e => setForm(f => ({ ...f, payment_link_general: e.target.value }))}
              placeholder="https://..."
            />
            <p className="text-xs text-gray-400 mt-1">Se usa cuando un contacto no tiene liga de pago individual</p>
          </div>
        </div>

        {/* ── WhatsApp API ── */}
        <div className="card space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquareMore size={16} className="text-colibri" />
              Configuración WhatsApp Business API
            </h2>
            {waStatus && (
              <StatusBadge
                ok={waStatus.configured}
                label={waStatus.configured ? 'Configurado' : 'Sin configurar'}
              />
            )}
          </div>

          {/* Status indicators */}
          {waStatus && (
            <div className="flex gap-2 flex-wrap">
              <StatusBadge ok={waStatus.phone_id_set} label="Phone ID" />
              <StatusBadge ok={waStatus.token_set} label="Token" />
              <StatusBadge ok={waStatus.business_id_set} label="Business ID" />
            </div>
          )}

          {/* Info banner */}
          <div className="flex gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 space-y-1">
              <p className="font-semibold">¿Cómo obtener estas credenciales?</p>
              <p>Necesitas una cuenta de Meta Business y una aplicación de WhatsApp Business. Obtén el Phone Number ID y el Access Token en el panel de Meta for Developers.</p>
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 font-medium hover:underline"
              >
                Guía de Meta <ExternalLink size={11} />
              </a>
            </div>
          </div>

          <div>
            <label className="label">Phone Number ID</label>
            <input
              className="input font-mono text-sm"
              value={form.waba_phone_id}
              onChange={e => setForm(f => ({ ...f, waba_phone_id: e.target.value }))}
              placeholder="Ej. 123456789012345"
            />
            <p className="text-xs text-gray-400 mt-1">
              Se encuentra en Meta for Developers → Tu App → WhatsApp → API Setup
            </p>
          </div>

          <div>
            <label className="label">
              Access Token
              {waStatus?.token_set && (
                <span className="ml-2 text-xs font-normal text-green-600">● Ya configurado — deja vacío para no cambiar</span>
              )}
            </label>
            <div className="relative">
              <input
                className="input font-mono text-sm pr-10"
                type={showToken ? 'text' : 'password'}
                value={form.waba_token}
                onChange={e => setForm(f => ({ ...f, waba_token: e.target.value }))}
                placeholder={waStatus?.token_set ? '••••••••••••••••••••••••••••••••' : 'EAAxxxxxxxx...'}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowToken(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Token permanente o temporal de tu app de Meta. Se almacena cifrado.
            </p>
          </div>

          <div>
            <label className="label">WhatsApp Business Account ID <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input
              className="input font-mono text-sm"
              value={form.waba_business_id}
              onChange={e => setForm(f => ({ ...f, waba_business_id: e.target.value }))}
              placeholder="Ej. 987654321098765"
            />
          </div>
        </div>

        {/* ── Save button ── */}
        <button
          type="submit"
          className="btn-primary flex items-center gap-2 text-sm"
          disabled={isSaving}
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>

      {/* ── Plan info ── */}
      {tenant && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings size={16} className="text-colibri" />
            Plan y suscripción
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Plan actual</p>
              <p className="font-semibold text-gray-900 capitalize">{tenant.plan}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Estado</p>
              <p className="font-semibold text-gray-900 capitalize">{tenant.status}</p>
            </div>
            {tenant.slug && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Identificador</p>
                <p className="font-mono text-gray-600 text-xs">{tenant.slug}</p>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Para cambios de plan o consultas de facturación:{' '}
              <span className="text-colibri font-medium">hola@kollybry.com</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
