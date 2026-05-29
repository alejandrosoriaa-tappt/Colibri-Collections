import { useState, useEffect } from 'react'
import {
  Settings, Save, Loader2, CheckCircle2, AlertCircle,
  Building2, Eye, EyeOff, Globe, Mail, MapPin, Lock
} from 'lucide-react'
import useAuthStore from '../store/authStore.js'
import { settingsAPI } from '../lib/api.js'
import supabase from '../lib/supabase.js'

const ORG_TYPES = [
  { value: 'general',    label: 'General' },
  { value: 'condominio', label: 'Condominio' },
  { value: 'colegio',    label: 'Colegio / Escuela' },
  { value: 'gimnasio',   label: 'Gimnasio' },
  { value: 'club',       label: 'Club deportivo' },
  { value: 'academia',   label: 'Academia' },
]


function SectionCard({ icon: Icon, title, badge, children }) {
  return (
    <div className="card space-y-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-md-on-surface flex items-center gap-2">
          <Icon size={17} className="text-md-primary flex-shrink-0" />
          {title}
        </h2>
        {badge}
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { tenant, updateTenant } = useAuthStore()

  const [form, setForm] = useState({
    display_name: '',
    admin_phone: '',
    payment_link_general: '',
    org_type: 'general',
    email: '',
    website: '',
    address: ''
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  useEffect(() => {
    settingsAPI.get().then(sRes => {
      const t = sRes.data.tenant
      setForm({
        display_name: t.display_name || '',
        admin_phone: t.admin_phone || '',
        payment_link_general: t.payment_link_general || '',
        org_type: t.org_type || 'general',
        email: t.email || '',
        website: t.website || '',
        address: t.address || ''
      })
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
        email: form.email.trim(),
        website: form.website.trim(),
        address: form.address.trim()
      }

      const res = await settingsAPI.update(payload)
      updateTenant(res.data.tenant)
      setSaved(true)
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
        <Loader2 size={28} className="text-md-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl">

      <div>
        <h1 className="text-2xl font-semibold text-md-on-surface">Configuración</h1>
        <p className="text-sm text-md-on-surface-variant mt-0.5">Ajustes de tu cuenta y organización</p>
      </div>

      {/* Error / Success banners */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-md-error-container rounded-2xl">
          <AlertCircle size={16} className="text-md-on-error-container flex-shrink-0 mt-0.5" />
          <p className="text-sm text-md-on-error-container">{error}</p>
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-2xl">
          <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700 font-medium">Cambios guardados correctamente</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">

        {/* ── Organización ── */}
        <SectionCard icon={Building2} title="Datos de la organización">

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Nombre de la organización</label>
              <input className="input" value={form.display_name} onChange={set('display_name')} placeholder="Ej. Colegio Las Américas" />
            </div>

            <div>
              <label className="label">Tipo de organización</label>
              <select className="input" value={form.org_type} onChange={set('org_type')}>
                {ORG_TYPES.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Teléfono WhatsApp administrador</label>
              <input className="input" value={form.admin_phone} onChange={set('admin_phone')} placeholder="+521XXXXXXXXXX" />
              <p className="text-xs text-md-on-surface-variant mt-1.5">Recibe notificaciones operativas</p>
            </div>
          </div>

          <div>
            <label className="label">Liga de pago general</label>
            <input className="input" value={form.payment_link_general} onChange={set('payment_link_general')} placeholder="https://..." />
            <p className="text-xs text-md-on-surface-variant mt-1.5">Se usa cuando un contacto no tiene liga individual</p>
          </div>

          {/* Additional info */}
          <div className="pt-1 border-t border-md-outline-variant">
            <p className="text-xs font-medium text-md-on-surface-variant mb-3">Información adicional</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label flex items-center gap-1.5">
                  <Mail size={12} className="text-md-on-surface-variant" />
                  Correo electrónico
                </label>
                <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="contacto@tuorganizacion.com" />
              </div>
              <div>
                <label className="label flex items-center gap-1.5">
                  <Globe size={12} className="text-md-on-surface-variant" />
                  Sitio web
                </label>
                <input className="input" value={form.website} onChange={set('website')} placeholder="https://tuorganizacion.com" />
              </div>
              <div className="sm:col-span-2">
                <label className="label flex items-center gap-1.5">
                  <MapPin size={12} className="text-md-on-surface-variant" />
                  Dirección
                </label>
                <input className="input" value={form.address} onChange={set('address')} placeholder="Calle, colonia, ciudad, estado" />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── Save button ── */}
        <button
          type="submit"
          className="btn-primary text-sm"
          disabled={isSaving}
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>

      {/* ── Cambiar contraseña ── */}
      <PasswordSection />

      {/* ── Plan info ── */}
      {tenant && (
        <SectionCard icon={Settings} title="Plan y suscripción">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-md-on-surface-variant uppercase tracking-wide mb-1">Plan actual</p>
              <p className="font-semibold text-md-on-surface capitalize">{tenant.plan}</p>
            </div>
            <div>
              <p className="text-xs text-md-on-surface-variant uppercase tracking-wide mb-1">Estado</p>
              <p className="font-semibold text-md-on-surface capitalize">{tenant.status}</p>
            </div>
            {tenant.slug && (
              <div>
                <p className="text-xs text-md-on-surface-variant uppercase tracking-wide mb-1">Identificador</p>
                <p className="font-mono text-md-on-surface-variant text-xs">{tenant.slug}</p>
              </div>
            )}
          </div>
          <div className="pt-4 border-t border-md-outline-variant">
            <p className="text-xs text-md-on-surface-variant">
              Para cambios de plan o consultas de facturación:{' '}
              <span className="text-md-primary font-medium">hola@kollybry.com</span>
            </p>
          </div>
        </SectionCard>
      )}
    </div>
  )
}

function PasswordSection() {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (newPassword !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setSaved(true)
      setNewPassword('')
      setConfirm('')
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message || 'No se pudo cambiar la contraseña')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard icon={Lock} title="Contraseña">
      {saved && (
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-2xl">
          <CheckCircle2 size={15} className="text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700 font-medium">Contraseña actualizada correctamente</p>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-3 p-3 bg-md-error-container rounded-2xl">
          <AlertCircle size={15} className="text-md-on-error-container flex-shrink-0 mt-0.5" />
          <p className="text-sm text-md-on-error-container">{error}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Nueva contraseña</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              className="input pr-10"
              placeholder="Mínimo 8 caracteres"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNew(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-md-on-surface-variant hover:text-md-on-surface"
            >
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div>
          <label className="label">Confirmar contraseña</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              className="input pr-10"
              placeholder="Repite la nueva contraseña"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-md-on-surface-variant hover:text-md-on-surface"
            >
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {/* strength hint */}
          {newPassword && confirm && newPassword !== confirm && (
            <p className="text-xs text-md-error mt-1.5">Las contraseñas no coinciden</p>
          )}
          {newPassword && confirm && newPassword === confirm && (
            <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
              <CheckCircle2 size={11} /> Coinciden
            </p>
          )}
        </div>

        <button
          type="submit"
          className="btn-secondary text-sm"
          disabled={saving || !newPassword || !confirm}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
          {saving ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
      </form>
    </SectionCard>
  )
}
