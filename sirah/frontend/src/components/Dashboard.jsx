import React, { useEffect } from 'react';
import UploadForm  from './UploadForm.jsx';
import ResultTable from './ResultTable.jsx';
import StatsCards  from './StatsCards.jsx';
import { useAPI }  from '../hooks/useAPI';
import useAppStore from '../store/appStore';

export default function Dashboard() {
  const { fetchEstadisticas } = useAPI();
  const { loading }           = useAppStore();

  useEffect(() => {
    fetchEstadisticas();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sirah-light)' }}>

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header style={{
        background:   'var(--sirah-primary)',
        boxShadow:    '0 2px 10px rgba(0,0,0,0.25)',
        position:     'sticky',
        top:          0,
        zIndex:       200,
        padding:      '0 24px'
      }}>
        <div style={{
          maxWidth:   'var(--max-width)',
          margin:     '0 auto',
          height:     '60px',
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width:        '38px',
              height:       '38px',
              background:   'var(--sirah-accent)',
              borderRadius: '8px',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              fontSize:     '20px',
              flexShrink:   0
            }}>
              🏛
            </div>
            <div>
              <div style={{
                color:       'white',
                fontFamily:  'var(--font-display)',
                fontSize:    '20px',
                fontWeight:  700,
                lineHeight:  1
              }}>
                SIRAH
              </div>
              <div style={{
                color:         'rgba(255,255,255,0.55)',
                fontSize:      '10px',
                letterSpacing: '0.8px',
                textTransform: 'uppercase'
              }}>
                Remates y Activos Hipotecarios
              </div>
            </div>
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {loading && (
              <div style={{
                display:    'flex',
                alignItems: 'center',
                gap:        '7px',
                color:      'rgba(255,255,255,0.65)',
                fontSize:   '12px'
              }}>
                <span style={{
                  display:      'inline-block',
                  width:        '12px',
                  height:       '12px',
                  border:       '2px solid rgba(255,255,255,0.25)',
                  borderTop:    '2px solid var(--sirah-accent)',
                  borderRadius: '50%',
                  animation:    'spin 0.8s linear infinite'
                }} />
                Procesando…
              </div>
            )}
            <span style={{
              color:      'rgba(255,255,255,0.35)',
              fontSize:   '11px',
              fontFamily: 'var(--font-display)'
            }}>
              v1.0.0
            </span>
          </div>
        </div>
      </header>

      {/* ─── Hero / Stats ────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(145deg, var(--sirah-primary) 0%, var(--sirah-primary-light) 100%)',
        padding:    '30px 24px 36px'
      }}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          <h1 style={{
            color:      'white',
            fontFamily: 'var(--font-display)',
            fontSize:   'clamp(18px, 2.5vw, 28px)',
            fontWeight: 700,
            marginBottom: '6px'
          }}>
            Análisis de Carteras Hipotecarias
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px', maxWidth: '540px' }}>
            Procesa expedientes de remate, estima valor comercial y consulta status jurídico PJV — todo en segundos.
          </p>

          <StatsCards />
        </div>
      </div>

      {/* ─── Main content ───────────────────────────────────────────────────── */}
      <main
        className="sirah-sidebar-layout"
        style={{
          maxWidth:            'var(--max-width)',
          margin:              '0 auto',
          padding:             '24px',
          display:             'grid',
          gridTemplateColumns: '340px 1fr',
          gap:                 '24px',
          alignItems:          'start'
        }}
      >
        {/* ─ Sidebar */}
        <div className="sirah-sticky" style={{ position: 'sticky', top: '76px' }}>
          <UploadForm />
          <GuideCard />
        </div>

        {/* ─ Results */}
        <div className="fadeIn">
          <ResultTable />
        </div>
      </main>

      {/* ─── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{
        textAlign:    'center',
        padding:      '24px',
        color:        'var(--gray-500)',
        fontSize:     '11px',
        fontFamily:   'var(--font-display)',
        borderTop:    '1px solid var(--gray-300)',
        marginTop:    '40px'
      }}>
        SIRAH v1.0.0 · Sistema de Información de Remates y Activos Hipotecarios · {new Date().getFullYear()}
      </footer>
    </div>
  );
}

// ─── Guía rápida ─────────────────────────────────────────────────────────────
function GuideCard() {
  const steps = [
    ['1', 'Sube el CSV del banco',     'Con expedientes y valores catastrales'],
    ['2', 'SIRAH valúa + PJV',          'Estimación comercial y status legal'],
    ['3', 'Revisa la tabla',            'Ordena, filtra, busca'],
    ['4', 'Exporta resultados',         'CSV con análisis completo']
  ];

  return (
    <div style={{
      background:   'white',
      borderRadius: '12px',
      padding:      '20px',
      marginTop:    '16px',
      boxShadow:    'var(--shadow)'
    }}>
      <h3 style={{
        fontFamily:   'var(--font-display)',
        fontSize:     '13px',
        color:        'var(--sirah-primary)',
        marginBottom: '14px'
      }}>
        ⚡ Cómo funciona
      </h3>
      {steps.map(([n, title, desc]) => (
        <div key={n} style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'flex-start' }}>
          <div style={{
            width:        '22px',
            height:       '22px',
            background:   'var(--sirah-accent)',
            borderRadius: '50%',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            color:        'white',
            fontSize:     '11px',
            fontWeight:   700,
            flexShrink:   0
          }}>
            {n}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-800)' }}>{title}</div>
            <div style={{ fontSize: '11px', color: 'var(--gray-500)' }}>{desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
