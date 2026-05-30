import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, MessageSquare, Radio, Megaphone,
  ChevronRight, Loader2, X, Send, CheckCheck, Eye, MousePointerClick,
  Users, Calendar, FileText
} from 'lucide-react'
import { campaignsAPI, broadcastsAPI } from '../lib/api.js'

const TYPE_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'comunicado', label: 'Comunicados' },
  { key: 'cobro', label: 'Campañas de cobro' },
]

const STATUS_CONFIG = {
  active: { label: 'Activo', cls: 'bg-green-100 text-green-700' },
  paused: { label: 'Pausado', cls: 'bg-yellow-100 text-yellow-700' },
  sent: { label: 'Enviado', cls: 'bg-md-primary-container text-md-on-primary-container' },
  sending: { label: 'Enviando...', cls: 'bg-orange-100 text-orange-700' },
  draft: { label: 'Borrador', cls: 'bg-md-surface-container-high text-md-on-surface-variant' },
  completed: { label: 'Completado', cls: 'bg-md-secondary-container text-md-on-secondary-container' },
}

function TypeChip({ type }) {
  if (type === 'comunicado') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-md-tertiary-container text-md-on-tertiary-container">
        <Radio size={10} />
        Comunicado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-md-secondary-container text-md-on-secondary-container">
      <Megaphone size={10} />
      Recordatorio
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
          item.type === 'comunicado'
            ? 'bg-md-tertiary-container'
            : 'bg-md-secondary-container'
        }`}>
          {item.type === 'comunicado'
            ? <Radio size={18} className="text-md-on-tertiary-container" />
            : <Megaphone size={18} className="text-md-on-secondary-container" />
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
            <TypeChip type={item.type} />
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
  const fmtDate = (d) => new Date(d).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
  const stats = [
    { icon: Send,             label: 'Enviados',    value: broadcast.sent_count || 0,        color: 'text-blue-600',  bg: 'bg-blue-50' },
    { icon: CheckCheck,       label: 'Entregados',  value: broadcast.delivered_count || 0,   color: 'text-green-600', bg: 'bg-green-50' },
    { icon: Eye,              label: 'Leídos',      value: broadcast.read_count || 0,        color: 'text-md-primary', bg: 'bg-md-primary-container/30' },
    { icon: MousePointerClick,label: 'Clics en liga',value: broadcast.clicked_count || 0,   color: 'text-orange-600', bg: 'bg-orange-50' },
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
            {stats.map(({ icon: Icon, label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-2xl p-3`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={13} className={color} />
                  <p className="text-xs text-md-on-surface-variant font-medium">{label}</p>
                </div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Group */}
          {broadcast.group_filter && (
            <div className="flex items-center gap-2 p-3 bg-md-surface-container rounded-2xl">
              <Users size={14} className="text-md-on-surface-variant" />
              <span className="text-sm text-md-on-surface">Enviado a: <strong>{broadcast.group_filter}</strong></span>
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

export default function MensajesPage() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [broadcasts, setBroadcasts] = useState([])
  const [filter, setFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedBroadcast, setSelectedBroadcast] = useState(null)

  useEffect(() => {
    Promise.all([
      campaignsAPI.list(),
      broadcastsAPI.list({ limit: 50 }).catch(() => ({ data: { broadcasts: [] } }))
    ])
      .then(([cRes, bRes]) => {
        setCampaigns(cRes.data.campaigns || [])
        setBroadcasts(bRes.data.broadcasts || [])
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  // Normalize campaigns + broadcasts into a unified list
  const allItems = [
    ...campaigns.map(c => ({
      id: `campaign-${c.id}`,
      type: 'cobro',
      title: c.name,
      subtitle: `${c.total_contacts || 0} contactos · ${c.grupo_filter || 'Sin grupo'}`,
      sent: c.msg_stats?.sent || 0,
      total: c.total_contacts || 0,
      status: c.status,
      date: c.created_at,
      href: `/campaigns/${c.id}`
    })),
    ...broadcasts.map(b => ({
      id: `broadcast-${b.id}`,
      type: 'comunicado',
      title: b.title,
      subtitle: b.group_filter ? `Grupo: ${b.group_filter}` : 'Todos los contactos',
      sent: b.sent_count || 0,
      total: b.total_contacts || 0,
      status: b.status || 'sent',
      date: b.sent_at || b.created_at,
      href: null,
      broadcastData: b
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  const filtered = filter === 'all'
    ? allItems
    : allItems.filter(i => i.type === filter)

  const counts = {
    all: allItems.length,
    comunicado: allItems.filter(i => i.type === 'comunicado').length,
    cobro: allItems.filter(i => i.type === 'cobro').length,
  }

  return (
    <div className="space-y-5 relative min-h-full pb-24">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-md-on-surface">Mensajes</h1>
        <p className="text-sm text-md-on-surface-variant mt-0.5">
          Comunicados y recordatorios de cobro
        </p>
      </div>

      {/* Type filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {TYPE_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150 ${
              filter === f.key
                ? 'bg-md-secondary-container text-md-on-secondary-container'
                : 'text-md-on-surface-variant hover:bg-md-surface-container border border-md-outline-variant'
            }`}
          >
            {f.label}
            {counts[f.key] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                filter === f.key
                  ? 'bg-md-on-secondary-container/15 text-md-on-secondary-container'
                  : 'bg-md-surface-container text-md-on-surface-variant'
              }`}>
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* List */}
      {!isLoading && (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="card text-center py-16">
              <div className="w-16 h-16 rounded-full bg-md-surface-container-high flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={28} className="text-md-on-surface-variant/40" />
              </div>
              <p className="font-medium text-md-on-surface">
                {filter === 'all' ? 'Aún no hay mensajes' : `Sin ${filter === 'comunicado' ? 'comunicados' : 'recordatorios'}`}
              </p>
              <p className="text-sm text-md-on-surface-variant mt-1">
                Toca <strong>+</strong> para enviar tu primer mensaje
              </p>
            </div>
          )}

          {filtered.map(item => (
            item.broadcastData
              ? <div key={item.id} onClick={() => setSelectedBroadcast(item.broadcastData)}>
                  <MessageCard item={item} />
                </div>
              : <MessageCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Broadcast detail modal */}
      {selectedBroadcast && (
        <BroadcastDetailModal
          broadcast={selectedBroadcast}
          onClose={() => setSelectedBroadcast(null)}
        />
      )}

      {/* FAB */}
      <button
        onClick={() => setShowNewModal(true)}
        className="fab"
        title="Nuevo mensaje"
      >
        <Plus size={26} />
      </button>

      {/* New message type selector (bottom sheet) */}
      {showNewModal && (
        <>
          {/* Scrim */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setShowNewModal(false)}
          />
          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 bg-md-surface-container-low rounded-t-4xl p-6 z-50 shadow-md3-5">
            {/* Drag handle */}
            <div className="w-12 h-1 bg-md-outline-variant rounded-full mx-auto mb-6" />

            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-md-on-surface">Nuevo mensaje</h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-2 rounded-full text-md-on-surface-variant hover:bg-md-surface-container transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-md-on-surface-variant mb-5">¿Qué tipo de mensaje quieres enviar?</p>

            <div className="space-y-3">
              {/* Comunicado option */}
              <button
                onClick={() => { setShowNewModal(false); navigate('/broadcasts') }}
                className="w-full flex items-center gap-4 p-4 rounded-3xl bg-md-tertiary-container hover:bg-md-on-tertiary-container/10 transition-colors text-left group"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/50 flex items-center justify-center flex-shrink-0">
                  <Radio size={24} className="text-md-on-tertiary-container" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-md-on-tertiary-container">Comunicado</p>
                  <p className="text-xs text-md-on-tertiary-container/70 mt-0.5 leading-relaxed">
                    Aviso general a uno o varios grupos de contactos
                  </p>
                </div>
                <ChevronRight size={18} className="text-md-on-tertiary-container/60 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Recordatorio de cobro option */}
              <button
                onClick={() => { setShowNewModal(false); navigate('/campaigns') }}
                className="w-full flex items-center gap-4 p-4 rounded-3xl bg-md-secondary-container hover:bg-md-on-secondary-container/10 transition-colors text-left group"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/50 flex items-center justify-center flex-shrink-0">
                  <Megaphone size={24} className="text-md-on-secondary-container" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-md-on-secondary-container">Recordatorio de cobro</p>
                  <p className="text-xs text-md-on-secondary-container/70 mt-0.5 leading-relaxed">
                    Campaña automática con seguimiento de pagos y reintentos
                  </p>
                </div>
                <ChevronRight size={18} className="text-md-on-secondary-container/60 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Safe area padding for iOS */}
            <div className="h-4" />
          </div>
        </>
      )}
    </div>
  )
}
