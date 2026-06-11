import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus, Search, Filter, ChevronRight, Building2, Phone,
  Mail, Globe, MapPin, Star, X, Briefcase
} from 'lucide-react'
import { crmAPI } from '../lib/api.js'

const STATUS_CONFIG = {
  prospecto:   { label: 'Prospecto',   color: 'bg-slate-100 text-slate-700',    dot: 'bg-slate-400' },
  contactado:  { label: 'Contactado',  color: 'bg-amber-100 text-amber-800',     dot: 'bg-amber-500' },
  negociacion: { label: 'Negociación', color: 'bg-orange-100 text-orange-800',   dot: 'bg-orange-500' },
  cliente:     { label: 'Cliente',     color: 'bg-green-100 text-green-800',     dot: 'bg-green-600' },
  perdido:     { label: 'Perdido',     color: 'bg-red-100 text-red-700',         dot: 'bg-red-500' },
  inactivo:    { label: 'Inactivo',    color: 'bg-gray-100 text-gray-500',       dot: 'bg-gray-400' },
}

const PRIORIDAD_CONFIG = {
  alta:  { label: 'Alta',  color: 'text-red-600',   icon: '●●●' },
  media: { label: 'Media', color: 'text-amber-600',  icon: '●●○' },
  baja:  { label: 'Baja',  color: 'text-slate-400',  icon: '●○○' },
}

const ALL_STATUSES = ['prospecto', 'contactado', 'negociacion', 'cliente', 'perdido', 'inactivo']
const ALL_PRIORIDADES = ['alta', 'media', 'baja']

export default function CrmClientsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(null)

  const statusFilter = searchParams.get('status') || ''
  const prioridadFilter = searchParams.get('prioridad') || ''

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (statusFilter) params.status = statusFilter
    if (prioridadFilter) params.prioridad = prioridadFilter
    if (search.trim()) params.q = search.trim()

    crmAPI.listClients(params)
      .then(r => setClients(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [statusFilter, prioridadFilter, search])

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0)
    return () => clearTimeout(t)
  }, [load])

  function setFilter(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  function clearFilters() {
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
      setClients(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      alert('Error al eliminar: ' + err.message)
    } finally {
      setDeleting(null)
    }
  }

  const hasFilters = statusFilter || prioridadFilter || search

  return (
    <div className="max-w-5xl mx-auto space-y-5">

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

      {/* Search + filters */}
      <div className="bg-crm-surface rounded-3xl border border-crm-outline-variant p-4 shadow-md3-1 space-y-3">
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

        <div className="flex flex-wrap gap-2">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={13} className="text-crm-on-surface-variant" />
            {ALL_STATUSES.map(s => {
              const cfg = STATUS_CONFIG[s]
              const active = statusFilter === s
              return (
                <button
                  key={s}
                  onClick={() => setFilter('status', active ? '' : s)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                    active
                      ? `${cfg.color} border-transparent`
                      : 'border-crm-outline-variant text-crm-on-surface-variant hover:bg-crm-surface-container'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </button>
              )
            })}
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1.5 ml-auto">
            {ALL_PRIORIDADES.map(p => {
              const cfg = PRIORIDAD_CONFIG[p]
              const active = prioridadFilter === p
              return (
                <button
                  key={p}
                  onClick={() => setFilter('prioridad', active ? '' : p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-crm-primary-container text-crm-on-primary-container border-transparent'
                      : 'border-crm-outline-variant text-crm-on-surface-variant hover:bg-crm-surface-container'
                  }`}
                >
                  <span className={active ? 'text-crm-on-primary-container' : cfg.color}>{cfg.icon}</span>
                  {' '}{cfg.label}
                </button>
              )
            })}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="px-2 py-1 rounded-full text-xs text-crm-on-surface-variant hover:text-crm-error transition-colors"
                title="Limpiar filtros"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-crm-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16">
          <Briefcase size={40} className="text-crm-outline mx-auto mb-3" />
          <p className="text-crm-on-surface font-medium mb-1">
            {hasFilters ? 'Sin resultados' : 'Aún no hay clientes'}
          </p>
          <p className="text-sm text-crm-on-surface-variant mb-5">
            {hasFilters ? 'Prueba otros filtros o busca con otras palabras.' : 'Agrega tu primer cliente para comenzar.'}
          </p>
          {!hasFilters && (
            <button
              onClick={() => navigate('/crm/clients/new')}
              className="inline-flex items-center gap-2 bg-crm-primary text-crm-on-primary px-5 py-2.5 rounded-full text-sm font-medium"
            >
              <Plus size={15} /> Agregar cliente
            </button>
          )}
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
  const statusCfg = STATUS_CONFIG[client.status] || STATUS_CONFIG.prospecto
  const prioridadCfg = PRIORIDAD_CONFIG[client.prioridad] || PRIORIDAD_CONFIG.media

  return (
    <Link
      to={`/crm/clients/${client.id}`}
      className="flex items-center gap-4 bg-crm-surface rounded-2xl border border-crm-outline-variant p-4 hover:bg-crm-surface-container-low hover:shadow-md3-2 transition-all group"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-crm-primary-container flex items-center justify-center flex-shrink-0 font-bold text-crm-on-primary-container text-sm">
        {client.razon_social?.charAt(0)?.toUpperCase() || '?'}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-crm-on-surface text-sm truncate">{client.razon_social}</span>
          {client.giro && (
            <span className="text-xs text-crm-on-surface-variant bg-crm-surface-container px-2 py-0.5 rounded-full truncate">
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
        </div>
      </div>

      {/* Priority + Status */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs font-bold ${prioridadCfg.color}`} title={`Prioridad ${prioridadCfg.label}`}>
          {prioridadCfg.icon}
        </span>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 ${statusCfg.color}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
          {statusCfg.label}
        </span>
      </div>

      {/* Delete (visible on hover) */}
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
