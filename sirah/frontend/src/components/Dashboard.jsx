import React, { useEffect, useState } from 'react';
import UploadForm   from './UploadForm.jsx';
import ResultTable  from './ResultTable.jsx';
import StatsCards   from './StatsCards.jsx';
import ArchivosList from './ArchivosList.jsx';
import { useAPI }   from '../hooks/useAPI';
import useAppStore  from '../store/appStore';

const NAV = [
  { key: 'cartera',  icon: '📂', label: 'Cartera' },
  { key: 'archivos', icon: '🗂',  label: 'Archivos' },
  { key: 'analisis', icon: '📊', label: 'Análisis' },
  { key: 'config',   icon: '⚙',  label: 'Config' }
];

function useMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

export default function Dashboard() {
  const { fetchEstadisticas, fetchArchivos } = useAPI();
  const { loading, expedientes } = useAppStore();
  const [section, setSection] = useState('cartera');
  const isMobile = useMobile();

  useEffect(() => { fetchEstadisticas(); fetchArchivos(); }, []);

  const pad = isMobile ? '16px' : '28px';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8faff', fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>

      {/* ─── Sidebar (desktop only) ──────────────────────────────────────────── */}
      {!isMobile && (
        <aside style={{
          width: '220px', flexShrink: 0,
          background: '#ffffff',
          borderRight: '1px solid #e3eeff',
          display: 'flex', flexDirection: 'column',
          padding: '0 0 24px',
          position: 'sticky', top: 0, height: '100vh',
          overflowY: 'auto'
        }}>
          {/* Logo */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #e3eeff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px', height: '34px',
                background: 'linear-gradient(135deg, #1565c0, #42a5f5)',
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: '15px'
              }}>S</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0d2a6b' }}>SIRAH</div>
                <div style={{ fontSize: '9px', color: '#5c7099', marginTop: '1px', fontWeight: 600, lineHeight: 1.3, maxWidth: '140px' }}>
                  Sistema de Información de Remates y Activos Hipotecarios
                </div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ padding: '12px 10px', flex: 1 }}>
            {NAV.map(({ key, icon, label }) => {
              const active = section === key;
              return (
                <div key={key} onClick={() => setSection(key)} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '8px',
                  marginBottom: '2px', cursor: 'pointer',
                  background: active ? '#e8f0fe' : 'transparent',
                  color: active ? '#1565c0' : '#5c7099',
                  fontWeight: active ? 700 : 600,
                  fontSize: '14px', transition: 'all 0.15s'
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f0f4ff'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: '16px', opacity: active ? 1 : 0.6 }}>{icon}</span>
                  {label}
                  {active && <div style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: '#1565c0' }} />}
                </div>
              );
            })}
          </nav>

          {/* User */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #e3eeff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #1976d2, #64b5f6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '13px', fontWeight: 600
              }}>U</div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0d2a6b' }}>Usuario</div>
                <div style={{ fontSize: '10px', color: '#5c7099', fontWeight: 600 }}>Inversionista</div>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* ─── Main ────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: isMobile ? '72px' : 0 }}>

        {/* Top bar */}
        <div style={{
          background: '#ffffff', borderBottom: '1px solid #e3eeff',
          padding: `0 ${pad}`, height: isMobile ? '56px' : '60px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 100
        }}>
          {/* Mobile: show logo. Desktop: show section name */}
          {isMobile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px', height: '28px',
                background: 'linear-gradient(135deg, #1565c0, #42a5f5)',
                borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: '13px'
              }}>S</div>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#0d2a6b' }}>SIRAH</span>
            </div>
          ) : (
            <div style={{ fontSize: '15px', color: '#5c7099', fontWeight: 600 }}>
              {NAV.find(n => n.key === section)?.label}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#90a4c8', fontSize: '12px' }}>
                <span style={{
                  display: 'inline-block', width: '13px', height: '13px',
                  border: '2px solid #dbeafe', borderTop: '2px solid #1976d2',
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                }} />
                {!isMobile && 'Procesando'}
              </div>
            )}
            <div style={{
              background: '#e8f0fe', color: '#1565c0',
              padding: isMobile ? '4px 10px' : '5px 14px',
              borderRadius: '20px',
              fontSize: isMobile ? '11px' : '12px', fontWeight: 700,
              whiteSpace: 'nowrap'
            }}>
              {expedientes.length} {isMobile ? 'exp.' : 'expedientes cargados'}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: pad }}>

          {/* Greeting */}
          <div style={{ marginBottom: isMobile ? '16px' : '24px' }}>
            <h1 style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 700, color: '#0d2a6b', marginBottom: '4px' }}>
              Hola, SIRAH 👋
            </h1>
            <p style={{ fontSize: '13px', color: '#5c7099', fontWeight: 600 }}>Resumen de cartera hipotecaria</p>
          </div>

          {/* KPI cards */}
          <StatsCards />

          {section === 'archivos' ? (
            /* ── Archivos procesados ── */
            <div style={{ marginTop: isMobile ? '20px' : '32px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0d2a6b', marginBottom: '16px' }}>
                Archivos procesados
              </h2>
              <ArchivosList onCargar={() => setSection('cartera')} />
            </div>

          ) : (
            /* ── Cartera activa ── */
            <div style={{ marginTop: isMobile ? '20px' : '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0d2a6b' }}>Cartera activa</h2>
                <span
                  onClick={() => setSection('archivos')}
                  style={{ fontSize: '12px', color: '#1976d2', cursor: 'pointer', fontWeight: 700 }}
                >
                  🗂 Ver archivos →
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '300px 1fr',
                gap: isMobile ? '16px' : '20px',
                alignItems: 'start'
              }}>
                <UploadForm onProcesado={() => fetchArchivos()} />
                <ResultTable />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Bottom nav (mobile only) ────────────────────────────────────────── */}
      {isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: '60px',
          background: '#ffffff',
          borderTop: '1px solid #e3eeff',
          display: 'flex', alignItems: 'stretch',
          zIndex: 200,
          boxShadow: '0 -2px 12px rgba(21,101,192,0.10)'
        }}>
          {NAV.map(({ key, icon, label }) => {
            const active = section === key;
            return (
              <button key={key} onClick={() => setSection(key)} style={{
                flex: 1, border: 'none', background: 'transparent',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '3px', cursor: 'pointer',
                color: active ? '#1565c0' : '#9aa0a6',
                padding: '6px 0',
                borderTop: active ? '2px solid #1565c0' : '2px solid transparent',
                transition: 'all 0.15s'
              }}>
                <span style={{ fontSize: '18px', lineHeight: 1 }}>{icon}</span>
                <span style={{ fontSize: '10px', fontWeight: active ? 800 : 600, letterSpacing: '0.2px' }}>{label}</span>
              </button>
            );
          })}
        </nav>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
