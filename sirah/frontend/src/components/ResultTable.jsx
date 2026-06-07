import React, { useState, useMemo, useEffect } from 'react';
import useAppStore from '../store/appStore';
import { useAPI } from '../hooks/useAPI';

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
  const { exportarCSV }  = useAPI();
  const isMobile = useMobile();

  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(20);
  const [sortField, setSortField] = useState('estado_geo');
  const [sortDir, setSortDir]     = useState('asc');
  const [search, setSearch]       = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');

  const estados = useMemo(
    () => [...new Set(expedientes.map(e => e.estado_geo).filter(Boolean))].sort(),
    [expedientes]
  );

  const filtered = useMemo(() => {
    let d = [...expedientes];
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(e =>
        [e.numero_expediente, e.folio_banco, e.banco, e.estado_geo, e.municipio,
         e.ubicacion, e.contacto, e.status_juridico, e.nombre_archivo]
          .some(v => v?.toLowerCase().includes(q))
      );
    }
    if (estadoFilter) d = d.filter(e => e.estado_geo === estadoFilter);
    d.sort((a, b) => {
      let va = a[sortField] ?? '', vb = b[sortField] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir==='asc' ? -1 : 1;
      if (va > vb) return sortDir==='asc' ?  1 : -1;
      return 0;
    });
    return d;
  }, [expedientes, search, estadoFilter, sortField, sortDir]);

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

          <select value={estadoFilter} onChange={e => { setEstadoFilter(e.target.value); setPage(1); }}
            style={{
              padding: '7px 10px', borderRadius: '6px',
              border: '1.5px solid #bdbdbd', background: '#ffffff',
              color: '#212121', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              maxWidth: isMobile ? '140px' : '180px'
            }}>
            <option value="">Todos los estados</option>
            {estados.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <Th field="numero_expediente" {...{sortField,sortDir,onSort:sort}}>Exp.</Th>
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
              <tr><td colSpan={13} style={{...td, textAlign:'center', color:'#9e9e9e', padding:'40px', fontWeight:700}}>
                Sin resultados para esta búsqueda
              </td></tr>
            ) : rows.map((e, i) => (
              <tr key={e.id||e.numero_expediente||i}
                style={{ background: i%2===0 ? '#ffffff' : '#fafafa', transition: 'background 0.1s' }}
                onMouseEnter={ev => ev.currentTarget.style.background = '#e3f2fd'}
                onMouseLeave={ev => ev.currentTarget.style.background = i%2===0 ? '#ffffff' : '#fafafa'}
              >
                {/* Expediente */}
                <td style={tdMono}>
                  <code style={{ color: '#1565c0', fontWeight: 800, fontSize: '12px' }}>
                    {e.numero_expediente||'—'}
                  </code>
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
    </div>
  );
}
