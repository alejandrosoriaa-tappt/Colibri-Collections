import React from 'react';
import useAppStore from '../store/appStore';

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmtCurrency(n) {
  if (!n && n !== 0) return '$—';
  if (n >= 1_000_000_000) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1_000)         return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toLocaleString('es-MX')}`;
}

function fmtPct(n) {
  if (n === null || n === undefined) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${Number(n).toFixed(1)}%`;
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, bg, accent }) {
  return (
    <div
      style={{
        background:   bg,
        borderRadius: '12px',
        padding:      '20px 22px',
        color:        '#ffffff',
        boxShadow:    '0 4px 18px rgba(0,0,0,0.15)',
        flex:         '1 1 200px',
        minWidth:     '170px',
        transition:   'transform 0.18s, box-shadow 0.18s',
        cursor:       'default',
        position:     'relative',
        overflow:     'hidden'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform  = 'translateY(-3px)';
        e.currentTarget.style.boxShadow  = '0 8px 28px rgba(0,0,0,0.22)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform  = 'translateY(0)';
        e.currentTarget.style.boxShadow  = '0 4px 18px rgba(0,0,0,0.15)';
      }}
    >
      {/* Decorative circle */}
      <div style={{
        position:     'absolute',
        top:          '-20px',
        right:        '-20px',
        width:        '80px',
        height:       '80px',
        borderRadius: '50%',
        background:   `${accent}22`
      }} />

      <div style={{ fontSize: '22px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontSize: '12px', fontWeight: 500, opacity: 0.75, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{
        fontSize:    '26px',
        fontWeight:  700,
        fontFamily:  'var(--font-display)',
        lineHeight:  1.15,
        marginTop:   '4px',
        color:       accent || '#ffffff'
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>{sub}</div>
      )}
    </div>
  );
}

// ─── StatsCards ───────────────────────────────────────────────────────────────
export default function StatsCards() {
  const { estadisticas, expedientes } = useAppStore();

  const total    = estadisticas.total || expedientes.length || 0;
  const porBanco = estadisticas.por_banco || {};
  const topBanco = Object.entries(porBanco).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  return (
    <div
      className="sirah-stats-grid"
      style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap:                 '16px',
        marginTop:           '24px'
      }}
    >
      <StatCard
        icon="📋"
        label="Expedientes"
        value={total.toLocaleString('es-MX')}
        sub={`Banco principal: ${topBanco}`}
        bg="#1a3a52"
        accent="#d97a3a"
      />
      <StatCard
        icon="💰"
        label="Valor Total"
        value={fmtCurrency(estadisticas.valor_total)}
        sub="Estimado comercial"
        bg="#2d5a7a"
        accent="#ffffff"
      />
      <StatCard
        icon="📊"
        label="Promedio/Expediente"
        value={fmtCurrency(estadisticas.promedio_valor)}
        sub="Valor medio estimado"
        bg="#d97a3a"
        accent="#ffffff"
      />
      <StatCard
        icon="📈"
        label="Rentabilidad Prom."
        value={fmtPct(estadisticas.rentabilidad_promedio)}
        sub="vs. valor catastral"
        bg={estadisticas.rentabilidad_promedio >= 0 ? '#27ae60' : '#c0392b'}
        accent="#ffffff"
      />
    </div>
  );
}
