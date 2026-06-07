import React, { useState, useRef } from 'react';
import { useAPI } from '../hooks/useAPI';
import useAppStore from '../store/appStore';

// ─── UploadForm ───────────────────────────────────────────────────────────────
export default function UploadForm() {
  const [file,      setFile]      = useState(null);
  const [dragOver,  setDragOver]  = useState(false);
  const [resultado, setResultado] = useState(null);
  const inputRef = useRef(null);

  const { procesarCartera } = useAPI();
  const { loading, error, clearError } = useAppStore();

  // ── Manejo de archivo ────────────────────────────────────────────────────
  function pickFile(f) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv')) {
      useAppStore.getState().setError('Solo se aceptan archivos .csv');
      return;
    }
    clearError();
    setResultado(null);
    setFile(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files[0]);
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) { useAppStore.getState().setError('Selecciona un archivo CSV'); return; }

    try {
      const data = await procesarCartera(file);
      setResultado({ total: data.total, errores: data.errores_csv?.length || 0 });
    } catch { /* error manejado por el store */ }
  }

  // ── Styles inline ─────────────────────────────────────────────────────────
  const dropBorder = dragOver ? '#d97a3a' : file ? '#2ecc71' : '#ced4da';
  const dropBg     = dragOver ? 'rgba(217,122,58,0.06)' : file ? 'rgba(46,204,113,0.06)' : '#fafafa';

  return (
    <div style={{
      background:   'white',
      borderRadius: '12px',
      padding:      '24px',
      boxShadow:    'var(--shadow)'
    }}>
      <h2 style={{
        fontFamily:   'var(--font-display)',
        fontSize:     '16px',
        color:        'var(--sirah-primary)',
        marginBottom: '18px',
        display:      'flex',
        gap:          '8px',
        alignItems:   'center'
      }}>
        📂 Procesar Cartera
      </h2>

      <form onSubmit={handleSubmit}>
        {/* ─ Drop zone */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Zona de carga de archivo CSV"
          style={{
            border:       `2px dashed ${dropBorder}`,
            borderRadius: '10px',
            padding:      '36px 16px',
            textAlign:    'center',
            cursor:       'pointer',
            background:   dropBg,
            transition:   'var(--transition)'
          }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={e  => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv,application/vnd.ms-excel"
            style={{ display: 'none' }}
            onChange={e => pickFile(e.target.files[0])}
          />

          <div style={{ fontSize: '36px', marginBottom: '10px' }}>
            {file ? '✅' : '📄'}
          </div>

          {file ? (
            <>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize:   '13px',
                fontWeight: 600,
                color:      'var(--sirah-success)'
              }}>
                {file.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px' }}>
                {(file.size / 1024).toFixed(1)} KB — Click para cambiar
              </div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 600, color: 'var(--gray-700)', marginBottom: '4px' }}>
                Arrastra tu CSV aquí o haz click
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                Máx. 10 MB · Separador: coma, punto y coma o tab
              </div>
            </>
          )}
        </div>

        {/* ─ Error */}
        {error && (
          <div style={{
            marginTop:    '12px',
            padding:      '10px 14px',
            background:   'rgba(231,76,60,0.08)',
            border:       '1px solid rgba(231,76,60,0.25)',
            borderRadius: 'var(--radius)',
            color:        'var(--sirah-warning)',
            fontSize:     '13px',
            display:      'flex',
            gap:          '8px'
          }}>
            <span>✗</span>
            <span>{error}</span>
          </div>
        )}

        {/* ─ Éxito */}
        {resultado && !error && (
          <div style={{
            marginTop:    '12px',
            padding:      '10px 14px',
            background:   'rgba(46,204,113,0.08)',
            border:       '1px solid rgba(46,204,113,0.25)',
            borderRadius: 'var(--radius)',
            color:        'var(--sirah-success-dark)',
            fontSize:     '13px'
          }}>
            ✓ {resultado.total} expedientes procesados
            {resultado.errores > 0 && (
              <span style={{ color: '#f39c12', marginLeft: '8px' }}>
                ({resultado.errores} filas con errores de formato)
              </span>
            )}
          </div>
        )}

        {/* ─ Botón */}
        <button
          type="submit"
          disabled={loading || !file}
          style={{
            marginTop:    '14px',
            width:        '100%',
            padding:      '13px',
            background:   loading || !file ? 'var(--gray-400)' : 'var(--sirah-primary)',
            color:        'white',
            border:       'none',
            borderRadius: 'var(--radius)',
            fontSize:     '14px',
            fontWeight:   700,
            fontFamily:   'var(--font-display)',
            cursor:       loading || !file ? 'not-allowed' : 'pointer',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            gap:          '8px',
            transition:   'background 0.2s'
          }}
          onMouseEnter={e => {
            if (!loading && file) e.currentTarget.style.background = 'var(--sirah-accent)';
          }}
          onMouseLeave={e => {
            if (!loading && file) e.currentTarget.style.background = 'var(--sirah-primary)';
          }}
        >
          {loading
            ? (<><Spinner /> Procesando...</>)
            : '⚡ Procesar Cartera'}
        </button>
      </form>

      {/* ─ Hint formato CSV */}
      <details style={{ marginTop: '16px' }}>
        <summary style={{
          cursor:     'pointer',
          color:      'var(--gray-500)',
          fontSize:   '12px',
          userSelect: 'none'
        }}>
          ℹ️ Columnas aceptadas
        </summary>
        <div style={{
          marginTop:    '8px',
          padding:      '12px',
          background:   'var(--gray-100)',
          borderRadius: 'var(--radius-sm)',
          fontSize:     '11px',
          fontFamily:   'var(--font-data)',
          color:        'var(--gray-700)',
          lineHeight:   1.9
        }}>
          <strong>Requerida:</strong> numero_expediente (o: expediente, folio)<br />
          <strong>Opcionales:</strong> banco · ubicacion · valor_catastral<br />
          monto_adeudo · fecha_inicio · status_juridico<br />
          antiguedad_inmueble · contacto · notas
        </div>
      </details>
    </div>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <span style={{
      display:      'inline-block',
      width:        '14px',
      height:       '14px',
      border:       '2px solid rgba(255,255,255,0.3)',
      borderTop:    '2px solid white',
      borderRadius: '50%',
      animation:    'spin 0.8s linear infinite'
    }} />
  );
}
