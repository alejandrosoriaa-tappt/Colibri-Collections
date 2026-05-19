import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, ArrowRight, Calendar, Users } from 'lucide-react'
import StatusBadge from '../shared/StatusBadge.jsx'

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0
  }).format(Number(amount) || 0).replace('MX$', '$')
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr + 'T12:00:00Z')
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CampaignCard({ campaign }) {
  const total = campaign.total_contacts || 0
  const paid = campaign.paid_count || 0
  const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0

  const messages = campaign.messages || []
  const msgNumbers = [1, 2, 3, 4]

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-base font-semibold text-gray-900 truncate">{campaign.name}</h3>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="mt-1 text-sm text-gray-500">{campaign.concept}</p>
        </div>
        <Link
          to={`/campaigns/${campaign.id}`}
          className="flex-shrink-0 text-colibri hover:text-colibri-dark transition-colors"
        >
          <ArrowRight size={18} />
        </Link>
      </div>

      {/* Dates */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          Inicio: {formatDate(campaign.cycle_start_date)}
        </span>
        {campaign.due_date && (
          <span className="flex items-center gap-1">
            Vence: {formatDate(campaign.due_date)}
          </span>
        )}
      </div>

      {/* Progress */}
      {total > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1 text-gray-600">
              <Users size={11} />
              {paid} de {total} pagados
            </span>
            <span className="font-semibold text-colibri">{paidPct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-colibri rounded-full h-2 transition-all duration-500"
              style={{ width: `${paidPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Message checkmarks M1–M4 */}
      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs text-gray-400 mr-1">Mensajes:</span>
        {msgNumbers.map(n => {
          const msg = messages.find(m => m.message_number === n)
          const sent = !!msg?.sent_at
          return (
            <div
              key={n}
              className={`flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full border ${
                sent
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-gray-50 text-gray-400 border-gray-200'
              }`}
              title={sent ? `M${n} enviado` : `M${n} pendiente`}
            >
              {sent ? <CheckCircle2 size={11} /> : <Circle size={11} />}
              M{n}
            </div>
          )
        })}
      </div>

      {/* Amount summary */}
      {(campaign.paid_amount > 0 || campaign.total_amount > 0) && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex gap-6 text-sm">
          <div>
            <p className="text-xs text-gray-400">Cobrado</p>
            <p className="font-semibold text-green-600">{formatCurrency(campaign.paid_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Pendiente</p>
            <p className="font-semibold text-gray-700">
              {formatCurrency((campaign.total_amount || 0) - (campaign.paid_amount || 0))}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
