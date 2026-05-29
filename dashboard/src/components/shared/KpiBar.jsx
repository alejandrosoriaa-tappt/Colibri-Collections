import { Send, CheckCheck, BookOpen, MousePointer } from 'lucide-react'

export default function KpiBar({ enviados = 0, entregados = 0, leidos = 0, clicks = 0, showClicks = true }) {
  const cards = [
    {
      label: 'Enviados',
      value: enviados,
      icon: Send,
      containerCls: 'bg-md-tertiary-container',
      iconCls: 'text-md-on-tertiary-container',
      valueCls: 'text-md-on-tertiary-container',
      metaCls: 'text-md-on-tertiary-container/70'
    },
    {
      label: 'Entregados',
      value: entregados,
      pct: enviados > 0 ? Math.round((entregados / enviados) * 100) : null,
      icon: CheckCheck,
      containerCls: 'bg-md-primary-container',
      iconCls: 'text-md-on-primary-container',
      valueCls: 'text-md-on-primary-container',
      metaCls: 'text-md-on-primary-container/70'
    },
    {
      label: 'Leídos',
      value: leidos,
      pct: enviados > 0 ? Math.round((leidos / enviados) * 100) : null,
      icon: BookOpen,
      containerCls: 'bg-md-secondary-container',
      iconCls: 'text-md-on-secondary-container',
      valueCls: 'text-md-on-secondary-container',
      metaCls: 'text-md-on-secondary-container/70'
    },
    ...(showClicks ? [{
      label: 'Clicks en liga',
      value: clicks,
      pct: enviados > 0 ? Math.round((clicks / enviados) * 100) : null,
      icon: MousePointer,
      containerCls: 'bg-orange-100',
      iconCls: 'text-orange-500',
      valueCls: clicks > 0 ? 'text-orange-700' : 'text-md-on-surface',
      metaCls: 'text-orange-500/70'
    }] : [])
  ]

  return (
    <div className={`grid gap-3 ${showClicks ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
      {cards.map(({ label, value, pct, icon: Icon, containerCls, iconCls, valueCls, metaCls }) => (
        <div key={label} className={`${containerCls} rounded-2xl p-4 text-center`}>
          <Icon size={16} className={`${iconCls} mx-auto mb-1.5`} />
          <p className={`text-2xl font-bold ${valueCls}`}>
            {value.toLocaleString('es-MX')}
          </p>
          {pct !== null && pct !== undefined && (
            <p className={`text-xs ${metaCls}`}>{pct}%</p>
          )}
          <p className={`text-xs ${metaCls} mt-0.5`}>{label}</p>
        </div>
      ))}
    </div>
  )
}
