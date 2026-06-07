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
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>

      {/* ─── Top App Bar — Google style ──────────────────────────────────────── */}
      <header style={{
        background:   '#ffffff',
        borderBottom: '1px solid #e0e0e0',
        position:     'sticky',
        top:          0,
        zIndex:       200,
        padding:      '0 24px'
      }}>
        <div style={{
          maxWidth: '1400px', margin: '0 auto',
          height: '64px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Logo mark */}
            <div style={{
              width: '36px', height: '36px',
              background: '#1a73e8',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: '16px',
              fontFamily: 'Roboto, sans-serif', letterSpacing: '-0.5px'
            }}>
              S
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 400, color: '#202124', letterSpacing: '-0.2px' }}>
                SIRAH
              </div>
              <div style={{ fontSize: '11px', color: '#9aa0a6', letterSpacing: '0.2px', marginTop: '-2px' }}>
                Remates Hipotecarios
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9aa0a6', fontSize: '13px' }}>
                <span style={{
                  display: 'inline-block', width: '14px', height: '14px',
                  border: '2px solid #e8eaed', borderTop: '2px solid #1a73e8',
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                }} />
                Procesando
              </div>
            )}
            <span style={{ fontSize: '12px', color: '#dadce0', fontFamily: 'Roboto Mono, monospace' }}>
              v1.0
            </span>
          </div>
        </div>
      </header>

      {/* ─── Stats banner ────────────────────────────────────────────────────── */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e8eaed', padding: '28px 24px 32px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(20px, 2.5vw, 26px)', fontWeight: 400, color: '#202124', marginBottom: '4px' }}>
            Análisis de carteras hipotecarias
          </h1>
          <p style={{ color: '#9aa0a6', fontSize: '13px' }}>
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
        <div className="md-sticky" style={{ position: 'sticky', top: '80px' }}>
          <UploadForm />
          <Steps />
        </div>
        <ResultTable />
      </main>

      <footer style={{
        padding: '24px', textAlign: 'center',
        color: '#dadce0', fontSize: '11px',
        fontFamily: 'Roboto Mono, monospace',
        borderTop: '1px solid #e8eaed', marginTop: '40px'
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
      background: '#ffffff', border: '1px solid #e0e0e0',
      borderRadius: '12px', padding: '20px', marginTop: '12px'
    }}>
      <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#9aa0a6', marginBottom: '16px' }}>
        Cómo funciona
      </div>
      {items.map(([n, title, desc]) => (
        <div key={n} style={{ display: 'flex', gap: '14px', marginBottom: '14px', alignItems: 'flex-start' }}>
          <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '11px', color: '#dadce0', paddingTop: '2px', minWidth: '22px' }}>
            {n}
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
