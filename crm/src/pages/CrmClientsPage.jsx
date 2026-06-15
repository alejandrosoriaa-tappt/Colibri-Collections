import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus, Search, ChevronRight, Building2, Phone,
  MapPin, X, Briefcase, Clock, GitCommitHorizontal
} from 'lucide-react'
import { crmAPI } from '../lib/api.js'

const STATUS_CONFIG = {
  nuevo_registro: { label: 'Nuevo registro', color: 'bg-blue-50 text-blue-700',     dot: 'bg-blue-400' },
  prospecto:      { label: 'Prospecto',      color: 'bg-slate-100 text-slate-700',   dot: 'bg-slate-400' },
  contactado:     { label: 'Contactado',     color: 'bg-amber-100 text-amber-800',   dot: 'bg-amber-500' },
  negociacion:    { label: 'Negociación',    color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  cliente:        { label: 'Cliente',        color: 'bg-green-100 text-green-800',   dot: 'bg-green-600' },
  perdido:        { label: 'Perdido',        color: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
  inactivo:       { label: 'Inactivo',       color: 'bg-gray-100 text-gray-500',     dot: 'bg-gray-400' },
}

const STATUS_ORDER = ['nuevo_registro', 'prospecto', 'contactado', 'negociacion', 'cliente', 'perdido', 'inactivo']
const PRIO_ORDER   = ['alta', 'media', 'baja']
const GIRO_TABS    = ['Todos', 'Colegio', 'Condominio', 'Gimnasio', 'Academia', 'Estudio', 'Otro']

const PRIORIDAD_CONFIG = {
  alta:  { label: 'Alta',  color: 'text-red-600',   icon: '●●●' },
  media: { label: 'Media', color: 'text-amber-600',  icon: '●●○' },
  baja:  { label: 'Baja',  color: 'text-slate-400',  icon: '●○○' },
}

function relativeTime(iso) {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60)          return 'Ahora'
  if (diff < 3600)        return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400)       return `Hace ${Math.floor(diff / 3600)}h`
  if (diff < 86400 * 2)   return 'Ayer'
  if (diff < 86400 * 7)   return `Hace ${Math.floor(diff / 86400)} días`
  if (diff < 86400 * 30)  return `Hace ${Math.floor(diff / 86400 / 7)} sem`
  if (diff < 86400 * 365) return `Hace ${Math.floor(diff / 86400 / 30)} mes`
  return `Hace ${Math.floor(diff / 86400 / 365)} año`
}

export default function CrmClientsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [allClients, setAllClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(null)

  // Three independent filters — each can be active at the same time
  const giroTab         = searchParams.get('giro')      || 'Todos'
  const statusFilter    = searchParams.get('status')    || ''
  const prioridadFilter = searchParams.get('prioridad') || ''
  const sortBy          = searchParams.get('sort')      || 'pipeline'

  useEffect(() => {
    setLoading(true)
    crmAPI.listClients({})
      .then(r => setAllClients(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Single function to update one or more URL params at once
  function setFilter(updates) {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    setSearchParams(next)
  }

  function clearAllFilters() {
    setSearchParams({})
    setSearch('')
  }

  async function handleDelete(e, id) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return
    setDeleting(id)
    try {
      await crmAPI.deleteClient(id)
      setAllClients(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      alert('Error al eliminar: ' + err.message)
    } finally {
      setDeleting(null)
    }
  }

  // Count per industry tab (always based on all clients)
  const giroCounts = useMemo(() => {
    const counts = { Todos: allClients.length }
    GIRO_TABS.slice(1).forEach(g => {
      counts[g] = allClients.filter(c => c.giro === g).length
    })
    return counts
  }, [allClients])

  // Count per status (based on selected industry tab only)
  const statusCounts = useMemo(() => {
    const base = giroTab === 'Todos' ? allClients : allClients.filter(c => c.giro === giroTab)
    const counts = {}
    STATUS_ORDER.forEach(s => { counts[s] = base.filter(c => c.status === s).length })
    return counts
  }, [allClients, giroTab])

  // Final filtered + sorted list
  const clients = useMemo(() => {
    let list = allClients
    if (giroTab !== 'Todos') list = list.filter(c => c.giro === giroTab)
    if (statusFilter)        list = list.filter(c => c.status === statusFilter)
    if (prioridadFilter)     list = list.filter(c => c.prioridad === prioridadFilter)
    if (search.trim())       list = list.filter(c =>
      c.razon_social?.toLowerCase().includes(search.toLowerCase().trim())
    )
    return [...list].sort((a, b) => {
      if (sortBy === 'reciente') return new Date(b.updated_at) - new Date(a.updated_at)
      const si = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
      if (si !== 0) return si
      return PRIO_ORDER.indexOf(a.prioridad) - PRIO_ORDER.indexOf(b.prioridad)
    })
  }, [allClients, giroTab, statusFilter, prioridadFilter, search, sortBy])

  // Tags that show what's currently filtered — each has its own remove button
  const activeTags = [
    statusFilter    && { label: STATUS_CONFIG[statusFilter]?.label,              clear: () => setFilter({ status: '' }) },
    prioridadFilter && { label: `Prioridad ${PRIORIDAD_CONFIG[prioridadFilter]?.label}`, clear: () => setFilter({ prioridad: '' }) },
    search.trim()   && { label: `"${search}"`,                                   clear: () => setSearch('') },
  ].filter(Boolean)

  return (
    <div className="max-w-5xl mx-auto space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-crm-on-surface-variant mb-0.5">
            <Link to="/crm" className="hover:text-crm-primary transition-colors">CRM</Link>
            <ChevronRight size={12} />
            <span>Clientes</span>
          </div>
          <h1 className="text-xl font-bold text-crm-on-surface">
            Clientes <span className="text-crm-on-surface-variant font-normal text-base">({clients.length})</span>
          </h1>
        </div>
        <button
          onClick={() => navigate('/crm/clients/new')}
          className="flex items-center gap-2 bg-crm-primary text-crm-on-primary px-4 py-2.5 rounded-full text-sm font-medium shadow-md3-2 hover:shadow-md3-3 transition-shadow"
        >
          <Plus size={16} />
          Nuevo
        </button>
      </div>

      {/* ── FILTER 1: Industry tabs ── */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {GIRO_TABS.map(g => {
          const count  = giroCounts[g] || 0
          const active = giroTab === g
          if (g !== 'Todos' && count === 0) return null
          return (
            <button
              key={g}
              onClick={() => setFilter({ giro: g === 'Todos' ? '' : g })}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                active
                  ? 'bg-crm-primary text-crm-on-primary border-transparent shadow-md3-1'
                  : 'bg-crm-surface text-crm-on-surface-variant border-crm-outline-variant hover:bg-crm-surface-container'
              }`}
            >
              {g}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                active ? 'bg-white/20 text-white' : 'bg-crm-surface-container text-crm-on-surface-variant'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── FILTER 2: Status chips ── */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {STATUS_ORDER.map(s => {
          const cfg   = STATUS_CONFIG[s]
          const count = statusCounts[s] || 0
          if (count === 0) return null
          const active = statusFilter === s
          return (
            <button
              key={s}
              onClick={() => setFilter({ status: active ? '' : s })}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                active
                  ? `${cfg.color} border-transparent shadow-sm`
                  : 'border-crm-outline-variant text-crm-on-surface-variant hover:bg-crm-surface-container'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${active ? 'bg-black/10' : 'bg-crm-surface-container'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── FILTER 3: Search + Priority + Sort ── */}
      <div className="bg-crm-surface rounded-3xl border border-crm-outline-variant p-4 shadow-md3-1 space-y-3">

        {/* Search box */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-crm-on-surface-variant" />
          <input
            type="text"
            placeholder="Buscar por razón social…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-full border border-crm-outline-variant bg-crm-surface-container-low text-sm text-crm-on-surface placeholder-crm-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-crm-primary/30 transition"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-crm-on-surface-variant hover:text-crm-on-surface">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Priority chips + Sort toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-crm-on-surface-variant">Prioridad:</span>
          {['alta', 'media', 'baja'].map(p => {
            const cfg    = PRIORIDAD_CONFIG[p]
            const active = prioridadFilter === p
            return (
              <button
                key={p}
                onClick={() => setFilter({ prioridad: active ? '' : p })}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-crm-primary-container text-crm-on-primary-container border-transparent shadow-sm'
                    : 'border-crm-outline-variant text-crm-on-surface-variant hover:bg-crm-surface-container'
                }`}
              >
                <span className={active ? '' : cfg.color}>{cfg.icon}</span>
                {' '}{cfg.label}
              </button>
            )
          })}

          {/* Sort toggle */}
          <div className="ml-auto flex items-center gap-1 bg-crm-surface-container rounded-full p-0.5">
            <button
              onClick={() => setFilter({ sort: 'pipeline' })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                sortBy !== 'reciente'
                  ? 'bg-crm-surface shadow-sm text-crm-on-surface'
                  : 'text-crm-on-surface-variant hover:text-crm-on-surface'
              }`}
            >
              <GitCommitHorizontal size={12} /> Pipeline
            </button>
            <button
              onClick={() => setFilter({ sort: 'reciente' })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                sortBy === 'reciente'
                  ? 'bg-crm-surface shadow-sm text-crm-on-surface'
                  : 'text-crm-on-surface-variant hover:text-crm-on-surface'
              }`}
            >
              <Clock size={12} /> Reciente
            </button>
          </div>
        </div>
      </div>

      {/* ── Active filters summary ── only shown when something is filtered */}
      {activeTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-crm-on-surface-variant">Filtrando por:</span>
          {activeTags.map(tag => (
            <span
              key={tag.label}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-crm-primary-container text-crm-on-primary-container"
            >
              {tag.label}
              <button onClick={tag.clear} className="ml-0.5 hover:opacity-60 transition-opacity">
                <X size={10} />
              </button>
            </span>
          ))}
          <button
            onClick={clearAllFilters}
            className="text-xs text-crm-on-surface-variant underline hover:text-crm-error transition-colors"
          >
            Limpiar todo
          </button>
        </div>
      )}

      {/* ── Results ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-crm-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16">
          <Briefcase size={40} className="text-crm-outline mx-auto mb-3" />
          <p className="text-crm-on-surface font-medium mb-1">Sin resultados</p>
          <p className="text-sm text-crm-on-surface-variant mb-4">No hay clientes con esos filtros.</p>
          <button
            onClick={clearAllFilters}
            className="px-4 py-2 rounded-full bg-crm-primary text-crm-on-primary text-sm font-medium"
          >
            Ver todos los clientes
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map(client => (
            <ClientRow
              key={client.id}
              client={client}
              onDelete={handleDelete}
              deleting={deleting === client.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ClientRow({ client, onDelete, deleting }) {
  const statusCfg    = STATUS_CONFIG[client.status] || STATUS_CONFIG.prospecto
  const prioridadCfg = PRIORIDAD_CONFIG[client.prioridad] || PRIORIDAD_CONFIG.media
  const timeAgo      = relativeTime(client.updated_at)

  return (
    <Link
      to={`/crm/clients/${client.id}`}
      className="flex items-center gap-4 bg-crm-surface rounded-2xl border border-crm-outline-variant p-4 hover:bg-crm-surface-container-low hover:shadow-md3-2 transition-all group"
    >
      <div className="w-10 h-10 rounded-full bg-crm-primary-container flex items-center justify-center flex-shrink-0 font-bold text-crm-on-primary-container text-sm">
        {client.razon_social?.charAt(0)?.toUpperCase() || '?'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-crm-on-surface text-sm truncate">{client.razon_social}</span>
          {client.giro && (
            <span className="text-xs text-crm-on-surface-variant bg-crm-surface-container px-2 py-0.5 rounded-full">
              {client.giro}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {client.nombre_contacto && (
            <span className="text-xs text-crm-on-surface-variant flex items-center gap-1">
              <Building2 size={10} /> {client.nombre_contacto}
              {client.cargo && <span className="text-crm-outline">· {client.cargo}</span>}
            </span>
          )}
          {client.telefono && (
            <span className="text-xs text-crm-on-surface-variant flex items-center gap-1">
              <Phone size={10} /> {client.telefono}
            </span>
          )}
          {client.ciudad && (
            <span className="text-xs text-crm-on-surface-variant flex items-center gap-1">
              <MapPin size={10} /> {client.ciudad}
            </span>
          )}
          {timeAgo && (
            <span className="text-xs text-crm-on-surface-variant/60 flex items-center gap-1">
              <Clock size={10} /> {timeAgo}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs font-bold ${prioridadCfg.color}`} title={`Prioridad ${prioridadCfg.label}`}>
          {prioridadCfg.icon}
        </span>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 ${statusCfg.color}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
          {statusCfg.label}
        </span>
      </div>

      <button
        onClick={e => onDelete(e, client.id)}
        disabled={deleting}
        className="opacity-0 group-hover:opacity-100 ml-1 p-1.5 rounded-full text-crm-on-surface-variant hover:text-crm-error hover:bg-red-50 transition-all"
        title="Eliminar"
      >
        {deleting ? (
          <div className="w-4 h-4 border-2 border-crm-outline border-t-transparent rounded-full animate-spin" />
        ) : (
          <X size={14} />
        )}
      </button>

      <ChevronRight size={16} className="text-crm-on-surface-variant flex-shrink-0 group-hover:text-crm-primary transition-colors" />
    </Link>
  )
}
