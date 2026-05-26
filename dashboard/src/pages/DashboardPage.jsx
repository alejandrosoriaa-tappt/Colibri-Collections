import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone, Users, Send, CheckCheck, BookOpen, ArrowRight, Loader2, Radio } from 'lucide-react'
import CampaignCard from '../components/campaigns/CampaignCard.jsx'
import { campaignsAPI, broadcastsAPI } from '../lib/api.js'
import useAuthStore from '../store/authStore.js'

function StatBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-semibold text-gray-800">{value.toLocaleString('es-MX')} <span className="text-gray-400 font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

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
  const stats = latestCampaign?.msg_stats || { sent: 0, delivered: 0, read: 0, failed: 0 }
  const totalContacts = latestCampaign?.total_contacts || 0
  const totalBroadcastsSent = broadcasts.reduce((acc, b) => acc + (b.sent_count || 0), 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="text-colibri animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hola{tenant ? `, ${tenant.display_name || tenant.name}` : ''} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">Resumen de comunicación</p>
        </div>
        <Link to="/campaigns" className="btn-primary flex items-center gap-2 text-sm">
          <Megaphone size={16} />
          Nueva campaña
        </Link>
      </div>

      {/* KPIs — siempre visibles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <Users size={16} className="text-gray-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-900">{totalContacts.toLocaleString('es-MX')}</p>
          <p className="text-xs text-gray-500">Contactos</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <Send size={16} className="text-blue-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-900">{stats.sent.toLocaleString('es-MX')}</p>
          <p className="text-xs text-gray-500">Mensajes cobro</p>
        </div>
        <div className="bg-colibri-50 rounded-xl p-3 text-center">
          <Radio size={16} className="text-colibri mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-900">{broadcasts.length}</p>
          <p className="text-xs text-gray-500">Comunicados</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <CheckCheck size={16} className="text-green-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-900">{(stats.sent + totalBroadcastsSent).toLocaleString('es-MX')}</p>
          <p className="text-xs text-gray-500">Total enviados</p>
        </div>
      </div>

      {/* Campaña más reciente */}
      {latestCampaign && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Campaña más reciente</p>
              <h2 className="text-base font-semibold text-gray-900 mt-0.5">{latestCampaign.name}</h2>
            </div>
            <Link to={`/campaigns/${latestCampaign.id}`} className="text-sm text-colibri hover:text-colibri-dark flex items-center gap-1">
              Ver detalle <ArrowRight size={14} />
            </Link>
          </div>
          {stats.sent > 0 && (
            <div className="space-y-2.5">
              <StatBar label="Entregados" value={stats.delivered} total={stats.sent} color="bg-green-400" />
              <StatBar label="Leídos" value={stats.read} total={stats.sent} color="bg-colibri" />
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {campaigns.length === 0 && (
        <div className="card text-center py-10">
          <Megaphone size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No tienes campañas aún</p>
          <p className="text-gray-400 text-sm mt-1">Crea tu primera campaña y sube tu lista de contactos</p>
          <Link to="/campaigns" className="btn-primary inline-flex items-center gap-2 mt-4 text-sm">
            Crear campaña
          </Link>
        </div>
      )}

      {/* Active campaigns list */}
      {activeCampaigns.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Campañas activas</h2>
            <Link to="/campaigns" className="text-sm text-colibri hover:text-colibri-dark flex items-center gap-1">
              Ver todas <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeCampaigns.map(c => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        </div>
      )}

      {/* Other campaigns */}
      {campaigns.filter(c => c.status !== 'active').length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Otras campañas</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {campaigns.filter(c => c.status !== 'active').slice(0, 3).map(c => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        </div>
      )}

      {/* Recent broadcasts */}
      {broadcasts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Comunicados recientes</h2>
            <Link to="/broadcasts" className="text-sm text-colibri hover:text-colibri-dark flex items-center gap-1">
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid gap-3">
            {broadcasts.map(b => (
              <div key={b.id} className="card flex items-center gap-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-colibri-50 flex items-center justify-center flex-shrink-0">
                  <Radio size={16} className="text-colibri" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{b.title}</p>
                  <p className="text-xs text-gray-400">
                    {b.group_filter || 'Todos'} · {b.sent_count} enviados
                  </p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(b.sent_at || b.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions when empty */}
      {campaigns.length === 0 && broadcasts.length === 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Link to="/campaigns" className="card text-center py-8 hover:shadow-md transition-shadow group">
            <Megaphone size={32} className="text-gray-300 group-hover:text-colibri mx-auto mb-3 transition-colors" />
            <p className="text-gray-700 font-medium">Cobros automáticos</p>
            <p className="text-gray-400 text-sm mt-1">Crea tu primera campaña de cobro</p>
          </Link>
          <Link to="/broadcasts" className="card text-center py-8 hover:shadow-md transition-shadow group">
            <Radio size={32} className="text-gray-300 group-hover:text-colibri mx-auto mb-3 transition-colors" />
            <p className="text-gray-700 font-medium">Comunicados</p>
            <p className="text-gray-400 text-sm mt-1">Envía avisos a grupos específicos</p>
          </Link>
        </div>
      )}
    </div>
  )
}
