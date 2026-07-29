import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Loader2, Plus } from 'lucide-react'
import KpiBar from '../components/shared/KpiBar.jsx'
import { broadcastsAPI } from '../lib/api.js'
import useAuthStore from '../store/authStore.js'
import { getOrgConfig } from '../config/orgTypeConfig.js'

export default function DashboardPage() {
  const { tenant } = useAuthStore()
  const orgConfig = getOrgConfig(tenant?.org_type)
  const [broadcasts, setBroadcasts] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    broadcastsAPI.list({ limit: 50 })
      .then(res => setBroadcasts(res.data.broadcasts || []))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  // Aggregate communication stats
  const totalEnviados   = broadcasts.reduce((acc, b) => acc + (b.sent_count || 0), 0)
  const totalEntregados = broadcasts.reduce((acc, b) => acc + (b.delivered_count || 0), 0)
  const totalLeidos     = broadcasts.reduce((acc, b) => acc + (b.read_count || 0), 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="text-md-primary animate-spin" />
      </div>
    )
  }

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
      {broadcasts.length === 0 && (
        <div className="card text-center py-14">
          <div className="w-16 h-16 rounded-full bg-md-primary-container flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={28} className="text-md-on-primary-container" />
          </div>
          <p className="font-semibold text-md-on-surface text-lg">¡Bienvenido a Kollybry!</p>
          <p className="text-md-on-surface-variant text-sm mt-2 max-w-xs mx-auto">
            Envía tu primer mensaje a tus {orgConfig.contactLabelPlural.toLowerCase()}.
            Puedes dirigirlo a ciertos salones o a toda la comunidad.
          </p>
          <Link to="/mensajes" className="btn-primary inline-flex mt-6 text-sm gap-2">
            <Plus size={16} />
            Crear primer mensaje
          </Link>
        </div>
      )}
    </div>
  )
}
