import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Briefcase, Plus, TrendingUp, Users, Calendar, AlertCircle,
  ChevronRight, Clock, Phone, Mail, Building2
} from 'lucide-react'
import { crmAPI } from '../lib/api.js'

const STATUS_CONFIG = {
  prospecto:   { label: 'Prospecto',    color: 'bg-slate-100 text-slate-700',       dot: 'bg-slate-400' },
  contactado:  { label: 'Contactado',   color: 'bg-amber-100 text-amber-800',        dot: 'bg-amber-500' },
  negociacion: { label: 'Negociación',  color: 'bg-orange-100 text-orange-800',      dot: 'bg-orange-500' },
  cliente:     { label: 'Cliente',      color: 'bg-green-100 text-green-800',        dot: 'bg-green-600' },
  perdido:     { label: 'Perdido',      color: 'bg-red-100 text-red-700',            dot: 'bg-red-500' },
  inactivo:    { label: 'Inactivo',     color: 'bg-crm-surface-container text-crm-on-surface-variant', dot: 'bg-crm-outline' },
}

const PIPELINE_STAGES = ['prospecto', 'contactado', 'negociacion', 'cliente']

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff < 0) return `Hace ${Math.abs(diff)} día${Math.abs(diff) !== 1 ? 's' : ''}`
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function isOverdue(iso) {
  return new Date(iso) < new Date()
}

export default function CrmDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [followups, setFollowups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([crmAPI.stats(), crmAPI.upcomingFollowups()])
      .then(([statsRes, fuRes]) => {
        setStats(statsRes.data)
        setFollowups(fuRes.data || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-crm-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const porStatus = stats?.por_status || {}
  const total = stats?.total || 0
  const clientes = porStatus.cliente || 0
  const prospectos = porStatus.prospecto || 0
  const followupsPendientes = stats?.followups_pendientes || 0

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-crm-primary flex items-center justify-center shadow-md3-2">
            <Briefcase size={20} className="text-crm-on-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-crm-on-surface">CRM Clientes</h1>
            <p className="text-sm text-crm-on-surface-variant">NKUVO Labs</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/crm/clients/new')}
          className="flex items-center gap-2 bg-crm-primary text-crm-on-primary px-4 py-2.5 rounded-full text-sm font-medium shadow-md3-2 hover:shadow-md3-3 transition-shadow"
        >
          <Plus size={16} />
          Nuevo cliente
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Users size={20} className="text-crm-primary" />}
          label="Total clientes"
          value={total}
          bg="bg-crm-primary-container"
        />
        <StatCard
          icon={<TrendingUp size={20} className="text-green-700" />}
          label="Clientes activos"
          value={clientes}
          bg="bg-green-50"
        />
        <StatCard
          icon={<Building2 size={20} className="text-amber-700" />}
          label="Prospectos"
          value={prospectos}
          bg="bg-amber-50"
        />
        <StatCard
          icon={<Calendar size={20} className="text-crm-tertiary" />}
          label="Follow-ups"
          value={followupsPendientes}
          bg="bg-crm-tertiary-container"
          alert={followupsPendientes > 0}
        />
      </div>

      {/* Pipeline + Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Pipeline visual */}
        <div className="lg:col-span-2 bg-crm-surface rounded-3xl border border-crm-outline-variant p-5 shadow-md3-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-crm-on-surface">Pipeline</h2>
            <Link
              to="/crm/clients"
              className="text-sm text-crm-primary font-medium flex items-center gap-1 hover:underline"
            >
              Ver todos <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PIPELINE_STAGES.map(stage => {
              const cfg = STATUS_CONFIG[stage]
              const count = porStatus[stage] || 0
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <Link
                  key={stage}
                  to={`/crm/clients?status=${stage}`}
                  className="group flex flex-col items-center bg-crm-surface-container-low rounded-2xl p-4 hover:bg-crm-surface-container transition-colors"
                >
                  <div className={`w-3 h-3 rounded-full mb-2 ${cfg.dot}`} />
                  <span className="text-2xl font-bold text-crm-on-surface">{count}</span>
                  <span className="text-xs text-crm-on-surface-variant mt-1 text-center leading-tight">{cfg.label}</span>
                  <div className="w-full mt-3 bg-crm-outline-variant/30 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full transition-all duration-500 ${cfg.dot}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-crm-on-surface-variant/60 mt-1">{pct}%</span>
                </Link>
              )
            })}
          </div>

          {/* Lost / Inactive */}
          <div className="flex gap-3 mt-3">
            {['perdido', 'inactivo'].map(stage => {
              const cfg = STATUS_CONFIG[stage]
              const count = porStatus[stage] || 0
              return (
                <Link
                  key={stage}
                  to={`/crm/clients?status=${stage}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-crm-surface-container-low hover:bg-crm-surface-container transition-colors text-sm text-crm-on-surface-variant"
                >
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  {cfg.label}: <span className="font-semibold text-crm-on-surface">{count}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Upcoming follow-ups */}
        <div className="bg-crm-surface rounded-3xl border border-crm-outline-variant p-5 shadow-md3-1">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-crm-primary" />
            <h2 className="font-semibold text-crm-on-surface">Próximos follow-ups</h2>
          </div>

          {followups.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={32} className="text-crm-outline mx-auto mb-2" />
              <p className="text-sm text-crm-on-surface-variant">Sin recordatorios pendientes</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {followups.slice(0, 8).map(fu => {
                const overdue = isOverdue(fu.fecha_recordatorio)
                return (
                  <Link
                    key={fu.id}
                    to={`/crm/clients/${fu.crm_clients?.id}`}
                    className="flex items-start gap-3 p-3 rounded-2xl hover:bg-crm-surface-container transition-colors group"
                  >
                    <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${overdue ? 'bg-crm-error' : 'bg-crm-primary'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-crm-on-surface truncate">
                        {fu.crm_clients?.razon_social || 'Cliente'}
                      </p>
                      <p className="text-xs text-crm-on-surface-variant truncate mt-0.5">{fu.descripcion}</p>
                      <p className={`text-xs font-medium mt-1 ${overdue ? 'text-crm-error' : 'text-crm-primary'}`}>
                        {overdue && <AlertCircle size={10} className="inline mr-1" />}
                        {formatDate(fu.fecha_recordatorio)}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-3 flex-wrap">
        <Link
          to="/crm/clients"
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-crm-outline-variant text-sm text-crm-on-surface-variant hover:bg-crm-surface-container transition-colors"
        >
          <Users size={14} /> Ver todos los clientes
        </Link>
        <Link
          to="/crm/clients?status=prospecto"
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-crm-outline-variant text-sm text-crm-on-surface-variant hover:bg-crm-surface-container transition-colors"
        >
          <Phone size={14} /> Prospectos por contactar
        </Link>
        <Link
          to="/crm/clients?prioridad=alta"
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-crm-outline-variant text-sm text-crm-on-surface-variant hover:bg-crm-surface-container transition-colors"
        >
          <AlertCircle size={14} /> Alta prioridad
        </Link>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, bg, alert }) {
  return (
    <div className={`${bg} rounded-3xl p-4 shadow-md3-1`}>
      <div className="flex items-center justify-between mb-3">
        {icon}
        {alert && (
          <span className="w-2 h-2 rounded-full bg-crm-error animate-pulse" />
        )}
      </div>
      <p className="text-2xl font-bold text-crm-on-surface">{value}</p>
      <p className="text-xs text-crm-on-surface-variant mt-1">{label}</p>
    </div>
  )
}
