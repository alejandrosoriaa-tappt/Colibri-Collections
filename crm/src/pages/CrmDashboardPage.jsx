import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Briefcase, Plus, TrendingUp, Users, Calendar, AlertCircle,
  ChevronRight, Clock, Phone, Building2, Target, CheckCircle2, RefreshCw
} from 'lucide-react'
import { crmAPI } from '../lib/api.js'

const DAILY_GOAL = 5

const STATUS_CONFIG = {
  nuevo_registro: { label: 'Nuevo',       color: 'bg-blue-50 text-blue-700',         dot: 'bg-blue-400' },
  prospecto:      { label: 'Prospecto',   color: 'bg-slate-100 text-slate-700',      dot: 'bg-slate-400' },
  contactado:     { label: 'Contactado',  color: 'bg-amber-100 text-amber-800',      dot: 'bg-amber-500' },
  negociacion:    { label: 'Negociación', color: 'bg-orange-100 text-orange-800',    dot: 'bg-orange-500' },
  cliente:        { label: 'Cliente',     color: 'bg-green-100 text-green-800',      dot: 'bg-green-600' },
  perdido:        { label: 'Perdido',     color: 'bg-red-100 text-red-700',          dot: 'bg-red-500' },
  inactivo:       { label: 'Inactivo',    color: 'bg-crm-surface-container text-crm-on-surface-variant', dot: 'bg-crm-outline' },
}

const PIPELINE_STAGES = ['nuevo_registro', 'prospecto', 'contactado', 'negociacion', 'cliente']

const TIPO_BADGE = {
  llamada:  'bg-blue-100 text-blue-700',
  email:    'bg-amber-100 text-amber-700',
  reunion:  'bg-purple-100 text-purple-700',
  whatsapp: 'bg-green-100 text-green-700',
  visita:   'bg-crm-primary-container text-crm-primary',
  otro:     'bg-gray-100 text-gray-600',
}

const TIPO_LABEL = {
  llamada: 'Llamada', email: 'Correo', reunion: 'Reunión',
  whatsapp: 'WhatsApp', visita: 'Visita', otro: 'Otro',
}

// Today's date string in Mexico City time (YYYY-MM-DD)
function todayMx() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

function yesterdayMx() {
  return new Date(Date.now() - 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

function formatDayHeader(dayStr) {
  const today = todayMx()
  const yesterday = yesterdayMx()
  if (dayStr === today) return 'Hoy'
  if (dayStr === yesterday) return 'Ayer'
  // Parse as local noon to avoid timezone shifts
  const d = new Date(dayStr + 'T12:00:00')
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
}

function relTime(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60)    return 'ahora'
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`
  if (diff < 864e2) return `hace ${Math.floor(diff / 3600)}h`
  if (diff < 864e2 * 2) return 'ayer'
  return `hace ${Math.floor(diff / 864e2)} días`
}

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
  const [dailyData, setDailyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshingDaily, setRefreshingDaily] = useState(false)

  const refreshDaily = useCallback(() => {
    setRefreshingDaily(true)
    crmAPI.dailyActivity(7)
      .then(r => setDailyData(r.data || []))
      .catch(() => {})
      .finally(() => setRefreshingDaily(false))
  }, [])

  useEffect(() => {
    // Stats + followups are critical — load together
    Promise.all([crmAPI.stats(), crmAPI.upcomingFollowups()])
      .then(([statsRes, fuRes]) => {
        setStats(statsRes.data)
        setFollowups(fuRes.data || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))

    // Daily activity is non-critical — load independently
    refreshDaily()

    // Refresh activity data when user returns to this tab/page
    const onVisible = () => { if (!document.hidden) refreshDaily() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refreshDaily)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refreshDaily)
    }
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
  const nuevos = (porStatus.nuevo_registro || 0) + (porStatus.prospecto || 0)
  const followupsPendientes = stats?.followups_pendientes || 0

  // Split daily data into today vs history
  const today = todayMx()
  const todayRow = dailyData.find(d => d.day === today)
  const todayCount = todayRow?.empresas || 0
  const todayItems = todayRow?.items || []
  const historyRows = dailyData.filter(d => d.day !== today)

  const goalReached = todayCount >= DAILY_GOAL
  const pct = Math.min(Math.round((todayCount / DAILY_GOAL) * 100), 100)

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
        <div className="bg-crm-primary-container rounded-3xl p-4 shadow-md3-1">
          <div className="flex items-center justify-between mb-3">
            <Users size={20} className="text-crm-primary" />
          </div>
          <p className="text-2xl font-bold text-crm-on-surface">{total}</p>
          <p className="text-xs text-crm-on-surface-variant mt-1">Total clientes</p>
        </div>

        <div className="bg-green-100 rounded-3xl p-4 shadow-md3-1">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp size={20} className="text-green-700" />
          </div>
          <p className="text-2xl font-bold text-crm-on-surface">{clientes}</p>
          <p className="text-xs text-crm-on-surface-variant mt-1">Clientes activos</p>
        </div>

        <div className="bg-blue-100 rounded-3xl p-4 shadow-md3-1">
          <div className="flex items-center justify-between mb-3">
            <Building2 size={20} className="text-blue-700" />
          </div>
          <p className="text-2xl font-bold text-crm-on-surface">{nuevos}</p>
          <p className="text-xs text-crm-on-surface-variant mt-1">Por contactar</p>
        </div>

        <div className="bg-orange-100 rounded-3xl p-4 shadow-md3-1">
          <div className="flex items-center justify-between mb-3">
            <Calendar size={20} className="text-orange-600" />
            {followupsPendientes > 0 && (
              <span className="w-2 h-2 rounded-full bg-crm-error animate-pulse" />
            )}
          </div>
          <p className="text-2xl font-bold text-crm-on-surface">{followupsPendientes}</p>
          <p className="text-xs text-crm-on-surface-variant mt-1">Follow-ups</p>
        </div>
      </div>

      {/* Daily Activity Tracker */}
      <div className="bg-crm-surface rounded-3xl border border-crm-outline-variant p-5 shadow-md3-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-crm-primary" />
            <h2 className="font-semibold text-crm-on-surface">Actividad diaria</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-crm-on-surface-variant bg-crm-surface-container px-2.5 py-1 rounded-full">
              Meta: {DAILY_GOAL} empresas/día
            </span>
            <button
              onClick={refreshDaily}
              disabled={refreshingDaily}
              className="p-1.5 rounded-full text-crm-on-surface-variant hover:bg-crm-surface-container transition-colors disabled:opacity-40"
              title="Actualizar"
            >
              <RefreshCw size={14} className={refreshingDaily ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Today's box */}
        <div className={`rounded-2xl p-4 mb-4 ${goalReached ? 'bg-green-50 border border-green-200' : 'bg-crm-surface-container-low'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-crm-on-surface text-sm">
              Hoy — {new Date().toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/Mexico_City' })}
            </span>
            <div className="flex items-center gap-1.5">
              {goalReached && <CheckCircle2 size={14} className="text-green-600" />}
              <span className={`text-sm font-bold ${goalReached ? 'text-green-600' : 'text-crm-on-surface'}`}>
                {todayCount} / {DAILY_GOAL}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-crm-outline-variant/30 rounded-full h-2 mb-3">
            <div
              className={`h-2 rounded-full transition-all duration-700 ${goalReached ? 'bg-green-500' : 'bg-crm-primary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Today's activity list */}
          {todayItems.length === 0 ? (
            <p className="text-sm text-crm-on-surface-variant text-center py-2">
              Sin actividad registrada hoy — ve a contactar tu primera empresa
            </p>
          ) : (
            <div className="space-y-1.5">
              {todayItems.map(item => (
                <Link
                  key={item.id}
                  to={`/crm/clients/${item.client_id}`}
                  className="flex items-center gap-2 py-1 hover:opacity-80 transition-opacity group"
                >
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${TIPO_BADGE[item.tipo] || 'bg-gray-100 text-gray-600'}`}>
                    {TIPO_LABEL[item.tipo] || item.tipo}
                  </span>
                  <span className="text-sm text-crm-on-surface truncate flex-1 group-hover:text-crm-primary transition-colors">
                    {item.razon_social}
                  </span>
                  <span className="text-xs text-crm-on-surface-variant flex-shrink-0">{relTime(item.fecha)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Previous days */}
        {historyRows.length > 0 && (
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-crm-on-surface-variant uppercase tracking-widest mb-2 px-1">Días anteriores</p>
            {historyRows.map(day => {
              const done = day.empresas >= DAILY_GOAL
              const dayPct = Math.min(Math.round((day.empresas / DAILY_GOAL) * 100), 100)
              return (
                <div
                  key={day.day}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-crm-surface-container-low transition-colors"
                >
                  <span className="text-sm text-crm-on-surface-variant w-32 flex-shrink-0 capitalize">
                    {formatDayHeader(day.day)}
                  </span>
                  <div className="flex-1 bg-crm-outline-variant/20 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${done ? 'bg-green-500' : 'bg-crm-primary/50'}`}
                      style={{ width: `${dayPct}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 w-16 justify-end">
                    {done && <CheckCircle2 size={12} className="text-green-500" />}
                    <span className={`text-sm font-semibold ${done ? 'text-green-600' : 'text-crm-on-surface-variant'}`}>
                      {day.empresas}/{DAILY_GOAL}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {dailyData.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-crm-on-surface-variant">
              Aún no hay actividades registradas — comienza a contactar empresas
            </p>
          </div>
        )}
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

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
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
          to="/crm/clients?status=nuevo_registro"
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-crm-outline-variant text-sm text-crm-on-surface-variant hover:bg-crm-surface-container transition-colors"
        >
          <Phone size={14} /> Nuevos por contactar
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
