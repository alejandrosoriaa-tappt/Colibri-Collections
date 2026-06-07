import React, { useEffect, useState } from 'react';
import UploadForm  from './UploadForm.jsx';
import ResultTable from './ResultTable.jsx';
import StatsCards  from './StatsCards.jsx';
import { useAPI }  from '../hooks/useAPI';
import useAppStore from '../store/appStore';

const NAV = [
  { key: 'inicio',   icon: '⊞', label: 'Inicio' },
  { key: 'cartera',  icon: '📂', label: 'Cartera' },
  { key: 'analisis', icon: '📊', label: 'Análisis' },
  { key: 'config',   icon: '⚙',  label: 'Configuración' }
];

export default function Dashboard() {
  const { fetchEstadisticas } = useAPI();
  const { loading, expedientes } = useAppStore();
  const [section, setSection] = useState('inicio');

  useEffect(() => { fetchEstadisticas(); }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8faff', fontFamily: 'Roboto, sans-serif', fontWeight: 500 }}>

      {/* ─── Sidebar ─────────────────────────────────────────────────────────── */}
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
              <div style={{ fontSize: '9px', color: '#5c7099', marginTop: '1px', fontWeight: 600, lineHeight: 1.3, maxWidth: '140px' }}>Sistema de Información de Remates y Activos Hipotecarios</div>
            </div>
          </div>
        </div>

        {/* Nav items */}
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
                {active && <div style={{ marginLeft: 'auto', width: '4px', height: '4px', borderRadius: '50%', background: '#1565c0' }} />}
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

      {/* ─── Main ────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto' }}>

        {/* Top bar */}
        <div style={{
          background: '#ffffff', borderBottom: '1px solid #e3eeff',
          padding: '0 28px', height: '60px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 100
        }}>
          <div style={{ fontSize: '15px', color: '#5c7099', fontWeight: 600 }}>
            {NAV.find(n => n.key === section)?.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#90a4c8', fontSize: '12px' }}>
                <span style={{
                  display: 'inline-block', width: '13px', height: '13px',
                  border: '2px solid #dbeafe', borderTop: '2px solid #1976d2',
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                }} />
                Procesando
              </div>
            )}
            <div style={{
              background: '#e8f0fe', color: '#1565c0',
              padding: '5px 14px', borderRadius: '20px',
              fontSize: '12px', fontWeight: 700
            }}>
              {expedientes.length} expedientes&nbsp;cargados
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '28px' }}>

          {/* Greeting */}
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0d2a6b', marginBottom: '4px' }}>
              Hola, SIRAH 👋
            </h1>
            <p style={{ fontSize: '13px', color: '#5c7099', fontWeight: 600 }}>Resumen de cartera hipotecaria</p>
          </div>

          {/* KPI cards */}
          <StatsCards />

          {/* Cartera activa */}
          <div style={{ marginTop: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0d2a6b' }}>Cartera activa</h2>
              {expedientes.length > 0 && (
                <span style={{ fontSize: '12px', color: '#1976d2', cursor: 'pointer' }}>
                  Ver todas →
                </span>
              )}
            </div>

            {/* Upload + table */}
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', alignItems: 'start' }}>
              <UploadForm />
              <ResultTable />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          aside { display: none; }
          div[style*="grid-template-columns: 300px"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
