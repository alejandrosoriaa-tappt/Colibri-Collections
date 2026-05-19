import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone, Users, CheckCircle2, Clock, ArrowRight, Loader2 } from 'lucide-react'
import KPICard from '../components/shared/KPICard.jsx'
import CampaignCard from '../components/campaigns/CampaignCard.jsx'
import { campaignsAPI } from '../lib/api.js'
import useAuthStore from '../store/authStore.js'

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0
  }).format(Number(amount) || 0).replace('MX$', '$')
}

export default function DashboardPage() {
  const { tenant } = useAuthStore()
  const [campaigns, setCampaigns] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    campaignsAPI.list()
      .then(res => setCampaigns(res.data.campaigns || []))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const activeCampaigns = campaigns.filter(c => c.status === 'active')
  const totalContacts = campaigns.reduce((s, c) => s + (c.total_contacts || 0), 0)
  const totalPaid = campaigns.reduce((s, c) => s + (c.paid_count || 0), 0)
  const totalAmount = campaigns.reduce((s, c) => s + Number(c.total_amount || 0), 0)
  const paidAmount = campaigns.reduce((s, c) => s + Number(c.paid_amount || 0), 0)
  const pendingAmount = totalAmount - paidAmount

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
          <p className="text-gray-500 text-sm mt-1">Resumen de cobranza</p>
        </div>
        <Link to="/campaigns" className="btn-primary flex items-center gap-2 text-sm">
          <Megaphone size={16} />
          Nueva campaña
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Campañas activas"
          value={activeCampaigns.length}
          subtitle={`${campaigns.length} total`}
          icon={Megaphone}
          color="green"
        />
        <KPICard
          title="Contactos"
          value={totalContacts.toLocaleString('es-MX')}
          subtitle={`${totalPaid} pagaron`}
          icon={Users}
          color="blue"
        />
        <KPICard
          title="Cobrado"
          value={formatCurrency(paidAmount)}
          subtitle="este ciclo"
          icon={CheckCircle2}
          color="green"
        />
        <KPICard
          title="Por cobrar"
          value={formatCurrency(pendingAmount)}
          subtitle="pendiente"
          icon={Clock}
          color="orange"
        />
      </div>

      {/* Active campaigns */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Campañas activas</h2>
          <Link to="/campaigns" className="text-sm text-colibri hover:text-colibri-dark flex items-center gap-1">
            Ver todas <ArrowRight size={14} />
          </Link>
        </div>

        {activeCampaigns.length === 0 ? (
          <div className="card text-center py-12">
            <Megaphone size={40} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No tienes campañas activas</p>
            <p className="text-gray-400 text-sm mt-1">Crea una campaña y sube tu lista de contactos</p>
            <Link to="/campaigns" className="btn-primary inline-flex items-center gap-2 mt-4 text-sm">
              Crear campaña
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeCampaigns.map(c => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        )}
      </div>

      {/* Recent campaigns (non-active) */}
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
    </div>
  )
}
