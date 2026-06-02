import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Users, Megaphone, MessageSquare, ArrowRight, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import KPICard from '../../components/shared/KPICard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { adminAPI } from '../../lib/api.js'

// ── Pricing reference table (admin only) ─────────────────────────────────────
const PRICING_TIERS = [
  { range: '0 – 300',        price: '$3,900',  wa: '$153',    margin: '96%' },
  { range: '301 – 600',      price: '$4,900',  wa: '$306',    margin: '94%' },
  { range: '601 – 1,000',    price: '$5,900',  wa: '$510',    margin: '91%' },
  { range: '1,001 – 2,000',  price: '$6,900',  wa: '$1,020',  margin: '85%' },
  { range: '2,001 – 3,000',  price: '$7,900',  wa: '$1,530',  margin: '81%' },
  { range: '3,001 – 5,000',  price: '$12,900', wa: '$2,550',  margin: '80%' },
  { range: '5,001 – 7,500',  price: '$19,500', wa: '$3,825',  margin: '80%' },
  { range: '7,501 – 10,000', price: '$25,900', wa: '$5,100',  margin: '80%' },
  { range: '10,001+',        price: 'A cotizar', wa: '—',     margin: '—'   },
]

function PricingTable() {
  const [open, setOpen] = useState(false)
  return (
    <div className="card p-0 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-md-surface-container-low transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-md-on-surface">Tabla de tarifas Kollybry</span>
          <span className="text-xs text-md-on-surface-variant">(6 msg/miembro/mes · solo admin)</span>
        </div>
        {open ? <ChevronUp size={16} className="text-md-on-surface-variant" /> : <ChevronDown size={16} className="text-md-on-surface-variant" />}
      </button>
      {open && (
        <div className="border-t border-md-outline-variant overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-md-surface-container">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-md-on-surface-variant uppercase tracking-wide">Miembros</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-md-on-surface-variant uppercase tracking-wide">Precio/mes</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-md-on-surface-variant uppercase tracking-wide">Costo WA</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-md-on-surface-variant uppercase tracking-wide">Margen</th>
              </tr>
            </thead>
            <tbody>
              {PRICING_TIERS.map((t, i) => (
                <tr key={i} className="border-t border-md-outline-variant/40 hover:bg-md-surface-container-low">
                  <td className="px-5 py-2.5 text-md-on-surface font-mono text-xs">{t.range}</td>
                  <td className="px-5 py-2.5 text-right font-semibold text-md-primary">{t.price}</td>
                  <td className="px-5 py-2.5 text-right text-md-on-surface-variant text-xs">{t.wa}</td>
                  <td className="px-5 py-2.5 text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      t.margin === '96%' ? 'bg-green-100 text-green-700' :
                      t.margin === '—'   ? 'bg-md-surface-container text-md-on-surface-variant' :
                      'bg-blue-50 text-blue-700'
                    }`}>{t.margin}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-5 py-3 text-xs text-md-on-surface-variant border-t border-md-outline-variant/40">
            Precios en MXN · Costo WA estimado a $0.085/mensaje · Asigna el plan en Tenants → editar tenant
          </p>
        </div>
      )}
    </div>
  )
}

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

      <PricingTable />

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
