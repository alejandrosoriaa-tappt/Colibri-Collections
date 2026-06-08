import { useState, useEffect, useCallback } from 'react'
import {
  Settings, Save, Loader2, CheckCircle2, AlertCircle,
  Building2, Eye, EyeOff, Globe, Mail, MapPin, Lock,
  Receipt, Info, Users, UserPlus, Trash2, X, Crown,
  CreditCard, Megaphone, Send
} from 'lucide-react'
import useAuthStore from '../store/authStore.js'
import { settingsAPI, teamAPI } from '../lib/api.js'
import supabase from '../lib/supabase.js'
import { ORG_TYPE_OPTIONS } from '../config/orgTypeConfig.js'

const ORG_TYPES = ORG_TYPE_OPTIONS

// SAT catalog — Regímenes fiscales más comunes
const REGIMENES_FISCALES = [
  { value: '601', label: '601 – General de Ley Personas Morales' },
  { value: '603', label: '603 – Personas Morales con Fines no Lucrativos' },
  { value: '605', label: '605 – Sueldos y Salarios e Ingresos Asimilados a Salarios' },
  { value: '606', label: '606 – Arrendamiento' },
  { value: '607', label: '607 – Régimen de Enajenación o Adquisición de Bienes' },
  { value: '608', label: '608 – Demás Ingresos' },
  { value: '610', label: '610 – Residentes en el Extranjero sin EP en México' },
  { value: '611', label: '611 – Ingresos por Dividendos (socios y accionistas)' },
  { value: '612', label: '612 – Personas Físicas con Actividades Empresariales y Profesionales' },
  { value: '614', label: '614 – Ingresos por Intereses' },
  { value: '615', label: '615 – Régimen de los ingresos por obtención de premios' },
  { value: '616', label: '616 – Sin obligaciones fiscales' },
  { value: '620', label: '620 – Sociedades Cooperativas de Producción que optan por diferir sus ingresos' },
  { value: '621', label: '621 – Incorporación Fiscal' },
  { value: '622', label: '622 – Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
  { value: '623', label: '623 – Opcional para Grupos de Sociedades' },
  { value: '624', label: '624 – Coordinados' },
  { value: '625', label: '625 – Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
  { value: '626', label: '626 – Régimen Simplificado de Confianza (RESICO)' },
]

// SAT catalog — Usos de CFDI más comunes
const USOS_CFDI = [
  { value: 'G01', label: 'G01 – Adquisición de mercancias' },
  { value: 'G02', label: 'G02 – Devoluciones, descuentos o bonificaciones' },
  { value: 'G03', label: 'G03 – Gastos en general' },
  { value: 'I01', label: 'I01 – Construcciones' },
  { value: 'I02', label: 'I02 – Mobilario y equipo de oficina por inversiones' },
  { value: 'I03', label: 'I03 – Equipo de transporte' },
  { value: 'I04', label: 'I04 – Equipo de computo y accesorios' },
  { value: 'I05', label: 'I05 – Dados, troqueles, moldes, matrices y herramental' },
  { value: 'I06', label: 'I06 – Comunicaciones telefónicas' },
  { value: 'I07', label: 'I07 – Comunicaciones satelitales' },
  { value: 'I08', label: 'I08 – Otra maquinaria y equipo' },
  { value: 'D01', label: 'D01 – Honorarios médicos, dentales y gastos hospitalarios' },
  { value: 'D02', label: 'D02 – Gastos médicos por incapacidad o discapacidad' },
  { value: 'D03', label: 'D03 – Gastos funerales' },
  { value: 'D04', label: 'D04 – Donativos' },
  { value: 'D05', label: 'D05 – Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)' },
  { value: 'D06', label: 'D06 – Aportaciones voluntarias al SAR' },
  { value: 'D07', label: 'D07 – Primas por seguros de gastos médicos' },
  { value: 'D08', label: 'D08 – Gastos de transportación escolar obligatoria' },
  { value: 'D09', label: 'D09 – Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones' },
  { value: 'D10', label: 'D10 – Pagos por servicios educativos (colegiaturas)' },
  { value: 'S01', label: 'S01 – Sin efectos fiscales' },
  { value: 'CP01', label: 'CP01 – Pagos' },
  { value: 'CN01', label: 'CN01 – Nómina' },
]

// Mexican states
const ESTADOS_MX = [
  'Aguascalientes','Baja California','Baja California Sur','Campeche',
  'Chiapas','Chihuahua','Ciudad de México','Coahuila','Colima',
  'Durango','Estado de México','Guanajuato','Guerrero','Hidalgo',
  'Jalisco','Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca',
  'Puebla','Querétaro','Quintana Roo','San Luis Potosí','Sinaloa',
  'Sonora','Tabasco','Tamaulipas','Tlaxcala','Veracruz','Yucatán','Zacatecas'
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
  const { tenant, updateTenant, tenantRole, user } = useAuthStore()

  const [form, setForm] = useState({
    display_name: '',
    admin_phone: '',
    payment_link_general: '',
    org_type: 'general',
    email: '',
    website: '',
    address: '',
    contact_grace_period_days: 30,
    // Google Sheets
    sheets_url: '',
    // Datos fiscales
    razon_social: '',
    rfc: '',
    regimen_fiscal: '',
    uso_cfdi: '',
    fiscal_street: '',
    fiscal_colony: '',
    fiscal_city: '',
    fiscal_state: '',
    fiscal_zip: '',
    email_facturacion: ''
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
        address: t.address || '',
        contact_grace_period_days: t.contact_grace_period_days ?? 30,
        // Google Sheets
        sheets_url: t.sheets_url || '',
        // Datos fiscales
        razon_social: t.razon_social || '',
        rfc: t.rfc || '',
        regimen_fiscal: t.regimen_fiscal || '',
        uso_cfdi: t.uso_cfdi || '',
        fiscal_street: t.fiscal_street || '',
        fiscal_colony: t.fiscal_colony || '',
        fiscal_city: t.fiscal_city || '',
        fiscal_state: t.fiscal_state || '',
        fiscal_zip: t.fiscal_zip || '',
        email_facturacion: t.email_facturacion || ''
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
        address: form.address.trim(),
        contact_grace_period_days: Number(form.contact_grace_period_days) || 30,
        // Datos fiscales
        razon_social: form.razon_social.trim(),
        rfc: form.rfc.trim().toUpperCase(),
        regimen_fiscal: form.regimen_fiscal,
        uso_cfdi: form.uso_cfdi,
        fiscal_street: form.fiscal_street.trim(),
        fiscal_colony: form.fiscal_colony.trim(),
        fiscal_city: form.fiscal_city.trim(),
        fiscal_state: form.fiscal_state,
        fiscal_zip: form.fiscal_zip.trim(),
        email_facturacion: form.email_facturacion.trim(),
        sheets_url: form.sheets_url.trim()
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

          {/* Google Sheets */}
          <div className="pt-1 border-t border-md-outline-variant">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded flex items-center justify-center bg-green-100 flex-shrink-0">
                <span className="text-green-700 font-bold text-xs">G</span>
              </div>
              <p className="text-xs font-medium text-md-on-surface-variant">Fuente de datos — Google Sheets</p>
              {form.sheets_url && (
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                  <CheckCircle2 size={9} /> Conectada
                </span>
              )}
            </div>
            <label className="label">URL de tu Google Sheet</label>
            <input
              className="input"
              value={form.sheets_url}
              onChange={set('sheets_url')}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
            <p className="text-xs text-md-on-surface-variant mt-1.5">
              Guarda aquí el enlace de tu hoja (compartida como "Cualquier persona con el enlace puede ver").
              Al importar contactos, Kollybry leerá esta hoja automáticamente.
            </p>
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

        {/* ── Gestión de contactos ── */}
        <SectionCard icon={Users} title="Gestión de contactos">
          <div>
            <label className="label">Periodo de gracia para contactos inactivos</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                className="input w-28"
                min={1}
                max={365}
                value={form.contact_grace_period_days}
                onChange={e => setForm(f => ({ ...f, contact_grace_period_days: e.target.value }))}
              />
              <span className="text-sm text-md-on-surface-variant">días</span>
            </div>
            <p className="text-xs text-md-on-surface-variant mt-1.5">
              Cuando un contacto se marca como inactivo (manualmente o al actualizar el padrón),
              se eliminará definitivamente después de este número de días. Por defecto: 30 días.
            </p>
          </div>
        </SectionCard>

        {/* ── Datos fiscales ── */}
        <SectionCard
          icon={Receipt}
          title="Datos fiscales"
          badge={
            <span className="flex items-center gap-1 text-xs text-md-on-surface-variant bg-md-surface-container px-2.5 py-1 rounded-full">
              <Info size={11} />
              Opcional
            </span>
          }
        >
          {/* Info note */}
          <div className="flex items-start gap-2.5 p-3 bg-md-surface-container rounded-2xl text-xs text-md-on-surface-variant leading-relaxed">
            <Info size={13} className="flex-shrink-0 mt-0.5 text-md-primary" />
            <p>
              Si tu organización emite o recibe facturas, completa estos datos para agilizar el proceso.
              El <strong>RFC</strong> tiene 12 caracteres para personas morales (empresas) y 13 para personas físicas.
              La <strong>Razón Social</strong> puede ser igual al nombre comercial si eres persona física con actividad empresarial.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Razón Social</label>
              <input
                className="input"
                value={form.razon_social}
                onChange={set('razon_social')}
                placeholder="Ej. ACME Servicios S.A. de C.V. o Juan Pérez López"
              />
              <p className="text-xs text-md-on-surface-variant mt-1.5">
                Nombre legal tal como aparece en tu constancia de situación fiscal
              </p>
            </div>

            <div>
              <label className="label">RFC</label>
              <input
                className="input uppercase"
                value={form.rfc}
                onChange={e => setForm(f => ({ ...f, rfc: e.target.value.toUpperCase() }))}
                placeholder="Ej. ACM123456789 o PELJ800101ABC"
                maxLength={13}
              />
              <p className="text-xs text-md-on-surface-variant mt-1.5">
                12 caracteres (persona moral) · 13 caracteres (persona física)
              </p>
            </div>

            <div>
              <label className="label">Régimen fiscal</label>
              <select className="input" value={form.regimen_fiscal} onChange={set('regimen_fiscal')}>
                <option value="">— Selecciona —</option>
                {REGIMENES_FISCALES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Uso de CFDI</label>
              <select className="input" value={form.uso_cfdi} onChange={set('uso_cfdi')}>
                <option value="">— Selecciona —</option>
                {USOS_CFDI.map(u => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label flex items-center gap-1.5">
                <Mail size={12} className="text-md-on-surface-variant" />
                Correo de facturación
              </label>
              <input
                className="input"
                type="email"
                value={form.email_facturacion}
                onChange={set('email_facturacion')}
                placeholder="facturas@tuorganizacion.com"
              />
            </div>
          </div>

          {/* Domicilio fiscal */}
          <div className="pt-1 border-t border-md-outline-variant">
            <p className="text-xs font-medium text-md-on-surface-variant mb-3">Domicilio fiscal</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label flex items-center gap-1.5">
                  <MapPin size={12} className="text-md-on-surface-variant" />
                  Calle y número
                </label>
                <input
                  className="input"
                  value={form.fiscal_street}
                  onChange={set('fiscal_street')}
                  placeholder="Ej. Av. Insurgentes Sur 1234, Int. 5"
                />
              </div>

              <div>
                <label className="label">Colonia</label>
                <input
                  className="input"
                  value={form.fiscal_colony}
                  onChange={set('fiscal_colony')}
                  placeholder="Ej. Del Valle"
                />
              </div>

              <div>
                <label className="label">Código postal</label>
                <input
                  className="input"
                  value={form.fiscal_zip}
                  onChange={set('fiscal_zip')}
                  placeholder="Ej. 03100"
                  maxLength={5}
                  inputMode="numeric"
                />
              </div>

              <div>
                <label className="label">Ciudad / Municipio</label>
                <input
                  className="input"
                  value={form.fiscal_city}
                  onChange={set('fiscal_city')}
                  placeholder="Ej. Benito Juárez"
                />
              </div>

              <div>
                <label className="label">Estado</label>
                <select className="input" value={form.fiscal_state} onChange={set('fiscal_state')}>
                  <option value="">— Selecciona —</option>
                  {ESTADOS_MX.map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
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

      {/* ── Equipo ── */}
      <TeamSection tenantRole={tenantRole} currentUserId={user?.id} />

      {/* ── Cambiar contraseña ── */}
      <PasswordSection />

      {/* ── Plan info ── */}
      {tenant && (
        <SectionCard icon={CreditCard} title="Plan y suscripción">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-md-on-surface-variant">Plan actual</p>
              <p className="text-lg font-semibold text-md-on-surface capitalize mt-0.5">
                {tenant.plan || 'Básico'}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-md-primary-container text-md-on-primary-container text-xs font-medium capitalize">
              {tenant.status === 'trial' ? 'En prueba' : 'Activo'}
            </span>
          </div>
          <div className="pt-3 border-t border-md-outline-variant">
            <p className="text-xs text-md-on-surface-variant mb-2">
              ¿Tienes preguntas sobre tu plan o necesitas ajustarlo?
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="mailto:hola@kollybry.com"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-md-primary-container text-md-on-primary-container text-xs font-medium hover:bg-md-primary hover:text-white transition-colors"
              >
                <Mail size={12} /> hola@kollybry.com
              </a>
              <a
                href="https://wa.me/5214625902365"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-100 text-green-800 text-xs font-medium hover:bg-green-600 hover:text-white transition-colors"
              >
                <Send size={12} /> WhatsApp
              </a>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  )
}

// ── Role metadata ──────────────────────────────────────────────
const ROLES = [
  { value: 'owner',   label: 'Administrador', icon: Crown,     bg: 'bg-md-primary-container',   text: 'text-md-on-primary-container' },
  { value: 'billing', label: 'Cobranza',       icon: CreditCard, bg: 'bg-amber-100',              text: 'text-amber-800' },
  { value: 'comms',   label: 'Comunicados',    icon: Megaphone, bg: 'bg-green-100',              text: 'text-green-800' },
]
const roleInfo = (role) => ROLES.find(r => r.value === role) || ROLES[2]

function RoleBadge({ role }) {
  const { label, bg, text } = roleInfo(role)
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  )
}

function UserAvatar({ name, email }) {
  const initial = (name || email || '?')[0].toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-md-primary flex items-center justify-center flex-shrink-0">
      <span className="text-white text-sm font-semibold">{initial}</span>
    </div>
  )
}

// ── Invite Modal ───────────────────────────────────────────────
function InviteModal({ onClose, onInvited }) {
  const [email, setEmail] = useState('')
  const [name, setName]   = useState('')
  const [role, setRole]   = useState('comms')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await teamAPI.invite({ email: email.trim(), name: name.trim(), role })
      onInvited(res.data.user)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-md-surface rounded-3xl shadow-md3-3 w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-md-on-surface">Agregar usuario</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-md-surface-container text-md-on-surface-variant">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3 bg-md-error-container rounded-2xl">
            <AlertCircle size={15} className="text-md-on-error-container flex-shrink-0 mt-0.5" />
            <p className="text-sm text-md-on-error-container">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Correo electrónico</label>
            <input
              type="email"
              className="input"
              placeholder="usuario@empresa.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
            <p className="text-xs text-md-on-surface-variant mt-1.5">
              Recibirá un correo para crear su contraseña
            </p>
          </div>

          <div>
            <label className="label">Nombre (opcional)</label>
            <input
              type="text"
              className="input"
              placeholder="Ej. María García"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Rol</label>
            <div className="space-y-2">
              {ROLES.map(r => (
                <label key={r.value} className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer border-2 transition-colors ${role === r.value ? 'border-md-primary bg-md-primary-container/30' : 'border-md-outline-variant hover:bg-md-surface-container'}`}>
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    className="hidden"
                  />
                  <r.icon size={15} className={role === r.value ? 'text-md-primary' : 'text-md-on-surface-variant'} />
                  <div>
                    <p className="text-sm font-medium text-md-on-surface">{r.label}</p>
                    <p className="text-xs text-md-on-surface-variant">
                      {r.value === 'owner'   && 'Acceso completo a todas las funciones'}
                      {r.value === 'billing' && 'Campañas, facturas y contactos'}
                      {r.value === 'comms'   && 'Solo comunicados y difusiones'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
            {loading ? 'Enviando invitación...' : 'Enviar invitación'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Team Section ───────────────────────────────────────────────
function TeamSection({ tenantRole, currentUserId }) {
  const [users, setUsers]       = useState([])
  const [total, setTotal]       = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [removing, setRemoving]   = useState(null)
  const [resending, setResending] = useState(null)
  const [error, setError]         = useState(null)
  const [toast, setToast]         = useState(null)
  const MAX = 5
  const isOwner = tenantRole === 'owner'

  const showToast = (msg, isErr = false) => {
    setToast({ msg, isErr })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    try {
      const res = await teamAPI.list()
      setUsers(res.data.users)
      setTotal(res.data.total)
    } catch (err) {
      console.error('TeamSection load error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleRemove = async (userId) => {
    setRemoving(userId)
    setError(null)
    try {
      await teamAPI.remove(userId)
      setUsers(u => u.filter(m => m.user_id !== userId))
      setTotal(t => t - 1)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setRemoving(null)
    }
  }

  const handleInvited = (user) => {
    setUsers(u => [...u, user])
    setTotal(t => t + 1)
  }

  const handleResend = async (userId) => {
    setResending(userId)
    try {
      await teamAPI.resendInvite(userId)
      showToast('Invitación reenviada')
    } catch (err) {
      showToast(err.response?.data?.error || err.message, true)
    } finally {
      setResending(null)
    }
  }

  return (
    <>
      {showModal && (
        <InviteModal
          onClose={() => setShowModal(false)}
          onInvited={handleInvited}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-full text-sm font-medium shadow-md ${
          toast.isErr ? 'bg-red-100 text-red-700' : 'bg-md-on-surface text-md-surface'
        }`}>
          {toast.isErr ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
          {toast.msg}
        </div>
      )}

      <SectionCard
        icon={Users}
        title="Equipo"
        badge={
          <span className="text-xs text-md-on-surface-variant bg-md-surface-container px-2.5 py-1 rounded-full">
            {total} / {MAX}
          </span>
        }
      >
        {error && (
          <div className="flex items-start gap-2.5 p-3 bg-md-error-container rounded-2xl">
            <AlertCircle size={14} className="text-md-on-error-container flex-shrink-0 mt-0.5" />
            <p className="text-sm text-md-on-error-container">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={20} className="animate-spin text-md-primary" />
          </div>
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.user_id} className="flex items-center gap-3 p-3 rounded-2xl bg-md-surface-container">
                <UserAvatar name={u.name} email={u.email} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-md-on-surface truncate">
                    {u.name || u.email}
                    {u.is_self && <span className="ml-1.5 text-xs text-md-on-surface-variant">(tú)</span>}
                  </p>
                  {u.name && (
                    <p className="text-xs text-md-on-surface-variant truncate">{u.email}</p>
                  )}
                </div>
                <RoleBadge role={u.role} />
                {isOwner && !u.is_self && (
                  <>
                    <button
                      onClick={() => handleResend(u.user_id)}
                      disabled={resending === u.user_id}
                      className="p-1.5 rounded-full text-md-on-surface-variant hover:text-md-primary hover:bg-md-primary-container transition-colors"
                      title="Reenviar invitación"
                    >
                      {resending === u.user_id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Send size={14} />
                      }
                    </button>
                    <button
                      onClick={() => handleRemove(u.user_id)}
                      disabled={removing === u.user_id}
                      className="p-1.5 rounded-full text-md-on-surface-variant hover:text-md-error hover:bg-md-error-container transition-colors"
                      title="Eliminar del equipo"
                    >
                      {removing === u.user_id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Trash2 size={14} />
                      }
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {isOwner && total < MAX && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="btn-secondary text-sm w-full mt-1"
          >
            <UserPlus size={14} />
            Agregar usuario
          </button>
        )}

        {isOwner && total >= MAX && (
          <p className="text-xs text-md-on-surface-variant text-center py-1">
            Límite de {MAX} usuarios alcanzado
          </p>
        )}

        {!isOwner && (
          <p className="text-xs text-md-on-surface-variant">
            Solo el administrador puede gestionar el equipo.
          </p>
        )}
      </SectionCard>
    </>
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
      <p className="text-xs text-md-on-surface-variant -mt-2">
        Cambia la contraseña de <strong>tu cuenta</strong> con la que accedes a Kollybry. Aplica solo a tu usuario, no afecta a otros miembros del equipo.
      </p>
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
