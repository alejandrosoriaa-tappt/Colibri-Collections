import { useState } from 'react'
import { Settings, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import useAuthStore from '../store/authStore.js'
import { adminAPI } from '../lib/api.js'

export default function SettingsPage() {
  const { tenant, isAdmin, updateTenant } = useAuthStore()
  const [form, setForm] = useState({
    display_name: tenant?.display_name || '',
    admin_phone: tenant?.admin_phone || '',
    payment_link_general: tenant?.payment_link_general || ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!tenant?.id || !isAdmin) return
    setIsSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await adminAPI.updateTenant(tenant.id, {
        display_name: form.display_name.trim(),
        admin_phone: form.admin_phone.trim(),
        payment_link_general: form.payment_link_general.trim()
      })
      updateTenant(res.data.tenant)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 text-sm mt-1">Ajustes de tu cuenta y organización</p>
      </div>

      {/* Tenant info */}
      {tenant && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings size={16} className="text-colibri" />
            Datos de la organización
          </h2>

          {error && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {saved && (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl mb-4">
              <CheckCircle2 size={16} className="text-green-600" />
              <p className="text-sm text-green-700">Cambios guardados correctamente</p>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="label">Nombre de la organización</label>
              <input
                className="input"
                value={form.display_name}
                onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                placeholder="Ej. Club Deportivo Azteca"
                disabled={!isAdmin}
              />
            </div>

            <div>
              <label className="label">Teléfono admin (WhatsApp)</label>
              <input
                className="input"
                value={form.admin_phone}
                onChange={e => setForm(f => ({ ...f, admin_phone: e.target.value }))}
                placeholder="+521XXXXXXXXXX"
                disabled={!isAdmin}
              />
              <p className="text-xs text-gray-400 mt-1">Número donde recibirás notificaciones operativas del sistema</p>
            </div>

            <div>
              <label className="label">Liga de pago general</label>
              <input
                className="input"
                value={form.payment_link_general}
                onChange={e => setForm(f => ({ ...f, payment_link_general: e.target.value }))}
                placeholder="https://..."
                disabled={!isAdmin}
              />
              <p className="text-xs text-gray-400 mt-1">Se usa cuando un contacto no tiene liga de pago individual</p>
            </div>

            {isAdmin && (
              <button
                type="submit"
                className="btn-primary flex items-center gap-2 text-sm"
                disabled={isSaving}
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            )}
          </form>
        </div>
      )}

      {/* Plan info */}
      {tenant && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Plan y suscripción</h2>
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
              Para cambios de plan o consultas de facturación: <span className="text-colibri font-medium">hola@colybiz.com</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
