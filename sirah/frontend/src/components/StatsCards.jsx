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

function Card({ label, value, sub, icon, accent }) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '20px 22px',
      flex: '1 1 180px', minWidth: '160px',
      boxShadow: '0 2px 8px rgba(26,115,232,0.10)',
      border: '1px solid #dbeafe',
      transition: 'box-shadow 0.18s, transform 0.18s',
      cursor: 'default'
    }}
    onMouseEnter={e => {
      e.currentTarget.style.boxShadow = '0 6px 20px rgba(26,115,232,0.18)';
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(26,115,232,0.10)';
      e.currentTarget.style.transform = 'translateY(0)';
    }}
    >
      <div style={{ fontSize: '18px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontSize: '11px', fontWeight: 500, color: '#9aa0a6', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '26px', fontWeight: 300,
        fontFamily: 'Roboto Mono, monospace',
        color: accent || '#1a73e8', lineHeight: 1.1
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '11px', color: '#bdc1c6', marginTop: '6px' }}>{sub}</div>}
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
      gap: '14px', marginTop: '22px'
    }}>
      <Card icon="📋" label="Expedientes"   value={total.toLocaleString()}                   sub={`Top: ${topBanco}`}    accent="#1a73e8" />
      <Card icon="💰" label="Valor Total"    value={fmtCurrency(estadisticas.valor_total)}    sub="Estimado comercial"     accent="#1557b0" />
      <Card icon="📊" label="Promedio"       value={fmtCurrency(estadisticas.promedio_valor)} sub="Por expediente"         accent="#4285f4" />
      <Card icon="📈" label="Rentabilidad"   value={fmtPct(rent)}                             sub="vs. catastral"
        accent={!rent || rent >= 0 ? '#137333' : '#c5221f'} />
    </div>
  );
}
