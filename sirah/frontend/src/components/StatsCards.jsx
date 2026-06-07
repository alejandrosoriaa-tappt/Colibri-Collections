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

function Card({ label, value, sub, valueColor }) {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e8eaed',
      borderRadius: '12px',
      padding: '20px 24px',
      flex: '1 1 180px',
      minWidth: '160px',
      transition: 'box-shadow 0.18s',
      cursor: 'default'
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ fontSize: '12px', fontWeight: 500, color: '#9aa0a6', letterSpacing: '0.3px', marginBottom: '10px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '26px', fontWeight: 300,
        fontFamily: 'Roboto Mono, monospace',
        color: valueColor || '#202124',
        lineHeight: 1.1
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '11px', color: '#bdc1c6', marginTop: '6px' }}>{sub}</div>
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
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '12px', marginTop: '20px'
    }}>
      <Card label="Expedientes"       value={total.toLocaleString()}                sub={`Top: ${topBanco}`}   />
      <Card label="Valor Total"        value={fmtCurrency(estadisticas.valor_total)} sub="Estimado comercial"  />
      <Card label="Promedio"           value={fmtCurrency(estadisticas.promedio_valor)} sub="Por expediente"   />
      <Card label="Rentabilidad"       value={fmtPct(rent)}                          sub="vs. catastral"
        valueColor={!rent || rent >= 0 ? '#188038' : '#d93025'} />
    </div>
  );
}
