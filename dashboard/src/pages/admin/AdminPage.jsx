import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Users, Megaphone, MessageSquare, ArrowRight, Loader2 } from 'lucide-react'
import KPICard from '../../components/shared/KPICard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { adminAPI } from '../../lib/api.js'

export default function AdminPage() {
  const [stats, setStats] = useState(null)
  const [tenants, setTenants] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      adminAPI.getStats(),
      adminAPI.listTenants()
    ])
      .then(([statsRes, tenantsRes]) => {
        setStats(statsRes.data)
        setTenants(tenantsRes.data.tenants || [])
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="text-colibri animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panel Admin</h1>
        <p className="text-gray-500 text-sm mt-1">Vista global de todos los clientes</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Activos" value={stats.active_tenants || 0} icon={Building2} color="green" subtitle={`${stats.trial_tenants || 0} en trial`} />
          <KPICard title="Campañas activas" value={stats.active_campaigns || 0} icon={Megaphone} color="blue" />
          <KPICard title="Mensajes este mes" value={(stats.messages_this_month || 0).toLocaleString('es-MX')} icon={MessageSquare} color="orange" />
          <KPICard title="MRR" value={`$${(stats.mrr || 0).toLocaleString('es-MX')}`} icon={Building2} color="purple" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Todos los tenants</h2>
        <Link to="/admin/tenants" className="btn-primary flex items-center gap-2 text-sm">
          <Building2 size={15} /> Nuevo tenant
        </Link>
      </div>

      <div className="card p-0 overflow-hidden">
        {tenants.length === 0 ? (
          <div className="text-center py-12">
            <Building2 size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay tenants registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  {['Organización', 'Plan', 'Estado', 'Admin', 'Alta', ''].map(h => (
                    <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-gray-900">{t.display_name || t.name}</p>
                      <p className="text-xs text-gray-400">{t.slug}</p>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 capitalize">{t.plan}</td>
                    <td className="py-3 px-4"><StatusBadge status={t.status} size="xs" /></td>
                    <td className="py-3 px-4 text-sm text-gray-500 font-mono">{t.admin_phone || '—'}</td>
                    <td className="py-3 px-4 text-sm text-gray-400">
                      {new Date(t.created_at).toLocaleDateString('es-MX')}
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        to={`/admin/tenants/${t.id}`}
                        className="text-colibri hover:text-colibri-dark"
                      >
                        <ArrowRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
