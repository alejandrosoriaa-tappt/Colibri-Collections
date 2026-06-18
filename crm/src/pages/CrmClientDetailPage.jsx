import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronRight, Phone, Mail, Globe, MapPin, Building2, Briefcase,
  Save, Edit2, X, Plus, Check, Trash2, Calendar, Clock,
  PhoneCall, AtSign, Users, MessageCircle, Car, FileText, AlertCircle, Send
} from 'lucide-react'
import { crmAPI } from '../lib/api.js'

const STATUS_OPTIONS = [
  { value: 'nuevo_registro', label: 'Nuevo registro' },
  { value: 'prospecto',      label: 'Prospecto' },
  { value: 'contactado',     label: 'Contactado' },
  { value: 'negociacion',    label: 'Negociación' },
  { value: 'cliente',        label: 'Cliente' },
  { value: 'perdido',        label: 'Perdido' },
  { value: 'inactivo',       label: 'Inactivo' },
]

const STATUS_CONFIG = {
  nuevo_registro: { chipOn: 'bg-blue-500 text-white',    chipOff: 'bg-white/40 text-crm-on-primary-container hover:bg-white/60', dot: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-700' },
  prospecto:      { chipOn: 'bg-slate-600 text-white',   chipOff: 'bg-white/40 text-crm-on-primary-container hover:bg-white/60', dot: 'bg-slate-400',  badge: 'bg-slate-100 text-slate-700' },
  contactado:     { chipOn: 'bg-amber-500 text-white',   chipOff: 'bg-white/40 text-crm-on-primary-container hover:bg-white/60', dot: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-800' },
  negociacion:    { chipOn: 'bg-orange-500 text-white',  chipOff: 'bg-white/40 text-crm-on-primary-container hover:bg-white/60', dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-800' },
  cliente:        { chipOn: 'bg-green-600 text-white',   chipOff: 'bg-white/40 text-crm-on-primary-container hover:bg-white/60', dot: 'bg-green-600',  badge: 'bg-green-100 text-green-800' },
  perdido:        { chipOn: 'bg-red-500 text-white',     chipOff: 'bg-white/40 text-crm-on-primary-container hover:bg-white/60', dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700' },
  inactivo:       { chipOn: 'bg-gray-500 text-white',    chipOff: 'bg-white/40 text-crm-on-primary-container hover:bg-white/60', dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-500' },
}

const ACTIVITY_TYPES = [
  { value: 'llamada',   label: 'Llamada',   icon: PhoneCall,    color: 'bg-blue-100 text-blue-700' },
  { value: 'email',     label: 'Correo',    icon: AtSign,       color: 'bg-amber-100 text-amber-700' },
  { value: 'reunion',   label: 'Reunión',   icon: Users,        color: 'bg-purple-100 text-purple-700' },
  { value: 'whatsapp',  label: 'WhatsApp',  icon: MessageCircle,color: 'bg-green-100 text-green-700' },
  { value: 'visita',    label: 'Visita',    icon: Car,          color: 'bg-crm-primary-container text-crm-primary' },
  { value: 'otro',      label: 'Otro',      icon: FileText,     color: 'bg-crm-surface-container text-crm-on-surface-variant' },
]

function formatDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDateShort(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff < 0) return `Vencido (${d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })})`
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' })
}

function isOverdue(iso) {
  return new Date(iso) < new Date()
}

// Blank form for new clients
const BLANK = {
  razon_social: '', nombre_contacto: '', cargo: '', telefono: '',
  email: '', website: '', direccion: '', ciudad: '', estado: '',
  giro: '', notas: '', status: 'nuevo_registro', prioridad: 'media'
}

export default function CrmClientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [client, setClient] = useState(isNew ? BLANK : null)
  const [form, setForm] = useState(BLANK)
  const [editing, setEditing] = useState(isNew)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!isNew)

  // Activity log state
  const [activities, setActivities] = useState([])
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [activityType, setActivityType] = useState('llamada')
  const [activityDesc, setActivityDesc] = useState('')
  const [loggingActivity, setLoggingActivity] = useState(false)

  const [changingStatus, setChangingStatus] = useState(false)

  // Follow-up state
  const [followups, setFollowups] = useState([])
  const [showFollowupForm, setShowFollowupForm] = useState(false)
  const [fuDate, setFuDate] = useState('')
  const [fuDesc, setFuDesc] = useState('')
  const [savingFollowup, setSavingFollowup] = useState(false)

  // Email state
  const [showEmailPanel, setShowEmailPanel] = useState(false)
  const [emailTemplate, setEmailTemplate] = useState(null)
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')   // plain-text for display
  const [emailHtml, setEmailHtml] = useState('')   // actual HTML to send
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  useEffect(() => {
    if (isNew) return
    setLoading(true)
    crmAPI.getClient(id)
      .then(r => {
        const { activities: acts, followups: fus, ...data } = r.data
        setClient(data)
        setForm(data)
        setActivities(acts || [])
        setFollowups(fus || [])
      })
      .catch(() => navigate('/crm/clients'))
      .finally(() => setLoading(false))
  }, [id])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSave() {
    if (!form.razon_social?.trim()) return alert('La razón social es requerida')
    setSaving(true)
    try {
      if (isNew) {
        const r = await crmAPI.createClient(form)
        navigate(`/crm/clients/${r.data.id}`, { replace: true })
      } else {
        const r = await crmAPI.updateClient(id, form)
        setClient(r.data)
        setForm(r.data)
        setEditing(false)
      }
    } catch (err) {
      alert('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    if (isNew) { navigate('/crm/clients'); return }
    setForm(client)
    setEditing(false)
  }

  async function handleLogActivity() {
    if (!activityType) return
    setLoggingActivity(true)
    try {
      const r = await crmAPI.logActivity(id, { tipo: activityType, descripcion: activityDesc || null })
      setActivities(prev => [r.data, ...prev])
      setActivityDesc('')
      setShowActivityForm(false)
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setLoggingActivity(false)
    }
  }

  async function handleQuickActivity(tipo) {
    if (isNew) return
    try {
      const r = await crmAPI.logActivity(id, { tipo })
      setActivities(prev => [r.data, ...prev])
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  async function handleSaveFollowup() {
    if (!fuDate || !fuDesc.trim()) return alert('Completa fecha y descripción')
    setSavingFollowup(true)
    try {
      const r = await crmAPI.createFollowup(id, { fecha_recordatorio: fuDate, descripcion: fuDesc })
      setFollowups(prev => [...prev, r.data].sort((a, b) => new Date(a.fecha_recordatorio) - new Date(b.fecha_recordatorio)))
      setFuDate('')
      setFuDesc('')
      setShowFollowupForm(false)
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSavingFollowup(false)
    }
  }

  async function handleToggleFollowup(fu) {
    try {
      const r = await crmAPI.updateFollowup(fu.id, { completado: !fu.completado })
      setFollowups(prev => prev.map(f => f.id === fu.id ? r.data : f))
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  async function handleDeleteFollowup(fuId) {
    if (!confirm('¿Eliminar este recordatorio?')) return
    try {
      await crmAPI.deleteFollowup(fuId)
      setFollowups(prev => prev.filter(f => f.id !== fuId))
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  // ── Email helpers ────────────────────────────────────────────────────────────

  function htmlToPlain(html) {
    // Strip tags, decode entities, collapse whitespace
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  // Template definitions (mirrored from backend for preview — actual render happens server-side)
  const EMAIL_TEMPLATES = {
    frio: {
      label: 'Frío',
      buildSubject: (c) => `NKUVO — Soluciones digitales para ${c.razon_social || 'su organización'}`,
      buildBody: (c) => {
        const nombre = c.nombre_contacto?.split(' ')[0] || c.razon_social || 'Estimado/a'
        const tipo = (c.giro === 'Colegio' || c.giro === 'Academia') ? 'colegios e instituciones educativas' : 'condominios y comunidades residenciales'
        return `Buen día, ${nombre}.\n\nLe escribo de parte de NKUVO, una plataforma diseñada para modernizar la gestión de ${tipo}.\n\nCon NKUVO, su equipo puede administrar pagos, comunicados, seguimiento de incidencias y reportes — todo desde un solo lugar, sin papeleos ni hojas de cálculo.\n\nMe gustaría mostrarle cómo otras organizaciones similares a la suya ya están ahorrando tiempo y mejorando la experiencia de sus usuarios con nuestra plataforma.\n\n¿Tendría 20 minutos esta semana para una llamada rápida?\n\nQuedo a sus órdenes.\n\nAlejandro Soria\nNKUVO`
      },
    },
    followup: {
      label: 'Follow-up',
      buildSubject: () => 'Seguimiento — NKUVO',
      buildBody: (c) => {
        const nombre = c.nombre_contacto?.split(' ')[0] || c.razon_social || 'Estimado/a'
        return `Hola, ${nombre}.\n\nLe escribo para dar seguimiento a nuestra conversación anterior sobre NKUVO.\n\nEntiendo que el día a día de su organización está lleno de prioridades, por lo que quería retomar el contacto y ver si surge la oportunidad de platicar con más calma sobre cómo podríamos apoyarles.\n\nSi tiene alguna pregunta concreta o le gustaría ver una demostración de la plataforma, con gusto lo agendamos a la brevedad.\n\n¿Qué días y horarios le vendrían mejor?\n\nMuchas gracias por su tiempo.\n\nAlejandro Soria\nNKUVO`
      },
    },
    propuesta: {
      label: 'Propuesta',
      buildSubject: (c) => `Propuesta NKUVO para ${c.razon_social || 'su organización'}`,
      buildBody: (c) => {
        const nombre = c.nombre_contacto?.split(' ')[0] || c.razon_social || 'Estimado/a'
        const empresa = c.razon_social || 'su organización'
        return `Hola, ${nombre}.\n\nConforme a lo conversado, me complace enviarle la propuesta de NKUVO para ${empresa}.\n\n[Adjunto encontrarás nuestra presentación — enlace por agregar]\n\nEn resumen, la propuesta incluye:\n• Acceso completo a la plataforma NKUVO\n• Onboarding y capacitación inicial para su equipo\n• Soporte técnico incluido durante el primer año\n• Configuración personalizada según sus procesos\n\nCon gusto resuelvo cualquier duda que tenga sobre los alcances o condiciones. ¿Le parece si agendamos una llamada de revisión esta semana?\n\nQuedo en espera de sus comentarios.\n\nAlejandro Soria\nNKUVO`
      },
    },
    cierre: {
      label: 'Cierre',
      buildSubject: (c) => `Próximos pasos — NKUVO para ${c.razon_social || 'su organización'}`,
      buildBody: (c) => {
        const nombre = c.nombre_contacto?.split(' ')[0] || c.razon_social || 'Estimado/a'
        const empresa = c.razon_social || 'su organización'
        return `Hola, ${nombre}.\n\nHa sido un placer platicar con usted sobre las necesidades de ${empresa}. Creo que NKUVO puede ser una solución muy valiosa para su equipo.\n\nPara avanzar, el siguiente paso sería confirmar el plan seleccionado y firmar el acuerdo de servicio. El proceso de alta toma menos de 48 horas hábiles.\n\nEnvíeme su confirmación y de inmediato coordinamos los detalles con nuestro equipo de implementación.\n\nEstamos listos para comenzar cuando usted lo indique.\n\nAlejandro Soria\nNKUVO`
      },
    },
  }

  function selectEmailTemplate(key) {
    const tmpl = EMAIL_TEMPLATES[key]
    if (!tmpl || !client) return
    setEmailTemplate(key)
    setEmailSubject(tmpl.buildSubject(client))
    const plain = tmpl.buildBody(client)
    setEmailBody(plain)
    // Store template key so backend renders proper HTML; body is plain-text preview only
    setEmailHtml(key)
  }

  function openEmailPanel() {
    setEmailTemplate(null)
    setEmailTo(client?.email || '')
    setEmailSubject('')
    setEmailBody('')
    setEmailHtml('')
    setEmailSent(false)
    setShowEmailPanel(true)
  }

  async function handleSendEmail() {
    if (!emailTo.trim()) return alert('Ingresa el correo del destinatario')
    if (!emailSubject.trim()) return alert('El asunto es requerido')
    if (!emailBody.trim()) return alert('El mensaje no puede estar vacío')
    setSendingEmail(true)
    try {
      // Send template name so backend renders proper HTML; subject may have been customized
      const payload = emailTemplate
        ? { template: emailTemplate, to: emailTo, subject: emailSubject }
        : { to: emailTo, subject: emailSubject, html: `<p>${emailBody.replace(/\n/g, '<br>')}</p>` }
      const r = await crmAPI.sendEmail(id, payload)
      if (r.data.ok === false && r.data.reason === 'not_configured') {
        alert('El envío de correo no está configurado en el servidor. Contacta al administrador.')
        return
      }
      // Optimistically add activity to list
      setActivities(prev => [{
        id: `tmp-${Date.now()}`,
        tipo: 'email',
        descripcion: emailSubject,
        fecha: new Date().toISOString(),
      }, ...prev])
      setEmailSent(true)
      setTimeout(() => {
        setShowEmailPanel(false)
        setEmailSent(false)
      }, 2000)
    } catch (err) {
      alert('Error al enviar: ' + (err.response?.data?.error || err.message))
    } finally {
      setSendingEmail(false)
    }
  }

  async function handleStatusChange(newStatus) {
    if (isNew || !client || changingStatus) return
    setChangingStatus(newStatus)
    try {
      const r = await crmAPI.updateClient(id, { ...form, status: newStatus })
      setClient(r.data)
      setForm(r.data)
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setChangingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-crm-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[form.status] || STATUS_CONFIG.prospecto

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-24 sm:pb-0">

      {/* Mobile sticky save bar */}
      {editing && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-crm-surface border-t border-crm-outline-variant px-4 py-3 flex gap-3 shadow-md3-3">
          <button
            onClick={handleCancel}
            className="flex-1 py-3 rounded-full border border-crm-outline-variant text-sm font-medium text-crm-on-surface-variant hover:bg-crm-surface-container transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-crm-primary text-crm-on-primary py-3 rounded-full text-sm font-medium shadow-md3-1 disabled:opacity-60"
          >
            {saving
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Save size={15} /> {isNew ? 'Crear cliente' : 'Guardar'}</>
            }
          </button>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-crm-on-surface-variant">
        <Link to="/crm" className="hover:text-crm-primary transition-colors">CRM</Link>
        <ChevronRight size={12} />
        <Link to="/crm/clients" className="hover:text-crm-primary transition-colors">Clientes</Link>
        <ChevronRight size={12} />
        <span className="text-crm-on-surface font-medium truncate max-w-xs">
          {isNew ? 'Nuevo cliente' : (client?.razon_social || '…')}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left column: client card ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Client info card */}
          <div className="bg-crm-surface rounded-3xl border border-crm-outline-variant shadow-md3-1 overflow-hidden">

            {/* Card header */}
            <div className="bg-crm-primary-container px-6 pt-6 pb-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-crm-primary shadow-md3-2 flex items-center justify-center text-crm-on-primary font-bold text-xl flex-shrink-0">
                    {(form.razon_social || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    {editing ? (
                      <input
                        name="razon_social"
                        value={form.razon_social}
                        onChange={handleChange}
                        placeholder="Razón social / Empresa *"
                        className="text-lg font-bold bg-white/60 rounded-xl px-3 py-1 border border-crm-outline-variant focus:outline-none focus:ring-2 focus:ring-crm-primary/30 w-full min-w-0"
                      />
                    ) : (
                      <h2 className="text-lg font-bold text-crm-on-primary-container leading-tight">
                        {client?.razon_social || 'Nuevo cliente'}
                      </h2>
                    )}
                    {editing ? (
                      <div className="flex gap-2 mt-1.5">
                        <input
                          name="nombre_contacto"
                          value={form.nombre_contacto}
                          onChange={handleChange}
                          placeholder="Nombre del contacto"
                          className="text-sm bg-white/60 rounded-xl px-2 py-0.5 border border-crm-outline-variant focus:outline-none w-36"
                        />
                        <input
                          name="cargo"
                          value={form.cargo}
                          onChange={handleChange}
                          placeholder="Cargo"
                          className="text-sm bg-white/60 rounded-xl px-2 py-0.5 border border-crm-outline-variant focus:outline-none w-28"
                        />
                      </div>
                    ) : (
                      client?.nombre_contacto && (
                        <p className="text-sm text-crm-on-primary-container/80 mt-0.5">
                          {client.nombre_contacto}{client.cargo ? ` · ${client.cargo}` : ''}
                        </p>
                      )
                    )}
                  </div>
                </div>

                {/* Edit / Save controls — desktop */}
                <div className="hidden sm:flex gap-2 flex-shrink-0">
                  {editing ? (
                    <>
                      <button
                        onClick={handleCancel}
                        className="p-2 rounded-full hover:bg-black/10 text-crm-on-primary-container transition-colors"
                        title="Cancelar"
                      >
                        <X size={16} />
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 bg-crm-primary text-crm-on-primary px-3 py-1.5 rounded-full text-sm font-medium shadow-md3-1 hover:shadow-md3-2 transition-shadow disabled:opacity-60"
                      >
                        {saving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={14} />}
                        {isNew ? 'Crear' : 'Guardar'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 bg-white/60 hover:bg-white/80 text-crm-on-primary-container px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                    >
                      <Edit2 size={14} /> Editar
                    </button>
                  )}
                </div>
                {/* Cancel button — mobile only (save bar is at bottom) */}
                {editing && (
                  <button
                    onClick={handleCancel}
                    className="sm:hidden p-2 rounded-full hover:bg-black/10 text-crm-on-primary-container transition-colors flex-shrink-0"
                    title="Cancelar"
                  >
                    <X size={16} />
                  </button>
                )}
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="sm:hidden flex items-center gap-1.5 bg-white/60 hover:bg-white/80 text-crm-on-primary-container px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex-shrink-0"
                  >
                    <Edit2 size={14} /> Editar
                  </button>
                )}
              </div>

              {/* Status chips */}
              {!isNew && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {STATUS_OPTIONS.map(opt => {
                    const cfg    = STATUS_CONFIG[opt.value]
                    const active = form.status === opt.value
                    const loading = changingStatus === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleStatusChange(opt.value)}
                        disabled={!!changingStatus}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border-0 transition-all shadow-sm disabled:cursor-wait ${
                          active ? cfg.chipOn : cfg.chipOff
                        }`}
                      >
                        {loading
                          ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : active
                          ? <Check size={11} strokeWidth={3} />
                          : <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        }
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Card body: fields */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Giro / Industria" icon={<Briefcase size={14} />} editing={editing}>
                {editing ? (
                  <select name="giro" value={form.giro} onChange={handleChange} className={inputCls}>
                    <option value="">— Seleccionar —</option>
                    <option value="Colegio">Colegio</option>
                    <option value="Condominio">Condominio</option>
                    <option value="Gimnasio">Gimnasio</option>
                    <option value="Academia">Academia</option>
                    <option value="Estudio">Estudio</option>
                    <option value="Otro">Otro</option>
                  </select>
                ) : (
                  <span>{client?.giro || <Empty />}</span>
                )}
              </Field>

              <Field label="Teléfono" icon={<Phone size={14} />} editing={editing}>
                {editing ? (
                  <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="+52 55 1234 5678" className={inputCls} />
                ) : (
                  client?.telefono
                    ? <a href={`tel:${client.telefono}`} className="text-crm-primary hover:underline">{client.telefono}</a>
                    : <Empty />
                )}
              </Field>

              <Field label="Correo electrónico" icon={<Mail size={14} />} editing={editing}>
                {editing ? (
                  <input name="email" value={form.email} onChange={handleChange} placeholder="contacto@empresa.com" className={inputCls} type="email" />
                ) : (
                  client?.email
                    ? <a href={`mailto:${client.email}`} className="text-crm-primary hover:underline truncate">{client.email}</a>
                    : <Empty />
                )}
              </Field>

              <Field label="Sitio web" icon={<Globe size={14} />} editing={editing}>
                {editing ? (
                  <input name="website" value={form.website} onChange={handleChange} placeholder="https://empresa.com" className={inputCls} />
                ) : (
                  client?.website
                    ? <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-crm-primary hover:underline truncate">{client.website}</a>
                    : <Empty />
                )}
              </Field>

              <Field label="Ciudad" icon={<MapPin size={14} />} editing={editing}>
                {editing ? (
                  <input name="ciudad" value={form.ciudad} onChange={handleChange} placeholder="Ciudad de México" className={inputCls} />
                ) : (
                  <span>{[client?.ciudad, client?.estado].filter(Boolean).join(', ') || <Empty />}</span>
                )}
              </Field>

              {editing && (
                <Field label="Estado" icon={<MapPin size={14} />} editing>
                  <input name="estado" value={form.estado} onChange={handleChange} placeholder="CDMX, Jalisco…" className={inputCls} />
                </Field>
              )}

              <Field label="Dirección" icon={<Building2 size={14} />} editing={editing} full>
                {editing ? (
                  <input name="direccion" value={form.direccion} onChange={handleChange} placeholder="Calle, colonia, CP…" className={inputCls} />
                ) : (
                  <span>{client?.direccion || <Empty />}</span>
                )}
              </Field>

              {/* Prioridad */}
              <Field label="Prioridad" icon={<AlertCircle size={14} />} editing={editing}>
                {editing ? (
                  <select name="prioridad" value={form.prioridad} onChange={handleChange} className={inputCls}>
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                ) : (
                  <span className={`font-medium ${
                    client?.prioridad === 'alta' ? 'text-red-600' :
                    client?.prioridad === 'baja' ? 'text-slate-400' : 'text-amber-600'
                  }`}>
                    {client?.prioridad === 'alta' ? '●●●' : client?.prioridad === 'baja' ? '●○○' : '●●○'}{' '}
                    {client?.prioridad?.charAt(0).toUpperCase() + client?.prioridad?.slice(1)}
                  </span>
                )}
              </Field>

              {/* Notas */}
              <Field label="Notas" icon={<FileText size={14} />} editing={editing} full>
                {editing ? (
                  <textarea
                    name="notas"
                    value={form.notas}
                    onChange={handleChange}
                    placeholder="Observaciones, contexto, detalles importantes…"
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                ) : (
                  <span className="whitespace-pre-line">{client?.notas || <Empty />}</span>
                )}
              </Field>
            </div>
          </div>

          {/* Quick activity buttons */}
          {!isNew && (
            <div className="bg-crm-surface rounded-3xl border border-crm-outline-variant shadow-md3-1 p-5">
              <p className="text-xs font-semibold text-crm-on-surface-variant uppercase tracking-widest mb-3">
                Registrar actividad rápida
              </p>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_TYPES.slice(0, 4).map(t => (
                  <button
                    key={t.value}
                    onClick={() => {
                      setActivityType(t.value)
                      setShowActivityForm(true)
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium border border-transparent hover:shadow-md3-1 transition-all ${t.color}`}
                  >
                    <t.icon size={14} /> {t.label}
                  </button>
                ))}
                <button
                  onClick={() => setShowActivityForm(v => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium border border-crm-outline-variant text-crm-on-surface-variant hover:bg-crm-surface-container transition-all"
                >
                  <Plus size={14} /> Otra
                </button>
                <button
                  onClick={openEmailPanel}
                  className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium border border-crm-outline-variant text-crm-on-surface-variant hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-all"
                >
                  <Send size={14} /> Enviar correo
                </button>
              </div>

              {showActivityForm && (
                <div className="mt-4 p-4 bg-crm-surface-container-low rounded-2xl space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    {ACTIVITY_TYPES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setActivityType(t.value)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                          activityType === t.value
                            ? `${t.color} ring-2 ring-offset-1`
                            : 'bg-crm-surface-container text-crm-on-surface-variant hover:bg-crm-surface-container-high'
                        }`}
                      >
                        <t.icon size={11} /> {t.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={activityDesc}
                    onChange={e => setActivityDesc(e.target.value)}
                    placeholder="Describe qué pasó (opcional)…"
                    rows={2}
                    className="w-full text-sm border border-crm-outline-variant rounded-2xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-crm-primary/30 bg-crm-surface resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowActivityForm(false)} className="px-3 py-1.5 rounded-full text-sm text-crm-on-surface-variant hover:bg-crm-surface-container transition-colors">
                      Cancelar
                    </button>
                    <button
                      onClick={handleLogActivity}
                      disabled={loggingActivity}
                      className="flex items-center gap-1.5 bg-crm-primary text-crm-on-primary px-4 py-1.5 rounded-full text-sm font-medium disabled:opacity-60"
                    >
                      {loggingActivity ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={13} />}
                      Registrar
                    </button>
                  </div>
                </div>
              )}

              {/* Email compose panel */}
              {showEmailPanel && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-amber-800 uppercase tracking-widest">Nuevo correo</p>
                    <button
                      onClick={() => setShowEmailPanel(false)}
                      className="text-amber-600 hover:text-amber-800 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Template chips */}
                  <div>
                    <p className="text-xs text-amber-700 mb-1.5 font-medium">Plantilla</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(EMAIL_TEMPLATES).map(([key, tmpl]) => (
                        <button
                          key={key}
                          onClick={() => selectEmailTemplate(key)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            emailTemplate === key
                              ? 'bg-amber-600 text-white'
                              : 'bg-white border border-amber-300 text-amber-700 hover:bg-amber-100'
                          }`}
                        >
                          {emailTemplate === key && <Check size={10} className="inline mr-1" />}
                          {tmpl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* To field */}
                  <div>
                    <label className="text-xs font-medium text-amber-800 mb-1 block">Para:</label>
                    {!client?.email && (
                      <p className="text-xs text-amber-700 bg-amber-100 rounded-lg px-2 py-1 mb-1">
                        Este cliente no tiene email registrado — puedes ingresarlo manualmente
                      </p>
                    )}
                    <input
                      type="email"
                      value={emailTo}
                      onChange={e => setEmailTo(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="w-full text-sm border border-amber-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/40 bg-white"
                    />
                  </div>

                  {/* Subject field */}
                  <div>
                    <label className="text-xs font-medium text-amber-800 mb-1 block">Asunto:</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                      placeholder="Asunto del correo"
                      className="w-full text-sm border border-amber-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/40 bg-white"
                    />
                  </div>

                  {/* Body textarea */}
                  <div>
                    <label className="text-xs font-medium text-amber-800 mb-1 block">Mensaje:</label>
                    <textarea
                      value={emailBody}
                      onChange={e => {
                        setEmailBody(e.target.value)
                        // If user edits body, detach from template so we send custom html
                        if (emailTemplate) setEmailHtml(null)
                      }}
                      placeholder="Escribe el mensaje o selecciona una plantilla arriba…"
                      rows={8}
                      className="w-full text-sm border border-amber-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/40 bg-white resize-none font-mono"
                    />
                    {emailTemplate && (
                      <p className="text-xs text-amber-600 mt-1">
                        El correo se enviará con formato HTML. Puedes editar el texto arriba para personalizar.
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowEmailPanel(false)}
                      className="px-3 py-1.5 rounded-full text-sm text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSendEmail}
                      disabled={sendingEmail || emailSent}
                      className="flex items-center gap-1.5 bg-amber-600 text-white px-4 py-1.5 rounded-full text-sm font-medium disabled:opacity-60 hover:bg-amber-700 transition-colors"
                    >
                      {emailSent ? (
                        <><Check size={13} /> Correo enviado</>
                      ) : sendingEmail ? (
                        <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando…</>
                      ) : (
                        <><Send size={13} /> Enviar</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Activity timeline */}
          {!isNew && (
            <div className="bg-crm-surface rounded-3xl border border-crm-outline-variant shadow-md3-1 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-crm-on-surface">Historial de actividad</h3>
                <span className="text-xs text-crm-on-surface-variant bg-crm-surface-container px-2 py-0.5 rounded-full">
                  {activities.length} registro{activities.length !== 1 ? 's' : ''}
                </span>
              </div>

              {activities.length === 0 ? (
                <div className="text-center py-6">
                  <Clock size={24} className="text-crm-outline mx-auto mb-2" />
                  <p className="text-sm text-crm-on-surface-variant">Sin actividad registrada</p>
                  <p className="text-xs text-crm-on-surface-variant/60 mt-1">Usa los botones de arriba para registrar tu primera interacción</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {activities.map((act, idx) => {
                    const typeCfg = ACTIVITY_TYPES.find(t => t.value === act.tipo) || ACTIVITY_TYPES[5]
                    const Icon = typeCfg.icon
                    return (
                      <div key={act.id} className="flex gap-3">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${typeCfg.color}`}>
                            <Icon size={14} />
                          </div>
                          {idx < activities.length - 1 && (
                            <div className="w-0.5 flex-1 my-1 bg-crm-outline-variant" />
                          )}
                        </div>
                        <div className="pb-4 flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-medium text-crm-on-surface">{typeCfg.label}</span>
                            <span className="text-xs text-crm-on-surface-variant flex-shrink-0">{formatDateTime(act.fecha)}</span>
                          </div>
                          {act.descripcion && (
                            <p className="text-sm text-crm-on-surface-variant mt-0.5 leading-relaxed">{act.descripcion}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right column: follow-ups ── */}
        {!isNew && (
          <div className="space-y-4">
            <div className="bg-crm-surface rounded-3xl border border-crm-outline-variant shadow-md3-1 p-5 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-crm-primary" />
                  <h3 className="font-semibold text-crm-on-surface">Follow-ups</h3>
                </div>
                <button
                  onClick={() => setShowFollowupForm(v => !v)}
                  className="w-7 h-7 rounded-full bg-crm-primary text-crm-on-primary flex items-center justify-center hover:shadow-md3-1 transition-shadow"
                >
                  <Plus size={14} />
                </button>
              </div>

              {showFollowupForm && (
                <div className="mb-4 p-4 bg-crm-surface-container-low rounded-2xl space-y-3 border border-crm-outline-variant">
                  <div>
                    <label className="text-xs font-medium text-crm-on-surface-variant mb-1 block">Fecha y hora</label>
                    <input
                      type="datetime-local"
                      value={fuDate}
                      onChange={e => setFuDate(e.target.value)}
                      className="w-full text-sm border border-crm-outline-variant rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-crm-primary/30 bg-crm-surface"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-crm-on-surface-variant mb-1 block">¿Qué hay que hacer?</label>
                    <input
                      type="text"
                      value={fuDesc}
                      onChange={e => setFuDesc(e.target.value)}
                      placeholder="Llamar para dar seguimiento…"
                      className="w-full text-sm border border-crm-outline-variant rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-crm-primary/30 bg-crm-surface"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowFollowupForm(false)} className="px-3 py-1 rounded-full text-sm text-crm-on-surface-variant hover:bg-crm-surface-container transition-colors">
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveFollowup}
                      disabled={savingFollowup}
                      className="flex items-center gap-1.5 bg-crm-primary text-crm-on-primary px-3 py-1 rounded-full text-sm font-medium disabled:opacity-60"
                    >
                      {savingFollowup ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={12} />}
                      Guardar
                    </button>
                  </div>
                </div>
              )}

              {followups.length === 0 ? (
                <div className="text-center py-6">
                  <Clock size={24} className="text-crm-outline mx-auto mb-2" />
                  <p className="text-sm text-crm-on-surface-variant">Sin recordatorios</p>
                  <button
                    onClick={() => setShowFollowupForm(true)}
                    className="text-xs text-crm-primary hover:underline mt-1"
                  >
                    + Agregar recordatorio
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {followups.map(fu => {
                    const overdue = !fu.completado && isOverdue(fu.fecha_recordatorio)
                    return (
                      <div
                        key={fu.id}
                        className={`flex items-start gap-3 p-3 rounded-2xl transition-colors group ${
                          fu.completado
                            ? 'bg-crm-surface-container opacity-60'
                            : overdue
                            ? 'bg-red-50 border border-red-100'
                            : 'bg-crm-surface-container-low'
                        }`}
                      >
                        <button
                          onClick={() => handleToggleFollowup(fu)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                            fu.completado
                              ? 'bg-crm-primary border-crm-primary'
                              : overdue
                              ? 'border-red-400 hover:border-red-600'
                              : 'border-crm-outline hover:border-crm-primary'
                          }`}
                        >
                          {fu.completado && <Check size={10} className="text-crm-on-primary" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-tight ${fu.completado ? 'line-through text-crm-on-surface-variant' : 'text-crm-on-surface'}`}>
                            {fu.descripcion}
                          </p>
                          <p className={`text-xs mt-0.5 font-medium ${
                            fu.completado ? 'text-crm-on-surface-variant/60' :
                            overdue ? 'text-red-600' : 'text-crm-primary'
                          }`}>
                            {overdue && !fu.completado && <AlertCircle size={10} className="inline mr-0.5" />}
                            {formatDateShort(fu.fecha_recordatorio)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteFollowup(fu.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-full text-crm-on-surface-variant hover:text-crm-error transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Tappt integration hint */}
              <div className="mt-4 pt-4 border-t border-crm-outline-variant">
                <p className="text-xs text-crm-on-surface-variant/70 text-center leading-relaxed">
                  Próximamente: recordatorios automáticos vía <span className="font-semibold text-crm-primary">Tappt</span> por WhatsApp
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const inputCls = 'w-full text-sm border border-crm-outline-variant rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-crm-primary/30 bg-crm-surface text-crm-on-surface'

function Field({ label, icon, children, full }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="flex items-center gap-1.5 text-xs font-medium text-crm-on-surface-variant mb-1.5">
        <span className="text-crm-on-surface-variant/60">{icon}</span>
        {label}
      </label>
      <div className="text-sm text-crm-on-surface">{children}</div>
    </div>
  )
}

function Empty() {
  return <span className="text-crm-on-surface-variant/40 italic">—</span>
}
