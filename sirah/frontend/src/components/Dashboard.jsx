import React, { useEffect } from 'react';
import UploadForm  from './UploadForm.jsx';
import ResultTable from './ResultTable.jsx';
import StatsCards  from './StatsCards.jsx';
import { useAPI }  from '../hooks/useAPI';
import useAppStore from '../store/appStore';

export default function Dashboard() {
  const { fetchEstadisticas } = useAPI();
  const { loading } = useAppStore();

  useEffect(() => { fetchEstadisticas(); }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f' }}>

      {/* ─── Top App Bar ─────────────────────────────────────────────────────── */}
      <header style={{
        background:   '#121212',
        borderBottom: '1px solid #1e1e1e',
        position:     'sticky',
        top:          0,
        zIndex:       200,
        padding:      '0 24px'
      }}>
        <div style={{
          maxWidth: '1400px', margin: '0 auto',
          height: '56px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px', height: '32px',
              background: '#212121', borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', border: '1px solid #2e2e2e'
            }}>
              ▦
            </div>
            <span style={{
              fontFamily:    'Roboto, sans-serif',
              fontSize:      '16px',
              fontWeight:    500,
              letterSpacing: '0.15px',
              color:         '#e0e0e0'
            }}>
              SIRAH
            </span>
            <span style={{
              fontSize: '11px', color: '#424242',
              letterSpacing: '0.5px', paddingLeft: '4px',
              borderLeft: '1px solid #2e2e2e', marginLeft: '4px', paddingRight: '4px'
            }}>
              Remates Hipotecarios
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#424242', fontSize: '12px' }}>
                <span style={{
                  display: 'inline-block', width: '12px', height: '12px',
                  border: '1.5px solid #2e2e2e', borderTop: '1.5px solid #616161',
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                }} />
                Procesando
              </div>
            )}
            <span style={{ fontSize: '11px', color: '#2e2e2e', fontFamily: 'Roboto Mono, monospace' }}>
              v1.0
            </span>
          </div>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────────────────────────────────── */}
      <div style={{ background: '#121212', borderBottom: '1px solid #1e1e1e', padding: '32px 24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h1 style={{
            fontSize: 'clamp(20px, 2.5vw, 28px)',
            fontWeight: 300,
            letterSpacing: '-0.5px',
            color: '#e0e0e0',
            marginBottom: '6px'
          }}>
            Análisis de carteras hipotecarias
          </h1>
          <p style={{ color: '#424242', fontSize: '13px', fontWeight: 400 }}>
            Valuación comercial · Status jurídico PJV · Exportación CSV
          </p>
          <StatsCards />
        </div>
      </div>

      {/* ─── Main ────────────────────────────────────────────────────────────── */}
      <main className="md-sidebar-layout" style={{
        maxWidth: '1400px', margin: '0 auto', padding: '24px',
        display: 'grid', gridTemplateColumns: '320px 1fr',
        gap: '20px', alignItems: 'start'
      }}>
        {/* Sidebar */}
        <div className="md-sticky" style={{ position: 'sticky', top: '72px' }}>
          <UploadForm />
          <Steps />
        </div>

        {/* Results */}
        <div>
          <ResultTable />
        </div>
      </main>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{
        padding: '24px', textAlign: 'center',
        color: '#2e2e2e', fontSize: '11px',
        fontFamily: 'Roboto Mono, monospace',
        borderTop: '1px solid #1e1e1e', marginTop: '40px'
      }}>
        SIRAH · v1.0.0 · {new Date().getFullYear()}
      </footer>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Steps() {
  const items = [
    ['01', 'Sube el CSV',       'Cartera del banco'],
    ['02', 'Valuación + PJV',   'Automático'],
    ['03', 'Revisa la tabla',   'Ordena y filtra'],
    ['04', 'Exporta',           'CSV con análisis']
  ];
  return (
    <div style={{
      background: '#1a1a1a', border: '1px solid #2e2e2e',
      borderRadius: '12px', padding: '20px', marginTop: '12px'
    }}>
      <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#424242', marginBottom: '16px' }}>
        Flujo
      </div>
      {items.map(([n, title, desc]) => (
        <div key={n} style={{ display: 'flex', gap: '12px', marginBottom: '14px', alignItems: 'flex-start' }}>
          <span style={{
            fontFamily: 'Roboto Mono, monospace', fontSize: '10px',
            color: '#424242', paddingTop: '2px', minWidth: '20px'
          }}>
            {n}
          </span>
          <div>
            <div style={{ fontSize: '13px', color: '#9e9e9e', fontWeight: 400 }}>{title}</div>
            <div style={{ fontSize: '11px', color: '#424242' }}>{desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
