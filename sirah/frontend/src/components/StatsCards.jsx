import React from 'react';
import useAppStore from '../store/appStore';

const fmtCurrency = (n) => {
  if (!n && n !== 0) return '$0';
  if (n >= 1_000_000_000) return `$${(n/1e9).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1_000)         return `$${(n/1e3).toFixed(0)}K`;
  return `$${n.toLocaleString('es-MX')}`;
};

const fmtPct = (n) => {
  if (!n) return '+0.0%';
  return `${n >= 0 ? '+' : ''}${Number(n).toFixed(1)}%`;
};

// Azul fuerte → azul claro (4 tarjetas)
const CARDS_CONFIG = [
  { bg: '#1565c0', text: '#ffffff', sub: 'rgba(255,255,255,0.65)', icon: '⊞' },
  { bg: '#1976d2', text: '#ffffff', sub: 'rgba(255,255,255,0.65)', icon: '💰' },
  { bg: '#42a5f5', text: '#ffffff', sub: 'rgba(255,255,255,0.7)',  icon: '⊘'  },
  { bg: '#bbdefb', text: '#0d47a1', sub: '#5c9bd6',                icon: '↑'  }
];

function KPICard({ bg, text, sub, icon, label, value, extra }) {
  return (
    <div style={{
      background:   bg,
      borderRadius: '14px',
      padding:      '22px 24px',
      flex:         '1 1 180px',
      minWidth:     '150px',
      position:     'relative',
      overflow:     'hidden',
      transition:   'transform 0.18s, box-shadow 0.18s',
      cursor:       'default',
      boxShadow:    '0 2px 8px rgba(21,101,192,0.15)'
    }}
    onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(21,101,192,0.22)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)';    e.currentTarget.style.boxShadow='0 2px 8px rgba(21,101,192,0.15)'; }}
    >
      {/* Decorative circle */}
      <div style={{
        position: 'absolute', top: '-16px', right: '-16px',
        width: '70px', height: '70px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)'
      }} />

      <div style={{ fontSize: '22px', marginBottom: '12px', opacity: 0.8 }}>{icon}</div>
      <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px', color: sub, textTransform: 'uppercase', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ fontSize: '30px', fontWeight: 300, fontFamily: 'Roboto Mono, monospace', color: text, lineHeight: 1.1 }}>
        {value}
      </div>
      {extra && (
        <div style={{ fontSize: '12px', color: sub, marginTop: '6px' }}>{extra}</div>
      )}
    </div>
  );
}

export default function StatsCards() {
  const { estadisticas, expedientes } = useAppStore();
  const total    = estadisticas.total || expedientes.length || 0;
  const porBanco = estadisticas.por_banco || {};
  const topBanco = Object.entries(porBanco).sort((a,b) => b[1]-a[1])[0]?.[0] ?? '—';
  const rent     = estadisticas.rentabilidad_promedio;

  const cards = [
    { label: 'Expedientes',    value: total.toLocaleString(),                   extra: `Top banco: ${topBanco}` },
    { label: 'Valor Total',    value: fmtCurrency(estadisticas.valor_total),    extra: 'Estimado comercial'     },
    { label: 'Promedio',       value: fmtCurrency(estadisticas.promedio_valor), extra: 'Por expediente'         },
    { label: 'Rentabilidad',   value: fmtPct(rent),                             extra: 'vs. valor catastral'    }
  ];

  return (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      {cards.map((c, i) => (
        <KPICard key={i} {...CARDS_CONFIG[i]} {...c} />
      ))}
    </div>
  );
}
