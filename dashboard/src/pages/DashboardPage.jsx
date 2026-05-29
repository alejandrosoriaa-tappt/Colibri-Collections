import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, ArrowRight, Loader2, Radio, Megaphone, Plus } from 'lucide-react'
import CampaignCard from '../components/campaigns/CampaignCard.jsx'
import KpiBar from '../components/shared/KpiBar.jsx'
import { campaignsAPI, broadcastsAPI } from '../lib/api.js'
import useAuthStore from '../store/authStore.js'

export default function DashboardPage() {
  const { tenant } = useAuthStore()
  const [campaigns, setCampaigns] = useState([])
  const [broadcasts, setBroadcasts] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      campaignsAPI.list(),
      broadcastsAPI.list({ limit: 3 }).catch(() => ({ data: { broadcasts: [] } }))
    ])
      .then(([cRes, bRes]) => {
        setCampaigns(cRes.data.campaigns || [])
        setBroadcasts(bRes.data.broadcasts || [])
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const latestCampaign = campaigns[0] || null
  const activeCampaigns = campaigns.filter(c => c.status === 'active')

  // Aggregate communication stats
  const totalEnviados = campaigns.reduce((acc, c) => acc + (c.msg_stats?.sent || 0), 0)
    + broadcasts.reduce((acc, b) => acc + (b.sent_count || 0), 0)
  const totalEntregados = campaigns.reduce((acc, c) => acc + (c.msg_stats?.delivered || 0), 0)
  const totalLeidos = campaigns.reduce((acc, c) => acc + (c.msg_stats?.read || 0), 0)
  const totalClicks = 0

  // Recent items — combine campaigns + broadcasts, sorted by date
  const recentItems = [
    ...campaigns.slice(0, 5).map(c => ({
      id: `c-${c.id}`,
      type: 'cobro',
      title: c.name,
      meta: `${c.total_contacts || 0} contactos`,
      stat: `${c.msg_stats?.sent || 0} enviados`,
      date: c.created_at,
      href: `/campaigns/${c.id}`
    })),
    ...broadcasts.map(b => ({
      id: `b-${b.id}`,
      type: 'comunicado',
      title: b.title,
      meta: b.group_filter || 'Todos',
      stat: `${b.sent_count || 0} enviados`,
      date: b.sent_at || b.created_at,
      href: null
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="text-md-primary animate-spin" />
      </div>
    )
  }

  const isEmpty = campaigns.length === 0 && broadcasts.length === 0

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-md-on-surface">
            Hola{tenant ? `, ${tenant.display_name || tenant.name}` : ''} 👋
          </h1>
          <p className="text-sm text-md-on-surface-variant mt-0.5">Resumen de comunicación</p>
        </div>
        <Link to="/mensajes" className="btn-primary text-sm">
          <Plus size={16} />
          Nuevo mensaje
        </Link>
      </div>

      {/* KPIs */}
      <KpiBar
        enviados={totalEnviados}
        entregados={totalEntregados}
        leidos={totalLeidos}
        clicks={totalClicks}
      />

      {/* Empty state */}
      {isEmpty && (
        <div className="card text-center py-14">
          <div className="w-16 h-16 rounded-full bg-md-primary-container flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={28} className="text-md-on-primary-container" />
          </div>
          <p className="font-semibold text-md-on-surface text-lg">¡Bienvenido a Kollybry!</p>
          <p className="text-md-on-surface-variant text-sm mt-2 max-w-xs mx-auto">
            Envía tu primer mensaje a tus contactos. Puedes crear comunicados generales o recordatorios de cobro.
          </p>
          <Link to="/mensajes" className="btn-primary inline-flex mt-6 text-sm">
            <Plus size={16} />
            Crear primer mensaje
          </Link>
        </div>
      )}

      {/* Recent activity */}
      {!isEmpty && recentItems.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-md-on-surface">Actividad reciente</h2>
            <Link to="/mensajes" className="text-sm text-md-primary hover:text-md-primary/80 flex items-center gap-1 font-medium">
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentItems.map(item => (
              <div key={item.id}>
                {item.href ? (
                  <Link to={item.href}>
                    <RecentItem item={item} />
                  </Link>
                ) : (
                  <RecentItem item={item} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaign most recent — quick card */}
      {latestCampaign && activeCampaigns.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-md-on-surface">Campañas activas</h2>
            <Link to="/mensajes?filter=cobro" className="text-sm text-md-primary hover:text-md-primary/80 flex items-center gap-1 font-medium">
              Ver todas <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeCampaigns.slice(0, 3).map(c => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RecentItem({ item }) {
  return (
    <div className="card-outlined p-4 hover:bg-md-surface-container-low transition-colors group cursor-pointer">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          item.type === 'comunicado' ? 'bg-md-tertiary-container' : 'bg-md-secondary-container'
        }`}>
          {item.type === 'comunicado'
            ? <Radio size={15} className="text-md-on-tertiary-container" />
            : <Megaphone size={15} className="text-md-on-secondary-container" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-md-on-surface truncate">{item.title}</p>
          <p className="text-xs text-md-on-surface-variant">{item.meta} · {item.stat}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-md-on-surface-variant">
            {new Date(item.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
          </p>
          <ArrowRight size={14} className="text-md-on-surface-variant ml-auto mt-1 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  )
}
