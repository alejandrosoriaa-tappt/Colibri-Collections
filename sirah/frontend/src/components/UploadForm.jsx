import React, { useState, useRef } from 'react';
import { useAPI } from '../hooks/useAPI';
import useAppStore from '../store/appStore';

export default function UploadForm({ onProcesado }) {
  const [file,       setFile]       = useState(null);
  const [dragOver,   setDragOver]   = useState(false);
  const [resultado,  setResultado]  = useState(null);
  const [preview,    setPreview]    = useState(null); // {hojas:[{nombre,filas,columnas}]}
  const [loadingPre, setLoadingPre] = useState(false);
  const inputRef = useRef(null);

  const { procesarCartera, leerHojas } = useAPI();
  const { loading, error, clearError } = useAppStore();

  async function pickFile(f) {
    if (!f) return;
    const ext = f.name.toLowerCase().split('.').pop();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      useAppStore.getState().setError('Solo se aceptan archivos CSV o Excel (.csv, .xlsx, .xls)');
      return;
    }
    clearError(); setResultado(null); setPreview(null); setFile(f);

    // Preview automático para Excel
    if (['xlsx', 'xls'].includes(ext)) {
      setLoadingPre(true);
      try {
        const data = await leerHojas(f);
        setPreview(data);
      } catch {
        // no crítico — continuar sin preview
      } finally {
        setLoadingPre(false);
      }
    }
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    pickFile(e.dataTransfer.files[0]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) { useAppStore.getState().setError('Selecciona un archivo'); return; }
    try {
      const data = await procesarCartera(file);
      setResultado({
        total:           data.total,
        errores:         data.errores_csv?.length || 0,
        hojas:           data.hojas_procesadas   || [],
        mapeo:           data.mapeo_columnas      || [],
        hoja_usada:      data.hoja_usada
      });
      onProcesado?.();
    } catch { /* manejado por store */ }
  }

  const borderColor = dragOver ? '#1a73e8' : file ? '#188038' : '#e0e0e0';
  const dropBg      = dragOver ? '#e8f0fe' : file ? '#e6f4ea' : '#fafafa';

  return (
    <div style={{
      background: '#ffffff', border: '1px solid #e0e0e0',
      borderRadius: '12px', padding: '24px'
    }}>
      <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#9aa0a6', marginBottom: '16px' }}>
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
            borderRadius: '8px', padding: '28px 16px',
            textAlign: 'center', cursor: 'pointer',
            background: dropBg, transition: 'all 0.18s'
          }}
        >
          <input ref={inputRef} type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            style={{ display: 'none' }} onChange={e => pickFile(e.target.files[0])} />

          <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.35 }}>
            {file ? '✓' : '☁'}
          </div>

          {file ? (
            <>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#188038', fontFamily: 'Roboto Mono, monospace', wordBreak: 'break-all' }}>
                {file.name}
              </div>
              <div style={{ fontSize: '11px', color: '#9aa0a6', marginTop: '4px' }}>
                {(file.size/1024).toFixed(1)} KB · Toca para cambiar
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '14px', color: '#5f6368', fontWeight: 600 }}>
                Arrastra o selecciona archivo
              </div>
              <div style={{ fontSize: '11px', color: '#9aa0a6', marginTop: '4px' }}>
                CSV · Excel (.xlsx · .xls) · Máx. 20 MB
              </div>
            </>
          )}
        </div>

        {/* Preview de hojas */}
        {loadingPre && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#1a73e8', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <Spinner blue /> Leyendo hojas del archivo…
          </div>
        )}

        {preview && preview.hojas?.length > 0 && (
          <div style={{ marginTop: '14px' }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#212121', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Hojas detectadas
              </span>
              <span style={{ fontSize: '12px', color: '#424242', fontWeight: 600 }}>
                — {preview.hojas.length} pestañas con datos
              </span>
            </div>

            {preview.hojas.map((h, i) => {
              const ACCENT = ['#1565c0','#2e7d32','#e65100','#6a1b9a','#00695c','#c62828'];
              const accent = ACCENT[i % ACCENT.length];
              return (
                <div key={i} style={{
                  background: '#ffffff',
                  border: '1px solid #e0e0e0',
                  borderLeft: `4px solid ${accent}`,
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '6px',
                }}>
                  {/* Sheet name + row count */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: h.columnas?.length ? '8px' : 0 }}>
                    <span style={{
                      background: accent, color: '#ffffff',
                      fontSize: '12px', fontWeight: 800,
                      padding: '2px 10px', borderRadius: '20px',
                      letterSpacing: '0.3px'
                    }}>
                      {h.nombre}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#212121' }}>
                      {h.filas.toLocaleString()} filas de datos
                    </span>
                  </div>

                  {/* Column tags */}
                  {h.columnas?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {h.columnas.slice(0, 8).map((col, j) => (
                        <span key={j} style={{
                          fontSize: '11px', fontWeight: 600,
                          color: '#424242', background: '#f5f5f5',
                          border: '1px solid #e0e0e0',
                          padding: '2px 8px', borderRadius: '12px',
                        }}>
                          {col}
                        </span>
                      ))}
                      {h.columnas.length > 8 && (
                        <span style={{
                          fontSize: '11px', fontWeight: 700, color: accent,
                          background: '#fafafa', border: `1px solid ${accent}`,
                          padding: '2px 8px', borderRadius: '12px'
                        }}>
                          +{h.columnas.length - 8} más
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            marginTop: '12px', padding: '10px 14px',
            background: '#fce8e6', border: '1px solid #f5c6c2',
            borderRadius: '6px', color: '#c5221f', fontSize: '13px',
            display: 'flex', gap: '8px'
          }}>
            <span>✕</span><span style={{ fontWeight: 600 }}>{error}</span>
          </div>
        )}

        {/* Success */}
        {resultado && !error && (
          <div style={{
            marginTop: '12px', padding: '10px 14px',
            background: '#e6f4ea', border: '1px solid #b7dfbf',
            borderRadius: '6px', color: '#137333', fontSize: '13px', fontWeight: 700
          }}>
            ✓ {resultado.total} expedientes procesados
            {resultado.errores > 0 && (
              <span style={{ color: '#e37400', marginLeft: '8px', fontWeight: 600 }}>
                ({resultado.errores} con errores)
              </span>
            )}

            {/* Resumen por hoja */}
            {resultado.hojas?.length > 0 && (
              <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {resultado.hojas.map((h, i) => (
                  <span key={i} style={{
                    fontSize: '12px', fontWeight: 700,
                    color: '#1b5e20', background: '#c8e6c9',
                    border: '1px solid #a5d6a7',
                    padding: '3px 10px', borderRadius: '20px'
                  }}>
                    {h.hoja}: {h.total.toLocaleString()} registros
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mapeo de columnas detectadas */}
        {resultado?.mapeo?.length > 0 && (
          <details style={{ marginTop: '10px' }}>
            <summary style={{ cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#1565c0', userSelect: 'none' }}>
              Ver mapeo de columnas detectadas
            </summary>
            <div style={{
              marginTop: '6px', padding: '10px',
              background: '#fafafa', borderRadius: '6px',
              border: '1px solid #e0e0e0', maxHeight: '220px', overflowY: 'auto'
            }}>
              {resultado.mapeo.map((m, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  fontSize: '12px', padding: '4px 0',
                  borderBottom: i < resultado.mapeo.length - 1 ? '1px solid #eeeeee' : 'none'
                }}>
                  <span style={{ fontFamily: 'Roboto Mono, monospace', color: '#424242', fontWeight: 600, flex: 1 }}>{m.columna_original}</span>
                  <span style={{ color: '#757575', fontWeight: 700 }}>→</span>
                  <span style={{
                    fontFamily: 'Roboto Mono, monospace', fontWeight: 800,
                    color: m.campo_mapeado === m.columna_original ? '#e65100' : '#1565c0',
                    flex: 1
                  }}>{m.campo_mapeado}</span>
                  <span style={{
                    fontSize: '11px', padding: '2px 7px',
                    borderRadius: '10px', fontWeight: 700,
                    background: m.metodo === 'contenido' ? '#e3f2fd' : '#f5f5f5',
                    color: m.metodo === 'contenido' ? '#1565c0' : '#616161',
                    border: `1px solid ${m.metodo === 'contenido' ? '#90caf9' : '#e0e0e0'}`
                  }}>{m.confianza}%</span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Botón */}
        <button type="submit" disabled={loading || !file} style={{
          marginTop: '14px', width: '100%', padding: '10px',
          background: loading || !file ? '#f1f3f4' : '#1a73e8',
          color: loading || !file ? '#9aa0a6' : '#ffffff',
          border: 'none', borderRadius: '6px',
          fontSize: '14px', fontWeight: 700,
          fontFamily: 'Roboto, sans-serif',
          letterSpacing: '0.25px',
          cursor: loading || !file ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '8px', transition: 'background 0.18s'
        }}
        onMouseEnter={e => { if (!loading && file) e.currentTarget.style.background = '#1557b0'; }}
        onMouseLeave={e => { if (!loading && file) e.currentTarget.style.background = '#1a73e8'; }}
        >
          {loading ? <><Spinner /> Procesando…</> : 'Procesar cartera'}
        </button>
      </form>
    </div>
  );
}

function Spinner({ blue }) {
  return (
    <span style={{
      display: 'inline-block', width: '14px', height: '14px',
      border: blue ? '2px solid #dbeafe' : '2px solid rgba(255,255,255,0.3)',
      borderTop: blue ? '2px solid #1a73e8' : '2px solid white',
      borderRadius: '50%', animation: 'spin 0.8s linear infinite'
    }} />
  );
}
