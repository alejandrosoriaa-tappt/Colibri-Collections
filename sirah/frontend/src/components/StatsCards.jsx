import React from 'react';
import useAppStore from '../store/appStore';

const fmtCurrency = (n) => {
  if (!n && n !== 0) return '$—';
  if (n >= 1_000_000_000) return `$${(n/1e9).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1_000)         return `$${(n/1e3).toFixed(0)}K`;
  return `$${n.toLocaleString('es-MX')}`;
};

const fmtPct = (n) => {
  if (n === null || n === undefined) return '+0.0%';
  return `${n >= 0 ? '+' : ''}${Number(n).toFixed(1)}%`;
};

function Card({ icon, label, value, sub, accent }) {
  return (
    <div style={{
      background:   '#1a1a1a',
      border:       '1px solid #2e2e2e',
      borderRadius: '12px',
      padding:      '20px',
      flex:         '1 1 180px',
      minWidth:     '160px',
      transition:   'background 0.18s',
      cursor:       'default'
    }}
    onMouseEnter={e => e.currentTarget.style.background = '#212121'}
    onMouseLeave={e => e.currentTarget.style.background = '#1a1a1a'}
    >
      <div style={{ fontSize: '20px', marginBottom: '12px', opacity: 0.6 }}>{icon}</div>
      <div style={{
        fontSize:      '11px',
        fontWeight:    500,
        color:         '#616161',
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
        marginBottom:  '6px'
      }}>
        {label}
      </div>
      <div style={{
        fontSize:   '28px',
        fontWeight: 300,
        fontFamily: 'Roboto Mono, monospace',
        color:      accent || '#f5f5f5',
        lineHeight: 1.1
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '12px', color: '#616161', marginTop: '6px' }}>{sub}</div>
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

  return (
    <div className="md-stats-grid" style={{
      display:             'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap:                 '12px',
      marginTop:           '20px'
    }}>
      <Card icon="📋" label="Expedientes"       value={total.toLocaleString()}             sub={`Top: ${topBanco}`}          accent="#f5f5f5" />
      <Card icon="💰" label="Valor Total"        value={fmtCurrency(estadisticas.valor_total)} sub="Estimado comercial"        accent="#e0e0e0" />
      <Card icon="⊘"  label="Promedio"           value={fmtCurrency(estadisticas.promedio_valor)} sub="Por expediente"         accent="#9e9e9e" />
      <Card icon="↑"  label="Rentabilidad"       value={fmtPct(rent)}                      sub="vs. catastral"
        accent={!rent || rent >= 0 ? '#66bb6a' : '#ef5350'} />
    </div>
  );
}
