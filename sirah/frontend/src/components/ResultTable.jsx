import React, { useState, useMemo } from 'react';
import useAppStore from '../store/appStore';
import { useAPI } from '../hooks/useAPI';

const PAGE = 10;

const fmtMXN = (v) =>
  v !== null && v !== undefined && !isNaN(v)
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v)
    : '—';

function Chip({ text }) {
  if (!text) return <span style={{ color: '#424242', fontSize: '12px' }}>—</span>;
  const lower = text.toLowerCase();
  let color = '#757575', bg = 'rgba(255,255,255,0.04)';

  if (lower.includes('remate') || lower.includes('embargo') || lower.includes('ejecuci'))
    { color = '#ffa726'; bg = 'rgba(255,167,38,0.08)'; }
  else if (lower.includes('favorable') || lower.includes('sentencia'))
    { color = '#66bb6a'; bg = 'rgba(102,187,106,0.08)'; }
  else if (lower.includes('amparo') || lower.includes('suspen'))
    { color = '#ef5350'; bg = 'rgba(239,83,80,0.08)'; }
  else if (lower.includes('proceso') || lower.includes('curso'))
    { color = '#42a5f5'; bg = 'rgba(66,165,245,0.08)'; }
  else if (lower.includes('convenio'))
    { color = '#ab47bc'; bg = 'rgba(171,71,188,0.08)'; }

  return (
    <span title={text} style={{
      display: 'inline-block', padding: '2px 8px',
      borderRadius: '4px', fontSize: '11px', fontWeight: 500,
      color, background: bg,
      maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
    }}>
      {text}
    </span>
  );
}

function Th({ children, field, sortField, sortDir, onSort, align = 'left' }) {
  const active = sortField === field;
  return (
    <th onClick={() => onSort(field)} style={{
      padding: '12px 16px', textAlign: align, fontSize: '11px', fontWeight: 500,
      color: active ? '#e0e0e0' : '#424242',
      textTransform: 'uppercase', letterSpacing: '0.6px',
      cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
      borderBottom: `1px solid ${active ? '#424242' : '#2e2e2e'}`,
      background: '#121212'
    }}>
      {children} <span style={{ opacity: active ? 1 : 0.3 }}>{active ? (sortDir==='asc'?'↑':'↓') : '⇅'}</span>
    </th>
  );
}

export default function ResultTable() {
  const { expedientes } = useAppStore();
  const { exportarCSV }  = useAPI();

  const [page, setPage]         = useState(1);
  const [sortField, setSortField] = useState('numero_expediente');
  const [sortDir, setSortDir]   = useState('asc');
  const [search, setSearch]     = useState('');
  const [banco, setBanco]       = useState('');

  const bancos = useMemo(
    () => [...new Set(expedientes.map(e => e.banco).filter(Boolean))].sort(),
    [expedientes]
  );

  const filtered = useMemo(() => {
    let d = [...expedientes];
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(e => [e.numero_expediente, e.banco, e.ubicacion, e.contacto, e.status_juridico]
        .some(v => v?.toLowerCase().includes(q)));
    }
    if (banco) d = d.filter(e => e.banco === banco);
    d.sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir==='asc' ? -1 : 1;
      if (va > vb) return sortDir==='asc' ?  1 : -1;
      return 0;
    });
    return d;
  }, [expedientes, search, banco, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE);
  const rows = filtered.slice((page-1)*PAGE, page*PAGE);

  function sort(field) {
    setSortDir(d => sortField===field ? (d==='asc'?'desc':'asc') : 'asc');
    setSortField(field); setPage(1);
  }

  const td = {
    padding: '12px 16px', fontSize: '13px',
    borderBottom: '1px solid #1e1e1e', verticalAlign: 'middle'
  };

  if (!expedientes.length) return (
    <div style={{
      background: '#1a1a1a', border: '1px solid #2e2e2e',
      borderRadius: '12px', padding: '64px 20px', textAlign: 'center'
    }}>
      <div style={{ fontSize: '40px', opacity: 0.15, marginBottom: '16px' }}>≡</div>
      <div style={{ fontSize: '14px', color: '#424242', fontWeight: 400 }}>
        Sin expedientes · Sube un CSV para comenzar
      </div>
    </div>
  );

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: '12px', overflow: 'hidden' }}>

      {/* Toolbar */}
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid #2e2e2e',
        display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
        background: '#121212'
      }}>
        <span style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#424242', flex: 1 }}>
          {filtered.length} / {expedientes.length} expedientes
        </span>

        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar…"
          style={{
            padding: '7px 12px', borderRadius: '6px',
            border: '1px solid #2e2e2e', background: '#1a1a1a',
            color: '#e0e0e0', fontSize: '13px', width: '200px', outline: 'none'
          }} />

        <select value={banco} onChange={e => { setBanco(e.target.value); setPage(1); }}
          style={{
            padding: '7px 12px', borderRadius: '6px',
            border: '1px solid #2e2e2e', background: '#1a1a1a',
            color: '#9e9e9e', fontSize: '13px', cursor: 'pointer'
          }}>
          <option value="">Todos los bancos</option>
          {bancos.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <button onClick={() => exportarCSV(filtered)} style={{
          padding: '7px 14px', background: 'transparent',
          color: '#9e9e9e', border: '1px solid #2e2e2e',
          borderRadius: '6px', fontSize: '12px', fontWeight: 500,
          cursor: 'pointer', letterSpacing: '0.3px', transition: 'all 0.18s'
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#9e9e9e'; e.currentTarget.style.color = '#e0e0e0'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#2e2e2e'; e.currentTarget.style.color = '#9e9e9e'; }}
        >
          Exportar CSV
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <Th field="numero_expediente" {...{sortField,sortDir,onSort:sort}}>Expediente</Th>
              <Th field="banco"             {...{sortField,sortDir,onSort:sort}}>Banco</Th>
              <Th field="ubicacion"         {...{sortField,sortDir,onSort:sort}}>Ubicación</Th>
              <Th field="monto_adeudo"      {...{sortField,sortDir,onSort:sort}} align="right">Adeudo</Th>
              <Th field="valor_estimado"    {...{sortField,sortDir,onSort:sort}} align="right">Valor Est.</Th>
              <Th field="rentabilidad"      {...{sortField,sortDir,onSort:sort}} align="right">Rent.%</Th>
              <Th field="status_juridico"   {...{sortField,sortDir,onSort:sort}}>Status</Th>
              <Th field="status_pjv"        {...{sortField,sortDir,onSort:sort}}>PJV</Th>
              <Th field="contacto"          {...{sortField,sortDir,onSort:sort}}>Contacto</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={9} style={{...td, textAlign:'center', color:'#424242', padding:'40px'}}>
                Sin resultados
              </td></tr>
            ) : rows.map((e, i) => (
              <tr key={e.id||e.numero_expediente||i}
                style={{ background: 'transparent', transition: 'background 0.1s' }}
                onMouseEnter={ev => ev.currentTarget.style.background = '#212121'}
                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
              >
                <td style={td}>
                  <code style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '12px', color: '#9e9e9e' }}>
                    {e.numero_expediente||'—'}
                  </code>
                </td>
                <td style={td}>
                  {e.banco
                    ? <span style={{ fontSize:'12px', color:'#757575', background:'#212121', padding:'2px 8px', borderRadius:'4px' }}>{e.banco}</span>
                    : <span style={{color:'#424242'}}>—</span>}
                </td>
                <td style={{...td, maxWidth:'160px'}}>
                  <span title={e.ubicacion} style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#757575', fontSize:'12px' }}>
                    {e.ubicacion||'—'}
                  </span>
                </td>
                <td style={{...td, textAlign:'right', fontFamily:'Roboto Mono, monospace', fontSize:'12px', color:'#616161'}}>
                  {fmtMXN(e.monto_adeudo)}
                </td>
                <td style={{...td, textAlign:'right', fontFamily:'Roboto Mono, monospace', fontSize:'12px', fontWeight:500, color:'#e0e0e0'}}>
                  {fmtMXN(e.valor_estimado)}
                </td>
                <td style={{...td, textAlign:'right'}}>
                  {e.rentabilidad !== null && e.rentabilidad !== undefined
                    ? <span style={{ fontFamily:'Roboto Mono, monospace', fontSize:'12px', fontWeight:500,
                        color: e.rentabilidad>=0 ? '#66bb6a' : '#ef5350' }}>
                        {e.rentabilidad>=0?'+':''}{Number(e.rentabilidad).toFixed(1)}%
                      </span>
                    : '—'}
                </td>
                <td style={td}><Chip text={e.status_juridico} /></td>
                <td style={td}><Chip text={e.status_pjv} /></td>
                <td style={{...td, maxWidth:'150px'}}>
                  <span title={e.contacto} style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#424242', fontSize:'11px' }}>
                    {e.contacto||'—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          padding: '12px 16px', borderTop: '1px solid #1e1e1e',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#121212'
        }}>
          <span style={{ fontSize: '12px', color: '#424242' }}>
            {(page-1)*PAGE+1}–{Math.min(page*PAGE, filtered.length)} de {filtered.length}
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { label: '←', onClick: () => setPage(p=>Math.max(1,p-1)), disabled: page===1 },
              ...Array.from({length: Math.min(totalPages, 5)}, (_, i) => {
                const p = Math.max(1, Math.min(totalPages-4, page-2)) + i;
                return { label: p, onClick: () => setPage(p), active: p===page };
              }),
              { label: '→', onClick: () => setPage(p=>Math.min(totalPages,p+1)), disabled: page===totalPages }
            ].map((btn, i) => (
              <button key={i} onClick={btn.onClick} disabled={btn.disabled} style={{
                width: '30px', height: '30px', borderRadius: '4px',
                border: `1px solid ${btn.active ? '#616161' : '#2e2e2e'}`,
                background: btn.active ? '#2a2a2a' : 'transparent',
                color: btn.disabled ? '#2e2e2e' : btn.active ? '#e0e0e0' : '#616161',
                fontSize: '12px', cursor: btn.disabled ? 'not-allowed' : 'pointer'
              }}>{btn.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
