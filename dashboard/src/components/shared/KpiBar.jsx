import { Send, CheckCheck, BookOpen, MousePointer } from 'lucide-react'

/**
 * Universal communication KPIs — same 4 metrics everywhere in the app.
 * enviados  → messages sent
 * entregados → delivered (WhatsApp delivery receipt)
 * leidos     → read (double blue check)
 * clicks     → link/attachment clicks (link tracking)
 */
export default function KpiBar({ enviados = 0, entregados = 0, leidos = 0, clicks = 0, showClicks = true }) {
  const cards = [
    {
      label: 'Enviados',
      value: enviados,
      icon: Send,
      bg: 'bg-blue-50',
      iconColor: 'text-blue-400',
      textColor: 'text-gray-900'
    },
    {
      label: 'Entregados',
      value: entregados,
      pct: enviados > 0 ? Math.round((entregados / enviados) * 100) : null,
      icon: CheckCheck,
      bg: 'bg-green-50',
      iconColor: 'text-green-400',
      textColor: 'text-gray-900'
    },
    {
      label: 'Leídos',
      value: leidos,
      pct: enviados > 0 ? Math.round((leidos / enviados) * 100) : null,
      icon: BookOpen,
      bg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      textColor: 'text-gray-900'
    },
    ...(showClicks ? [{
      label: 'Clicks en liga',
      value: clicks,
      pct: enviados > 0 ? Math.round((clicks / enviados) * 100) : null,
      icon: MousePointer,
      bg: 'bg-orange-50',
      iconColor: 'text-orange-400',
      textColor: clicks > 0 ? 'text-orange-600' : 'text-gray-900'
    }] : [])
  ]

  return (
    <div className={`grid gap-3 ${showClicks ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
      {cards.map(({ label, value, pct, icon: Icon, bg, iconColor, textColor }) => (
        <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
          <Icon size={16} className={`${iconColor} mx-auto mb-1`} />
          <p className={`text-xl font-bold ${textColor}`}>
            {value.toLocaleString('es-MX')}
          </p>
          {pct !== null && pct !== undefined && (
            <p className="text-xs text-gray-400">{pct}%</p>
          )}
          <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  )
}
