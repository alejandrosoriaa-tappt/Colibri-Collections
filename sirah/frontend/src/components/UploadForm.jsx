import React, { useState, useRef } from 'react';
import { useAPI } from '../hooks/useAPI';
import useAppStore from '../store/appStore';

export default function UploadForm() {
  const [file,      setFile]      = useState(null);
  const [dragOver,  setDragOver]  = useState(false);
  const [resultado, setResultado] = useState(null);
  const inputRef = useRef(null);

  const { procesarCartera } = useAPI();
  const { loading, error, clearError } = useAppStore();

  function pickFile(f) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv')) {
      useAppStore.getState().setError('Solo se aceptan archivos .csv');
      return;
    }
    clearError(); setResultado(null); setFile(f);
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    pickFile(e.dataTransfer.files[0]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) { useAppStore.getState().setError('Selecciona un archivo CSV'); return; }
    try {
      const data = await procesarCartera(file);
      setResultado({ total: data.total, errores: data.errores_csv?.length || 0 });
    } catch { /* manejado por store */ }
  }

  const borderColor = dragOver ? '#9e9e9e' : file ? '#66bb6a' : '#2e2e2e';

  return (
    <div style={{
      background:   '#1a1a1a',
      border:       '1px solid #2e2e2e',
      borderRadius: '12px',
      padding:      '24px'
    }}>
      {/* Title */}
      <div style={{
        fontSize:      '12px',
        fontWeight:    500,
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
        color:         '#616161',
        marginBottom:  '16px'
      }}>
        Procesar cartera
      </div>

      <form onSubmit={handleSubmit}>
        {/* Drop zone */}
        <div
          role="button" tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border:        `1px dashed ${borderColor}`,
            borderRadius:  '8px',
            padding:       '32px 16px',
            textAlign:     'center',
            cursor:        'pointer',
            background:    dragOver ? 'rgba(255,255,255,0.03)' : 'transparent',
            transition:    'all 0.18s'
          }}
        >
          <input ref={inputRef} type="file" accept=".csv,text/csv"
            style={{ display: 'none' }} onChange={e => pickFile(e.target.files[0])} />

          <div style={{ fontSize: '32px', marginBottom: '10px', opacity: 0.4 }}>
            {file ? '✓' : '↑'}
          </div>

          {file ? (
            <>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#66bb6a', fontFamily: 'Roboto Mono, monospace' }}>
                {file.name}
              </div>
              <div style={{ fontSize: '11px', color: '#616161', marginTop: '4px' }}>
                {(file.size/1024).toFixed(1)} KB · Toca para cambiar
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '14px', color: '#9e9e9e', fontWeight: 400 }}>
                Arrastra o selecciona un CSV
              </div>
              <div style={{ fontSize: '11px', color: '#616161', marginTop: '4px' }}>
                Máx. 10 MB
              </div>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: '12px', padding: '10px 14px',
            background: 'rgba(239,83,80,0.08)', border: '1px solid rgba(239,83,80,0.2)',
            borderRadius: '6px', color: '#ef5350', fontSize: '13px',
            display: 'flex', gap: '8px'
          }}>
            <span>✕</span><span>{error}</span>
          </div>
        )}

        {/* Success */}
        {resultado && !error && (
          <div style={{
            marginTop: '12px', padding: '10px 14px',
            background: 'rgba(102,187,106,0.08)', border: '1px solid rgba(102,187,106,0.2)',
            borderRadius: '6px', color: '#66bb6a', fontSize: '13px'
          }}>
            ✓ {resultado.total} expedientes procesados
            {resultado.errores > 0 && (
              <span style={{ color: '#ffa726', marginLeft: '8px' }}>
                ({resultado.errores} con errores)
              </span>
            )}
          </div>
        )}

        {/* Button */}
        <button type="submit" disabled={loading || !file} style={{
          marginTop:     '14px',
          width:         '100%',
          padding:       '12px',
          background:    loading || !file ? '#212121' : '#e0e0e0',
          color:         loading || !file ? '#616161' : '#0f0f0f',
          border:        'none',
          borderRadius:  '6px',
          fontSize:      '13px',
          fontWeight:    500,
          fontFamily:    'Roboto, sans-serif',
          letterSpacing: '0.5px',
          cursor:        loading || !file ? 'not-allowed' : 'pointer',
          display:       'flex',
          alignItems:    'center',
          justifyContent:'center',
          gap:           '8px',
          transition:    'background 0.18s'
        }}
        onMouseEnter={e => { if (!loading && file) e.currentTarget.style.background = '#f5f5f5'; }}
        onMouseLeave={e => { if (!loading && file) e.currentTarget.style.background = '#e0e0e0'; }}
        >
          {loading
            ? <><Spinner /> Procesando...</>
            : 'Procesar cartera'}
        </button>
      </form>

      {/* Format hint */}
      <details style={{ marginTop: '16px' }}>
        <summary style={{ cursor: 'pointer', fontSize: '11px', color: '#616161', userSelect: 'none', letterSpacing: '0.3px' }}>
          Columnas aceptadas
        </summary>
        <div style={{
          marginTop: '8px', padding: '12px',
          background: '#121212', borderRadius: '6px',
          fontSize: '11px', fontFamily: 'Roboto Mono, monospace',
          color: '#616161', lineHeight: 2, border: '1px solid #2e2e2e'
        }}>
          <span style={{ color: '#9e9e9e' }}>numero_expediente</span> ← requerido<br/>
          banco · ubicacion · valor_catastral<br/>
          monto_adeudo · fecha_inicio<br/>
          status_juridico · antiguedad_inmueble<br/>
          contacto · notas
        </div>
      </details>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: '14px', height: '14px',
      border: '2px solid #424242', borderTop: '2px solid #9e9e9e',
      borderRadius: '50%', animation: 'spin 0.8s linear infinite'
    }} />
  );
}
