import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, ArrowRight, Loader2, Plus } from 'lucide-react'
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

  const activeCampaigns = campaigns.filter(c => c.status === 'active')

  // Aggregate communication stats
  const totalEnviados = campaigns.reduce((acc, c) => acc + (c.msg_stats?.sent || 0), 0)
    + broadcasts.reduce((acc, b) => acc + (b.sent_count || 0), 0)
  const totalEntregados = campaigns.reduce((acc, c) => acc + (c.msg_stats?.delivered || 0), 0)
    + broadcasts.reduce((acc, b) => acc + (b.delivered_count || 0), 0)
  const totalLeidos = campaigns.reduce((acc, c) => acc + (c.msg_stats?.read || 0), 0)
    + broadcasts.reduce((acc, b) => acc + (b.read_count || 0), 0)

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
      <div>
        <h1 className="text-2xl font-semibold text-md-on-surface">
          Hola{tenant ? `, ${tenant.display_name || tenant.name}` : ''} 👋
        </h1>
        <p className="text-sm text-md-on-surface-variant mt-0.5">Resumen de comunicación</p>
      </div>

      {/* KPIs */}
      <KpiBar
        enviados={totalEnviados}
        entregados={totalEntregados}
        leidos={totalLeidos}
        showClicks={false}
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
          <Link to="/mensajes" className="btn-primary inline-flex mt-6 text-sm gap-2">
            <Plus size={16} />
            Crear primer mensaje
          </Link>
        </div>
      )}

      {/* Active campaigns */}
      {activeCampaigns.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-md-on-surface">Campañas de cobro activas</h2>
            <Link to="/campaigns" className="text-sm text-md-primary hover:text-md-primary/80 flex items-center gap-1 font-medium">
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
