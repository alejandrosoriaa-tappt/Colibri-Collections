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
    <div style={{ minHeight: '100vh', background: '#f0f4ff' }}>

      {/* ─── Top App Bar ─────────────────────────────────────────────────────── */}
      <header style={{
        background: 'linear-gradient(135deg, #1557b0 0%, #1a73e8 100%)',
        position: 'sticky', top: 0, zIndex: 200,
        padding: '0 24px',
        boxShadow: '0 2px 8px rgba(21,87,176,0.3)'
      }}>
        <div style={{
          maxWidth: '1400px', margin: '0 auto',
          height: '60px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '36px', height: '36px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: '16px'
            }}>S</div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 500, color: '#ffffff', letterSpacing: '0.2px' }}>
                SIRAH
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', letterSpacing: '0.3px', marginTop: '-2px' }}>
                Remates Hipotecarios
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
                <span style={{
                  display: 'inline-block', width: '14px', height: '14px',
                  border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white',
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                }} />
                Procesando
              </div>
            )}
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: 'Roboto Mono, monospace' }}>v1.0</span>
          </div>
        </div>
      </header>

      {/* ─── Hero banner ─────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(180deg, #1a73e8 0%, #1e88e5 60%, #f0f4ff 100%)',
        padding: '32px 24px 48px'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(20px, 2.5vw, 28px)', fontWeight: 300, color: '#ffffff', marginBottom: '4px' }}>
            Análisis de carteras hipotecarias
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
            Valuación comercial · Status jurídico PJV · Exportación CSV
          </p>
          <StatsCards />
        </div>
      </div>

      {/* ─── Main ────────────────────────────────────────────────────────────── */}
      <main className="md-sidebar-layout" style={{
        maxWidth: '1400px', margin: '-16px auto 0',
        padding: '0 24px 24px',
        display: 'grid', gridTemplateColumns: '320px 1fr',
        gap: '20px', alignItems: 'start'
      }}>
        <div className="md-sticky" style={{ position: 'sticky', top: '76px' }}>
          <UploadForm />
          <Steps />
        </div>
        <ResultTable />
      </main>

      <footer style={{
        padding: '24px', textAlign: 'center',
        color: '#9aa0a6', fontSize: '11px',
        fontFamily: 'Roboto Mono, monospace',
        borderTop: '1px solid #e3eaff', marginTop: '40px'
      }}>
        SIRAH · v1.0.0 · {new Date().getFullYear()}
      </footer>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Steps() {
  const items = [
    ['01', 'Sube el CSV',     'Cartera del banco'],
    ['02', 'Valuación + PJV', 'Automático'],
    ['03', 'Revisa la tabla', 'Ordena y filtra'],
    ['04', 'Exporta',         'CSV con análisis']
  ];
  return (
    <div style={{
      background: '#ffffff', border: '1px solid #dbeafe',
      borderRadius: '12px', padding: '20px', marginTop: '12px',
      boxShadow: '0 1px 4px rgba(26,115,232,0.08)'
    }}>
      <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#1a73e8', marginBottom: '16px' }}>
        Cómo funciona
      </div>
      {items.map(([n, title, desc]) => (
        <div key={n} style={{ display: 'flex', gap: '14px', marginBottom: '14px', alignItems: 'flex-start' }}>
          <span style={{
            width: '22px', height: '22px', borderRadius: '50%',
            background: '#e8f0fe', color: '#1a73e8',
            fontSize: '10px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            {n.replace('0','')}
          </span>
          <div>
            <div style={{ fontSize: '13px', color: '#202124', fontWeight: 500 }}>{title}</div>
            <div style={{ fontSize: '12px', color: '#9aa0a6' }}>{desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
