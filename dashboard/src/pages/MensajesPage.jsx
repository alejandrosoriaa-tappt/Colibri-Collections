import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, MessageSquare, Radio,
  ChevronRight, Loader2, X, Send, CheckCheck, Eye, MousePointerClick,
  Users, Calendar, FileText, ArrowRight
} from 'lucide-react'
import { broadcastsAPI, contactsAPI } from '../lib/api.js'
import CompositorMensaje from '../components/mensajes/CompositorMensaje.jsx'
import useAuthStore from '../store/authStore.js'
import { getOrgConfig } from '../config/orgTypeConfig.js'

const STATUS_CONFIG = {
  active: { label: 'Activo', cls: 'bg-green-100 text-green-700' },
  paused: { label: 'Pausado', cls: 'bg-yellow-100 text-yellow-700' },
  sent: { label: 'Enviado', cls: 'bg-md-primary-container text-md-on-primary-container' },
  sending: { label: 'Enviando...', cls: 'bg-orange-100 text-orange-700' },
  draft: { label: 'Borrador', cls: 'bg-md-surface-container-high text-md-on-surface-variant' },
  completed: { label: 'Completado', cls: 'bg-md-secondary-container text-md-on-secondary-container' },
}

// Distingue un mensaje dirigido a salones específicos de uno para toda la
// comunidad — es la única diferencia que importa ahora que solo hay comunicados.
function TypeChip({ scope }) {
  const esGeneral = scope === 'general'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      esGeneral
        ? 'bg-md-tertiary-container text-md-on-tertiary-container'
        : 'bg-md-secondary-container text-md-on-secondary-container'
    }`}>
      {esGeneral ? <Radio size={10} /> : <Users size={10} />}
      {esGeneral ? 'Toda la comunidad' : 'Grupos'}
    </span>
  )
}

function MessageCard({ item }) {
  const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft
  const sentPct = item.total > 0 ? Math.round((item.sent / item.total) * 100) : 0

  const inner = (
    <div className="card hover:shadow-md3-2 transition-shadow cursor-pointer group p-4">
      <div className="flex items-start gap-3">
        {/* Icon container */}
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
          item.scope === 'general'
            ? 'bg-md-tertiary-container'
            : 'bg-md-secondary-container'
        }`}>
          {item.scope === 'general'
            ? <Radio size={18} className="text-md-on-tertiary-container" />
            : <Users size={18} className="text-md-on-secondary-container" />
          }
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-md-on-surface text-sm leading-tight truncate">{item.title}</p>
            <ChevronRight
              size={16}
              className="text-md-on-surface-variant flex-shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform"
            />
          </div>

          <p className="text-xs text-md-on-surface-variant mt-0.5 truncate">{item.subtitle}</p>

          {/* Progress bar */}
          {item.total > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 bg-md-surface-container-high rounded-full overflow-hidden">
                <div
                  className="h-full bg-md-primary rounded-full transition-all"
                  style={{ width: `${sentPct}%` }}
                />
              </div>
              <span className="text-xs text-md-on-surface-variant flex-shrink-0">
                {item.sent}/{item.total}
              </span>
            </div>
          )}

          {/* Badges */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <TypeChip scope={item.scope} />
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.cls}`}>
              {sc.label}
            </span>
            <span className="text-xs text-md-on-surface-variant ml-auto flex-shrink-0">
              {new Date(item.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: item.year !== new Date().getFullYear() ? 'numeric' : undefined })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  if (item.href) {
    return <Link to={item.href}>{inner}</Link>
  }
  return <div>{inner}</div>
}

function SkeletonCard() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-md-surface-container-high flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-md-surface-container-high rounded-full w-2/3" />
          <div className="h-3 bg-md-surface-container rounded-full w-1/3" />
          <div className="h-1 bg-md-surface-container rounded-full w-full mt-2" />
          <div className="flex gap-2 mt-1">
            <div className="h-4 bg-md-surface-container rounded-full w-20" />
            <div className="h-4 bg-md-surface-container rounded-full w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Broadcast detail modal ────────────────────────────────────
function BroadcastDetailModal({ broadcast, onClose }) {
  const navigate = useNavigate()
  const { tenant } = useAuthStore()
  const orgConfig = getOrgConfig(tenant?.org_type)
  const [groupContacts, setGroupContacts] = useState([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [showContacts, setShowContacts] = useState(false)

  const fmtDate = (d) => new Date(d).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  const loadContacts = async () => {
    if (showContacts) { setShowContacts(false); return }
    setLoadingContacts(true)
    setShowContacts(true)
    try {
      const grupo = broadcast.group_filter?.split(', ')[0] || broadcast.group_filter
      const res = await contactsAPI.list({ limit: 100, status: 'active', ...(grupo ? { search: '' } : {}) })
      // Filter by any of the broadcast groups
      const groups = (broadcast.group_filter || '').split(', ').map(g => g.trim()).filter(Boolean)
      const filtered = groups.length > 0
        ? (res.data.contacts || []).filter(c => groups.includes(c.grupo))
        : (res.data.contacts || [])
      setGroupContacts(filtered)
    } catch {
      setGroupContacts([])
    } finally {
      setLoadingContacts(false)
    }
  }

  const stats = [
    { icon: Send,             label: 'Enviados',      sub: 'WhatsApp procesó el envío',  value: broadcast.sent_count || 0,      color: 'text-blue-600',   bg: 'bg-blue-50' },
    { icon: CheckCheck,       label: 'Entregados',    sub: 'Llegó al celular',            value: broadcast.delivered_count || 0, color: 'text-green-600',  bg: 'bg-green-50' },
    { icon: Eye,              label: 'Leídos',        sub: 'Abrió el mensaje',            value: broadcast.read_count || 0,      color: 'text-md-primary', bg: 'bg-md-primary-container/30' },
    { icon: MousePointerClick,label: 'Tocaron enlace',sub: 'Abrió el enlace del mensaje', value: broadcast.clicked_count || 0,   color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 bg-md-surface-container-low rounded-t-4xl z-50 shadow-md3-5 max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-md-surface-container-low px-6 pt-6 pb-4 border-b border-md-outline-variant">
          <div className="w-12 h-1 bg-md-outline-variant rounded-full mx-auto mb-4" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-md-tertiary-container flex items-center justify-center flex-shrink-0">
                <Radio size={16} className="text-md-on-tertiary-container" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-md-on-surface text-sm truncate">{broadcast.title}</p>
                <p className="text-xs text-md-on-surface-variant flex items-center gap-1 mt-0.5">
                  <Calendar size={10} />
                  {fmtDate(broadcast.sent_at || broadcast.created_at)}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-md-surface-container text-md-on-surface-variant">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {stats.map(({ icon: Icon, label, sub, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-2xl p-3`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={13} className={color} />
                  <p className="text-xs text-md-on-surface-variant font-medium">{label}</p>
                </div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-md-on-surface-variant/70 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Group + recipients */}
          {broadcast.group_filter && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 p-3 bg-md-surface-container rounded-2xl">
                <div className="flex items-center gap-2 min-w-0">
                  <Users size={14} className="text-md-on-surface-variant flex-shrink-0" />
                  <span className="text-sm text-md-on-surface truncate">
                    Enviado a: <strong>{broadcast.group_filter}</strong>
                  </span>
                </div>
                <button
                  onClick={loadContacts}
                  className="flex items-center gap-1 text-xs text-md-primary font-medium hover:underline flex-shrink-0"
                >
                  {showContacts ? 'Ocultar' : 'Ver papás'}
                  <ArrowRight size={11} />
                </button>
              </div>

              {showContacts && (
                <div className="bg-md-surface-container rounded-2xl overflow-hidden">
                  {loadingContacts ? (
                    <div className="flex justify-center py-4">
                      <Loader2 size={16} className="text-md-primary animate-spin" />
                    </div>
                  ) : groupContacts.length === 0 ? (
                    <p className="text-xs text-md-on-surface-variant text-center py-4">
                      No se encontraron contactos activos en este grupo
                    </p>
                  ) : (
                    <div className="divide-y divide-md-outline-variant/30 max-h-52 overflow-y-auto">
                      {groupContacts.map(c => (
                        <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                          <div className="w-7 h-7 rounded-full bg-md-primary-container flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-md-on-primary-container">
                              {(c.nombre || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-md-on-surface truncate">
                              {[c.nombre, c.apellido].filter(Boolean).join(' ')}
                            </p>
                            {c.nombre_alumno && orgConfig.hasStudent && (
                              <p className="text-xs text-md-on-surface-variant">{orgConfig.studentLabel}: {c.nombre_alumno}</p>
                            )}
                          </div>
                          <p className="text-xs text-md-on-surface-variant font-mono flex-shrink-0">{c.telefono}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {groupContacts.length > 0 && (
                    <div className="px-4 py-2 border-t border-md-outline-variant/30">
                      <p className="text-xs text-md-on-surface-variant">
                        {groupContacts.length} {groupContacts.length !== 1 ? orgConfig.contactLabelPlural.toLowerCase() : orgConfig.contactLabel.toLowerCase()} en el grupo
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!broadcast.group_filter && (
            <div className="flex items-center gap-2 p-3 bg-md-surface-container rounded-2xl">
              <Users size={14} className="text-md-on-surface-variant" />
              <span className="text-sm text-md-on-surface">Enviado a <strong>todos los {orgConfig.contactLabelPlural.toLowerCase()}</strong></span>
            </div>
          )}

          {/* Message body */}
          <div>
            <p className="text-xs font-semibold text-md-on-surface-variant uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <FileText size={12} />
              Mensaje enviado
            </p>
            <div className="bg-md-surface-container rounded-2xl p-4">
              <p className="text-sm text-md-on-surface whitespace-pre-wrap leading-relaxed">{broadcast.message}</p>
            </div>
          </div>
        </div>
        <div className="h-6" />
      </div>
    </>
  )
}

// Copy de cada modo. El motor de envío es el mismo (broadcasts); lo que cambia
// es a quién va dirigido: a salones concretos o a toda la comunidad.
const MODOS = {
  grupos: {
    titulo: 'Mensajes',
    subtitulo: 'Dirigidos a salones o grupos de familias',
    vacio: 'Aún no hay mensajes',
    ayudaVacio: 'Toca + para enviar un mensaje a uno o varios salones',
  },
  general: {
    titulo: 'Comunicados',
    subtitulo: 'Avisos para toda la comunidad',
    vacio: 'Aún no hay comunicados',
    ayudaVacio: 'Toca + para enviar un aviso a toda la comunidad',
  },
}

export default function MensajesPage({ modo = 'grupos' }) {
  const navigate = useNavigate()
  const { tenant } = useAuthStore()
  const orgConfig = getOrgConfig(tenant?.org_type)
  const copy = MODOS[modo] || MODOS.grupos
  const [broadcasts, setBroadcasts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedBroadcast, setSelectedBroadcast] = useState(null)
  const [showCompositor, setShowCompositor] = useState(false)
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    setIsLoading(true)
    broadcastsAPI.list({ limit: 50 })
      .then(res => setBroadcasts(res.data.broadcasts || []))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [modo])

  // Sin grupo seleccionado, el envío salió a toda la comunidad.
  const items = broadcasts
    .filter(b => (b.group_filter ? 'grupos' : 'general') === modo)
    .map(b => ({
      id: `broadcast-${b.id}`,
      scope: b.group_filter ? 'grupos' : 'general',
      title: b.title,
      subtitle: b.group_filter ? `${orgConfig.groupLabel}: ${b.group_filter}` : `Todos los ${orgConfig.contactLabelPlural.toLowerCase()}`,
      sent: b.sent_count || 0,
      total: b.total_contacts || 0,
      status: b.status || 'sent',
      date: b.sent_at || b.created_at,
      href: null,
      broadcastData: b
    })).sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div className="space-y-5 relative min-h-full pb-24">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-md-on-surface">{copy.titulo}</h1>
        <p className="text-sm text-md-on-surface-variant mt-0.5">{copy.subtitulo}</p>
      </div>

      {aviso && (
        <div className="flex items-center gap-2 p-3 bg-md-primary-container rounded-2xl text-sm text-md-on-primary-container">
          <CheckCheck size={15} className="flex-shrink-0" /> {aviso}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* List */}
      {!isLoading && (
        <div className="space-y-3">
          {items.length === 0 && (
            <div className="card text-center py-16">
              <div className="w-16 h-16 rounded-full bg-md-surface-container-high flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={28} className="text-md-on-surface-variant/40" />
              </div>
              <p className="font-medium text-md-on-surface">{copy.vacio}</p>
              <p className="text-sm text-md-on-surface-variant mt-1">{copy.ayudaVacio}</p>
            </div>
          )}

          {items.map(item => (
            item.broadcastData
              ? <div key={item.id} onClick={() => setSelectedBroadcast(item.broadcastData)}>
                  <MessageCard item={item} />
                </div>
              : <MessageCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {showCompositor && (
        <CompositorMensaje
          modo={modo}
          onClose={() => setShowCompositor(false)}
          onSent={(msg) => {
            setShowCompositor(false)
            setAviso(msg)
            setTimeout(() => setAviso(null), 5000)
            setIsLoading(true)
            broadcastsAPI.list({ limit: 50 })
              .then(res => setBroadcasts(res.data.broadcasts || []))
              .catch(console.error)
              .finally(() => setIsLoading(false))
          }}
        />
      )}

      {/* Broadcast detail modal */}
      {selectedBroadcast && (
        <BroadcastDetailModal
          broadcast={selectedBroadcast}
          onClose={() => setSelectedBroadcast(null)}
        />
      )}

      {/* FAB — abre el compositor SOBRE esta pantalla: mandarlo a otra vista
          cambiaba la lista de fondo y el diseño de golpe. */}
      <button
        onClick={() => setShowCompositor(true)}
        className="fab"
        title={modo === 'general' ? 'Nuevo comunicado' : 'Nuevo mensaje'}
      >
        <Plus size={26} />
      </button>

    </div>
  )
}
