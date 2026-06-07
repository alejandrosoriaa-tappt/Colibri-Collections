import React, { useState, useMemo, useEffect } from 'react';
import useAppStore from '../store/appStore';
import { useAPI } from '../hooks/useAPI';
import ExpedienteModal from './ExpedienteModal.jsx';
import { calcScore, scoreMeta } from '../utils/sirahScore.js';

const PAGE_OPTIONS = [10, 20, 50];

function useMobile() {
  const [m, setM] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setM(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return m;
}

function InfoPopover() {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        title="¿Qué es la Ponderación IA?"
        style={{
          width: '15px', height: '15px', borderRadius: '50%',
          border: '1.5px solid #1565c0', background: '#e3f2fd',
          color: '#1565c0', fontSize: '9px', fontWeight: 900,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
          justifyContent: 'center', lineHeight: 1, marginLeft: '4px',
          flexShrink: 0, padding: 0
        }}
      >i</button>
      {open && (
        <div style={{
          position: 'absolute', top: '120%', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, width: '240px',
          background: '#0d2a6b', color: '#ffffff',
          borderRadius: '10px', padding: '14px 16px',
          boxShadow: '0 8px 32px rgba(13,42,107,0.35)',
          fontSize: '12px', lineHeight: 1.55, fontWeight: 500,
          pointerEvents: 'none'
        }}>
          {/* arrow */}
          <div style={{
            position: 'absolute', top: '-6px', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderBottom: '6px solid #0d2a6b'
          }} />
          <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '6px', color: '#90caf9' }}>
            Ponderación IA
          </div>
          La calificación (0–100) es resultado de un análisis de inteligencia artificial que evalúa cada oportunidad según su rentabilidad estimada, situación jurídica y disponibilidad de PJV.
          <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[['≥80','Excelente','#a5d6a7'],['≥60','Alta','#c5e1a5'],['≥40','Media','#ffcc80'],['<40','Baja','#bdbdbd']].map(([r,l,c]) => (
              <span key={l} style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: c, color: '#212121' }}>
                {r} {l}
              </span>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}

function ScoreBadge({ score }) {
  const { label, color, bar } = scoreMeta(score);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', minWidth: '70px' }}>
      <div style={{ fontSize: '17px', fontWeight: 800, color, fontFamily: 'Roboto Mono, monospace', lineHeight: 1 }}>
        {score}
      </div>
      <div style={{ width: '54px', height: '5px', borderRadius: '3px', background: '#e0e0e0', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: bar, borderRadius: '3px', transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: '9px', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {label}
      </div>
    </div>
  );
}

const fmtMXN = (v) =>
  v !== null && v !== undefined && !isNaN(v)
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v)
    : '—';

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
    <span title={text} style={{
      display: 'inline-block', padding: '3px 10px',
      borderRadius: '20px', fontSize: '11px', fontWeight: 700,
      color, background: bg, border: `1px solid ${border}`,
      maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
    }}>
      {text}
    </span>
  );
}

function Th({ children, field, sortField, sortDir, onSort, align = 'left' }) {
  const active = sortField === field;
  return (
    <th onClick={() => onSort(field)} style={{
      padding: '10px 14px', textAlign: align,
      fontSize: '11px', fontWeight: 800,
      color: active ? '#1565c0' : '#424242',
      textTransform: 'uppercase', letterSpacing: '0.7px',
      cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
      borderBottom: `2px solid ${active ? '#1565c0' : '#bdbdbd'}`,
      background: '#f5f5f5',
    }}>
      {children} <span style={{ opacity: active ? 1 : 0.5 }}>{active ? (sortDir==='asc'?'↑':'↓') : '⇅'}</span>
    </th>
  );
}

export default function ResultTable() {
  const { expedientes } = useAppStore();
  const { exportarCSV, toggleFavorito } = useAPI();
  const isMobile = useMobile();

  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(20);
  const [sortField, setSortField]     = useState('estado_geo');
  const [sortDir, setSortDir]         = useState('asc');
  const [search, setSearch]           = useState('');
  const [estadoFilter, setEstadoFilter]     = useState('');
  const [municipioFilter, setMunicipioFilter] = useState('');
  const [soloFavoritos, setSoloFavoritos]   = useState(false);
  const [selected, setSelected]             = useState(null);

  const estados = useMemo(
    () => [...new Set(expedientes.map(e => e.estado_geo).filter(Boolean))].sort(),
    [expedientes]
  );

  const municipios = useMemo(() => {
    const base = estadoFilter ? expedientes.filter(e => e.estado_geo === estadoFilter) : expedientes;
    return [...new Set(base.map(e => e.municipio).filter(Boolean))].sort();
  }, [expedientes, estadoFilter]);

  const filtered = useMemo(() => {
    let d = [...expedientes];
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(e =>
        [e.clave_sirah, e.numero_expediente, e.folio_banco, e.banco, e.estado_geo, e.municipio,
         e.ubicacion, e.contacto, e.status_juridico, e.nombre_archivo]
          .some(v => v?.toLowerCase().includes(q))
      );
    }
    if (estadoFilter)    d = d.filter(e => e.estado_geo === estadoFilter);
    if (municipioFilter) d = d.filter(e => e.municipio  === municipioFilter);
    if (soloFavoritos)   d = d.filter(e => e.favorito);
    d.sort((a, b) => {
      let va = a[sortField] ?? '', vb = b[sortField] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir==='asc' ? -1 : 1;
      if (va > vb) return sortDir==='asc' ?  1 : -1;
      return 0;
    });
    return d;
  }, [expedientes, search, estadoFilter, soloFavoritos, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const rows = filtered.slice((page-1)*pageSize, page*pageSize);

  function sort(field) {
    setSortDir(d => sortField===field ? (d==='asc'?'desc':'asc') : 'asc');
    setSortField(field); setPage(1);
  }

  const td = {
    padding: '11px 14px', fontSize: '13px', fontWeight: 600,
    borderBottom: '1px solid #e0e0e0', verticalAlign: 'middle', color: '#212121'
  };
  const tdMono = { ...td, fontFamily: 'Roboto Mono, monospace', fontSize: '12px' };

  if (!expedientes.length) return (
    <div style={{
      background: '#ffffff', border: '1px solid #e0e0e0',
      borderRadius: '12px', padding: '64px 20px', textAlign: 'center'
    }}>
      <div style={{ fontSize: '48px', opacity: 0.1, marginBottom: '16px' }}>≡</div>
      <div style={{ fontSize: '15px', color: '#757575', fontWeight: 700 }}>
        Sin expedientes · Sube un archivo para comenzar
      </div>
    </div>
  );

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e0e0e0', borderRadius: '12px', overflow: 'hidden' }}>

      {/* Toolbar */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #e0e0e0', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {/* Row 1: count + page size + export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#212121', fontWeight: 800, flex: 1, whiteSpace: 'nowrap' }}>
            {filtered.length.toLocaleString()} de {expedientes.length.toLocaleString()} expedientes
          </span>

          <button
            onClick={() => { setSoloFavoritos(v => !v); setPage(1); }}
            title={soloFavoritos ? 'Ver todos' : 'Solo favoritos'}
            style={{
              padding: '7px 12px', borderRadius: '6px', cursor: 'pointer',
              border: soloFavoritos ? '1.5px solid #f59e0b' : '1.5px solid #e0e0e0',
              background: soloFavoritos ? '#fffbeb' : '#ffffff',
              color: soloFavoritos ? '#b45309' : '#9e9e9e',
              fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap',
              transition: 'all 0.15s'
            }}
          >
            {soloFavoritos ? '★ Favoritos' : '☆ Favoritos'}
          </button>

          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            style={{
              padding: '7px 10px', borderRadius: '6px',
              border: '1.5px solid #bdbdbd', background: '#ffffff',
              color: '#212121', fontSize: '13px', fontWeight: 700, cursor: 'pointer'
            }}>
            {PAGE_OPTIONS.map(n => <option key={n} value={n}>{n} / pág.</option>)}
          </select>

          <button onClick={() => exportarCSV(filtered)} style={{
            padding: '7px 14px', background: '#1565c0',
            color: '#ffffff', border: 'none',
            borderRadius: '6px', fontSize: '13px', fontWeight: 700,
            cursor: 'pointer', whiteSpace: 'nowrap'
          }}>
            ↓ CSV
          </button>
        </div>

        {/* Row 2: search + estado filter */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="🔍 Buscar por estado, municipio, folio…"
            style={{
              flex: 1, minWidth: '160px',
              padding: '7px 14px', borderRadius: '24px',
              border: '1.5px solid #bdbdbd', background: '#ffffff',
              color: '#212121', fontSize: '13px', fontWeight: 600,
              outline: 'none'
            }}
            onFocus={e => e.target.style.border = '1.5px solid #1565c0'}
            onBlur={e  => e.target.style.border = '1.5px solid #bdbdbd'}
          />

          <select
            value={estadoFilter}
            onChange={e => { setEstadoFilter(e.target.value); setMunicipioFilter(''); setPage(1); }}
            style={{
              padding: '7px 10px', borderRadius: '6px',
              border: '1.5px solid #bdbdbd', background: '#ffffff',
              color: '#212121', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              maxWidth: isMobile ? '130px' : '170px'
            }}>
            <option value="">Todos los estados</option>
            {estados.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <select
            value={municipioFilter}
            onChange={e => { setMunicipioFilter(e.target.value); setPage(1); }}
            style={{
              padding: '7px 10px', borderRadius: '6px',
              border: '1.5px solid #bdbdbd', background: '#ffffff',
              color: municipioFilter ? '#212121' : '#9e9e9e',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              maxWidth: isMobile ? '130px' : '170px'
            }}>
            <option value="">Todos los municipios</option>
            {municipios.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '10px 8px', background: '#f5f5f5', borderBottom: '2px solid #bdbdbd', width: '36px' }} />
              <th style={{ padding: '10px 12px', background: '#f5f5f5', borderBottom: '2px solid #1565c0', textAlign: 'center', fontSize: '11px', fontWeight: 800, color: '#1565c0', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                Pond. IA<InfoPopover />
              </th>
              <Th field="clave_sirah"       {...{sortField,sortDir,onSort:sort}}>Clave SIRAH</Th>
              <Th field="numero_expediente" {...{sortField,sortDir,onSort:sort}}>Expediente</Th>
              <Th field="folio_banco"       {...{sortField,sortDir,onSort:sort}}>Folio</Th>
              <Th field="banco"             {...{sortField,sortDir,onSort:sort}}>Banco</Th>
              <Th field="estado_geo"        {...{sortField,sortDir,onSort:sort}}>Estado</Th>
              <Th field="municipio"         {...{sortField,sortDir,onSort:sort}}>Municipio</Th>
              <Th field="ubicacion"         {...{sortField,sortDir,onSort:sort}}>Ubicación</Th>
              <Th field="monto_adeudo"      {...{sortField,sortDir,onSort:sort}} align="right">Adeudo</Th>
              <Th field="valor_estimado"    {...{sortField,sortDir,onSort:sort}} align="right">Valor Est.</Th>
              <Th field="rentabilidad"      {...{sortField,sortDir,onSort:sort}} align="right">Rent.%</Th>
              <Th field="status_juridico"   {...{sortField,sortDir,onSort:sort}}>Status</Th>
              <Th field="status_pjv"        {...{sortField,sortDir,onSort:sort}}>PJV</Th>
              <Th field="nombre_archivo"    {...{sortField,sortDir,onSort:sort}}>Archivo</Th>
              <Th field="tipo_cartera"      {...{sortField,sortDir,onSort:sort}}>Pestaña</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={16} style={{...td, textAlign:'center', color:'#9e9e9e', padding:'40px', fontWeight:700}}>
                Sin resultados para esta búsqueda
              </td></tr>
            ) : rows.map((e, i) => (
              <tr key={e.id||e.numero_expediente||i}
                style={{ background: i%2===0 ? '#ffffff' : '#fafafa', transition: 'background 0.1s', cursor: 'pointer' }}
                onMouseEnter={ev => ev.currentTarget.style.background = '#e3f2fd'}
                onMouseLeave={ev => ev.currentTarget.style.background = i%2===0 ? '#ffffff' : '#fafafa'}
                onClick={() => setSelected(e)}
              >
                {/* Favorito star */}
                <td style={{ padding: '0 8px', textAlign: 'center', borderBottom: '1px solid #e0e0e0' }}
                  onClick={ev => { ev.stopPropagation(); toggleFavorito(e.id); }}
                >
                  <span style={{
                    fontSize: '16px', cursor: 'pointer', lineHeight: 1,
                    color: e.favorito ? '#f59e0b' : '#e0e0e0',
                    transition: 'color 0.15s'
                  }}
                    title={e.favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  >
                    {e.favorito ? '★' : '☆'}
                  </span>
                </td>

                {/* Ponderación IA */}
                <td style={{ padding: '8px 12px', borderBottom: '1px solid #e0e0e0', textAlign: 'center' }}>
                  <ScoreBadge score={calcScore(e)} />
                </td>

                {/* Clave SIRAH */}
                <td style={tdMono}>
                  <code style={{
                    color: '#1565c0', fontWeight: 800, fontSize: '12px',
                    letterSpacing: '0.3px'
                  }}>
                    {e.clave_sirah || '—'}
                  </code>
                </td>

                {/* Expediente interno */}
                <td style={tdMono}>
                  <span style={{ color: '#424242', fontSize: '12px', fontWeight: 600 }}>
                    {e.numero_expediente || '—'}
                  </span>
                </td>

                {/* Folio banco */}
                <td style={tdMono}>
                  <span style={{ color: '#616161', fontSize: '11px' }}>{e.folio_banco||'—'}</span>
                </td>

                {/* Banco */}
                <td style={td}>
                  {e.banco
                    ? <span style={{ fontSize:'12px', fontWeight:800, color:'#212121', background:'#eeeeee', padding:'3px 10px', borderRadius:'12px' }}>{e.banco}</span>
                    : <span style={{color:'#bdbdbd'}}>—</span>}
                </td>

                {/* Estado */}
                <td style={{...td, fontWeight:800, color:'#1565c0', fontSize:'12px'}}>
                  {e.estado_geo||<span style={{color:'#bdbdbd'}}>—</span>}
                </td>

                {/* Municipio */}
                <td style={{...td, fontSize:'12px', color:'#424242'}}>
                  {e.municipio||<span style={{color:'#bdbdbd'}}>—</span>}
                </td>

                {/* Ubicación */}
                <td style={{...td, maxWidth:'200px'}}>
                  <span title={e.ubicacion} style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:'12px', color:'#212121' }}>
                    {e.ubicacion||'—'}
                  </span>
                </td>

                {/* Adeudo */}
                <td style={{...tdMono, textAlign:'right', color:'#b71c1c', fontWeight:700}}>
                  {fmtMXN(e.monto_adeudo)}
                </td>

                {/* Valor estimado */}
                <td style={{...tdMono, textAlign:'right', color:'#1b5e20', fontWeight:800, fontSize:'13px'}}>
                  {fmtMXN(e.valor_estimado)}
                </td>

                {/* Rentabilidad */}
                <td style={{...tdMono, textAlign:'right'}}>
                  {e.rentabilidad !== null && e.rentabilidad !== undefined
                    ? <span style={{
                        fontWeight: 800, fontSize:'13px',
                        color: e.rentabilidad>=0 ? '#1b5e20' : '#b71c1c'
                      }}>
                        {e.rentabilidad>=0?'+':''}{Number(e.rentabilidad).toFixed(1)}%
                      </span>
                    : '—'}
                </td>

                {/* Status */}
                <td style={td}><StatusChip text={e.status_juridico} /></td>

                {/* PJV */}
                <td style={td}><StatusChip text={e.status_pjv} /></td>

                {/* Archivo */}
                <td style={{...td, maxWidth:'120px'}}>
                  <span title={e.nombre_archivo} style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#757575', fontSize:'11px', fontWeight:600 }}>
                    {e.nombre_archivo ? e.nombre_archivo.replace(/\.[^/.]+$/, '') : '—'}
                  </span>
                </td>

                {/* Pestaña */}
                <td style={td}>
                  {e.tipo_cartera
                    ? <span style={{ fontSize:'11px', fontWeight:800, color:'#1565c0', background:'#e3f2fd', padding:'2px 8px', borderRadius:'12px' }}>
                        {e.tipo_cartera}
                      </span>
                    : <span style={{color:'#bdbdbd'}}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          padding: '12px 16px', borderTop: '1px solid #e0e0e0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#fafafa'
        }}>
          <span style={{ fontSize: '13px', color: '#424242', fontWeight: 700 }}>
            {(page-1)*pageSize+1}–{Math.min(page*pageSize, filtered.length)} de {filtered.length.toLocaleString()}
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { label: '←', onClick: () => setPage(p=>Math.max(1,p-1)), disabled: page===1 },
              ...Array.from({length: Math.min(totalPages,5)}, (_,i) => {
                const p = Math.max(1, Math.min(totalPages-4, page-2)) + i;
                return { label: p, onClick: () => setPage(p), active: p===page };
              }),
              { label: '→', onClick: () => setPage(p=>Math.min(totalPages,p+1)), disabled: page===totalPages }
            ].map((btn, i) => (
              <button key={i} onClick={btn.onClick} disabled={btn.disabled} style={{
                width: '34px', height: '34px', borderRadius: '50%',
                border: btn.active ? '2px solid #1565c0' : 'none',
                background: btn.active ? '#1565c0' : 'transparent',
                color: btn.disabled ? '#bdbdbd' : btn.active ? '#ffffff' : '#424242',
                fontSize: '13px', fontWeight: btn.active ? 800 : 700,
                cursor: btn.disabled ? 'not-allowed' : 'pointer',
              }}>{btn.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Expediente detail modal */}
      {selected && (
        <ExpedienteModal expediente={selected} onClose={() => setSelected(null)} />
      )}

      <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
    </div>
  );
}
