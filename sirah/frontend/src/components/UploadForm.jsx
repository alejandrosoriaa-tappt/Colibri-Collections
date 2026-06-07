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
    const ext = f.name.toLowerCase().split('.').pop();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      useAppStore.getState().setError('Solo se aceptan archivos CSV o Excel (.csv, .xlsx, .xls)');
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

  const borderColor = dragOver ? '#1a73e8' : file ? '#188038' : '#e0e0e0';
  const dropBg      = dragOver ? '#e8f0fe' : file ? '#e6f4ea' : '#fafafa';

  return (
    <div style={{
      background: '#ffffff', border: '1px solid #e0e0e0',
      borderRadius: '12px', padding: '24px'
    }}>
      <div style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#9aa0a6', marginBottom: '16px' }}>
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
            border: `2px dashed ${borderColor}`,
            borderRadius: '8px', padding: '32px 16px',
            textAlign: 'center', cursor: 'pointer',
            background: dropBg, transition: 'all 0.18s'
          }}
        >
          <input ref={inputRef} type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            style={{ display: 'none' }} onChange={e => pickFile(e.target.files[0])} />

          <div style={{ fontSize: '28px', marginBottom: '10px', opacity: 0.35 }}>
            {file ? '✓' : '☁'}
          </div>

          {file ? (
            <>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#188038', fontFamily: 'Roboto Mono, monospace' }}>
                {file.name}
              </div>
              <div style={{ fontSize: '11px', color: '#9aa0a6', marginTop: '4px' }}>
                {(file.size/1024).toFixed(1)} KB · Toca para cambiar
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '14px', color: '#5f6368', fontWeight: 400 }}>
                Arrastra o selecciona archivo
              </div>
              <div style={{ fontSize: '11px', color: '#9aa0a6', marginTop: '4px' }}>
                CSV · Excel (.xlsx · .xls) · Máx. 20 MB
              </div>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: '12px', padding: '10px 14px',
            background: '#fce8e6', border: '1px solid #f5c6c2',
            borderRadius: '6px', color: '#c5221f', fontSize: '13px',
            display: 'flex', gap: '8px'
          }}>
            <span>✕</span><span>{error}</span>
          </div>
        )}

        {/* Success */}
        {resultado && !error && (
          <div style={{
            marginTop: '12px', padding: '10px 14px',
            background: '#e6f4ea', border: '1px solid #b7dfbf',
            borderRadius: '6px', color: '#137333', fontSize: '13px'
          }}>
            ✓ {resultado.total} expedientes procesados
            {resultado.errores > 0 && (
              <span style={{ color: '#e37400', marginLeft: '8px' }}>
                ({resultado.errores} con errores)
              </span>
            )}
          </div>
        )}

        {/* Google-style filled button */}
        <button type="submit" disabled={loading || !file} style={{
          marginTop: '14px', width: '100%', padding: '10px',
          background: loading || !file ? '#f1f3f4' : '#1a73e8',
          color: loading || !file ? '#9aa0a6' : '#ffffff',
          border: 'none', borderRadius: '6px',
          fontSize: '14px', fontWeight: 500,
          fontFamily: 'Roboto, sans-serif',
          letterSpacing: '0.25px',
          cursor: loading || !file ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '8px', transition: 'background 0.18s'
        }}
        onMouseEnter={e => { if (!loading && file) e.currentTarget.style.background = '#1557b0'; }}
        onMouseLeave={e => { if (!loading && file) e.currentTarget.style.background = '#1a73e8'; }}
        >
          {loading ? <><Spinner /> Procesando...</> : 'Procesar cartera'}
        </button>
      </form>

      <details style={{ marginTop: '16px' }}>
        <summary style={{ cursor: 'pointer', fontSize: '12px', color: '#9aa0a6', userSelect: 'none' }}>
          Columnas aceptadas
        </summary>
        <div style={{
          marginTop: '8px', padding: '12px',
          background: '#f8f9fa', borderRadius: '6px',
          fontSize: '11px', fontFamily: 'Roboto Mono, monospace',
          color: '#9aa0a6', lineHeight: 2, border: '1px solid #e8eaed'
        }}>
          <span style={{ color: '#5f6368' }}>numero_expediente</span> ← requerido<br/>
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
      border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white',
      borderRadius: '50%', animation: 'spin 0.8s linear infinite'
    }} />
  );
}
