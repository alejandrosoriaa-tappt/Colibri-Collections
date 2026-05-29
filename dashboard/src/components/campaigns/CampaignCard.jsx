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
    <div className="card hover:shadow-md3-2 transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-md-on-surface truncate">{campaign.name}</h3>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="mt-1 text-sm text-md-on-surface-variant">{campaign.concept}</p>
        </div>
        <Link
          to={`/campaigns/${campaign.id}`}
          className="flex-shrink-0 p-1.5 rounded-full text-md-on-surface-variant hover:bg-md-surface-container transition-colors"
        >
          <ArrowRight size={17} />
        </Link>
      </div>

      {/* Dates */}
      <div className="mt-3 flex items-center gap-4 text-xs text-md-on-surface-variant">
        <span className="flex items-center gap-1">
          <Calendar size={11} />
          Inicio: {formatDate(campaign.cycle_start_date)}
        </span>
        {campaign.due_date && (
          <span>Vence: {formatDate(campaign.due_date)}</span>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1 text-md-on-surface-variant">
              <Users size={11} />
              {paid} de {total} pagados
            </span>
            <span className="font-semibold text-md-primary">{paidPct}%</span>
          </div>
          <div className="w-full bg-md-surface-container-high rounded-full h-2">
            <div
              className="bg-md-primary rounded-full h-2 transition-all duration-500"
              style={{ width: `${paidPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Message checkmarks M1–M4 */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-md-on-surface-variant mr-1">Mensajes:</span>
        {msgNumbers.map(n => {
          const msg = messages.find(m => m.message_number === n)
          const sent = !!msg?.sent_at
          return (
            <div
              key={n}
              className={`flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                sent
                  ? 'bg-md-primary-container text-md-on-primary-container'
                  : 'bg-md-surface-container text-md-on-surface-variant'
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
        <div className="mt-3 pt-3 border-t border-md-outline-variant flex gap-6 text-sm">
          <div>
            <p className="text-xs text-md-on-surface-variant">Cobrado</p>
            <p className="font-semibold text-green-600">{formatCurrency(campaign.paid_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-md-on-surface-variant">Pendiente</p>
            <p className="font-semibold text-md-on-surface">
              {formatCurrency((campaign.total_amount || 0) - (campaign.paid_amount || 0))}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
