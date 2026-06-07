import React, { useEffect } from 'react';
import { useAPI } from '../hooks/useAPI';

const fmtMXN = (v) =>
  v != null && !isNaN(v)
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v)
    : '—';

const fmtPct = (v) =>
  v != null && !isNaN(v)
    ? `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}%`
    : '—';

function Field({ label, value, mono, color, wide }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ gridColumn: wide ? '1 / -1' : undefined }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: '#9e9e9e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '13px', fontWeight: 700,
        color: color || '#212121',
        fontFamily: mono ? 'Roboto Mono, monospace' : undefined,
        wordBreak: 'break-word', lineHeight: 1.4
      }}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  const hasContent = React.Children.toArray(children).some(c => c !== null && c !== false);
  if (!hasContent) return null;
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        fontSize: '11px', fontWeight: 800, color: '#1565c0',
        textTransform: 'uppercase', letterSpacing: '0.6px',
        borderBottom: '2px solid #e3f2fd', paddingBottom: '4px', marginBottom: '12px'
      }}>
        {title}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
        {children}
      </div>
    </div>
  );
}

function StatusChip({ text }) {
  if (!text) return <span style={{ color: '#bdbdbd' }}>—</span>;
  const lower = text.toLowerCase();
  let color = '#424242', bg = '#f5f5f5', border = '#e0e0e0';
  if (lower.includes('remate') || lower.includes('embargo') || lower.includes('ejecuci'))
    { color = '#e65100'; bg = '#fff3e0'; border = '#ffcc80'; }
  else if (lower.includes('favorable') || lower.includes('sentencia') || lower.includes('adjudic'))
    { color = '#1b5e20'; bg = '#e8f5e9'; border = '#a5d6a7'; }
  else if (lower.includes('amparo') || lower.includes('suspen') || lower.includes('demanda'))
    { color = '#b71c1c'; bg = '#ffebee'; border = '#ef9a9a'; }
  else if (lower.includes('proceso') || lower.includes('curso') || lower.includes('audiencia'))
    { color = '#0d47a1'; bg = '#e3f2fd'; border = '#90caf9'; }
  else if (lower.includes('convenio') || lower.includes('dacion') || lower.includes('dación'))
    { color = '#4a148c'; bg = '#f3e5f5'; border = '#ce93d8'; }
  else if (lower.includes('posesion') || lower.includes('posesión') || lower.includes('venta'))
    { color = '#004d40'; bg = '#e0f2f1'; border = '#80cbc4'; }
  return (
    <span style={{
      display: 'inline-block', padding: '4px 12px',
      borderRadius: '20px', fontSize: '12px', fontWeight: 700,
      color, background: bg, border: `1px solid ${border}`
    }}>{text}</span>
  );
}

export default function ExpedienteModal({ expediente, onClose }) {
  const { toggleFavorito } = useAPI();

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!expediente) return null;
  const e = expediente;

  const rentColor = e.rentabilidad != null
    ? (Number(e.rentabilidad) >= 0 ? '#1b5e20' : '#b71c1c')
    : undefined;

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(13,42,107,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px'
      }}
    >
      {/* Panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff', borderRadius: '16px',
          width: '100%', maxWidth: '560px', maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(13,42,107,0.25)',
          animation: 'modalIn 0.18s ease'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #e3eeff',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: '#ffffff', zIndex: 1,
          borderRadius: '16px 16px 0 0'
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9e9e9e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              Expediente
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0d2a6b', fontFamily: 'Roboto Mono, monospace', lineHeight: 1.1 }}>
              {e.numero_expediente || '—'}
            </div>
            {e.folio_banco && (
              <div style={{ fontSize: '12px', color: '#757575', fontWeight: 600, marginTop: '4px' }}>
                Folio banco: {e.folio_banco}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={() => toggleFavorito(e.id)}
              title={e.favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                border: `1.5px solid ${e.favorito ? '#f59e0b' : '#e0e0e0'}`,
                background: e.favorito ? '#fffbeb' : '#f5f5f5',
                fontSize: '16px', cursor: 'pointer',
                color: e.favorito ? '#f59e0b' : '#bdbdbd',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >{e.favorito ? '★' : '☆'}</button>
            <button onClick={onClose} style={{
              width: '32px', height: '32px', borderRadius: '50%',
              border: '1.5px solid #e0e0e0', background: '#f5f5f5',
              fontSize: '16px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: '#424242', fontWeight: 700
            }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>

          {/* Status badges */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {e.status_juridico && <StatusChip text={e.status_juridico} />}
            {e.status_pjv      && <StatusChip text={e.status_pjv} />}
          </div>

          <Section title="Identificación">
            <Field label="Banco"          value={e.banco} />
            <Field label="Tipo cartera"   value={e.tipo_cartera} />
            <Field label="Archivo fuente" value={e.nombre_archivo} wide />
          </Section>

          <Section title="Ubicación">
            <Field label="Estado"    value={e.estado_geo} color="#1565c0" />
            <Field label="Municipio" value={e.municipio} />
            <Field label="Dirección" value={e.ubicacion} wide />
          </Section>

          <Section title="Valores financieros">
            <Field label="Monto adeudo"    value={fmtMXN(e.monto_adeudo)}    mono color="#b71c1c" />
            <Field label="Valor catastral" value={fmtMXN(e.valor_catastral)} mono />
            <Field label="Valor estimado"  value={fmtMXN(e.valor_estimado)}  mono color="#1b5e20" />
            <Field label="Rentabilidad"    value={fmtPct(e.rentabilidad)}     mono color={rentColor} />
          </Section>

          <Section title="Legal">
            <Field label="Status jurídico" value={e.status_juridico} wide />
            <Field label="Status PJV"      value={e.status_pjv} />
            <Field label="Fecha inicio"    value={e.fecha_inicio} />
            <Field label="Antigüedad"      value={e.antiguedad_inmueble ? `${e.antiguedad_inmueble} años` : null} />
            <Field label="Contacto"        value={e.contacto} wide />
          </Section>

          {e.notas && (
            <Section title="Notas">
              <Field label="Notas" value={e.notas} wide />
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
