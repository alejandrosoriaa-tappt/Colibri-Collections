import React, { useState, useMemo } from 'react';
import useAppStore from '../store/appStore';
import { useAPI } from '../hooks/useAPI';

const PAGE = 10;

const fmtMXN = (v) =>
  v !== null && v !== undefined && !isNaN(v)
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v)
    : '—';

function Chip({ text }) {
  if (!text) return <span style={{ color: '#dadce0', fontSize: '12px' }}>—</span>;
  const lower = text.toLowerCase();
  let color = '#9aa0a6', bg = '#f1f3f4';

  if (lower.includes('remate') || lower.includes('embargo') || lower.includes('ejecuci'))
    { color = '#e37400'; bg = '#fef7e0'; }
  else if (lower.includes('favorable') || lower.includes('sentencia'))
    { color = '#137333'; bg = '#e6f4ea'; }
  else if (lower.includes('amparo') || lower.includes('suspen'))
    { color = '#c5221f'; bg = '#fce8e6'; }
  else if (lower.includes('proceso') || lower.includes('curso'))
    { color = '#1557b0'; bg = '#e8f0fe'; }
  else if (lower.includes('convenio'))
    { color = '#7b1fa2'; bg = '#f3e8fd'; }

  return (
    <span title={text} style={{
      display: 'inline-block', padding: '2px 8px',
      borderRadius: '12px', fontSize: '11px', fontWeight: 500,
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
      padding: '12px 16px', textAlign: align,
      fontSize: '11px', fontWeight: 500,
      color: active ? '#1a73e8' : '#5f6368',
      textTransform: 'uppercase', letterSpacing: '0.6px',
      cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
      borderBottom: `2px solid ${active ? '#1a73e8' : '#e8eaed'}`,
      background: '#f8f9fa'
    }}>
      {children} <span style={{ opacity: active ? 1 : 0.4 }}>{active ? (sortDir==='asc'?'↑':'↓') : '⇅'}</span>
    </th>
  );
}

export default function ResultTable() {
  const { expedientes } = useAppStore();
  const { exportarCSV }  = useAPI();

  const [page, setPage]           = useState(1);
  const [sortField, setSortField] = useState('numero_expediente');
  const [sortDir, setSortDir]     = useState('asc');
  const [search, setSearch]       = useState('');
  const [banco, setBanco]         = useState('');

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
    borderBottom: '1px solid #f1f3f4', verticalAlign: 'middle', color: '#3c4043'
  };

  if (!expedientes.length) return (
    <div style={{
      background: '#ffffff', border: '1px solid #e0e0e0',
      borderRadius: '12px', padding: '64px 20px', textAlign: 'center'
    }}>
      <div style={{ fontSize: '40px', opacity: 0.12, marginBottom: '16px' }}>≡</div>
      <div style={{ fontSize: '14px', color: '#9aa0a6', fontWeight: 400 }}>
        Sin expedientes · Sube un CSV para comenzar
      </div>
    </div>
  );

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e0e0e0', borderRadius: '12px', overflow: 'hidden' }}>

      {/* Toolbar */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid #e8eaed',
        display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
        background: '#ffffff'
      }}>
        <span style={{ fontSize: '13px', color: '#5f6368', flex: 1 }}>
          {filtered.length} de {expedientes.length} expedientes
        </span>

        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar…"
          style={{
            padding: '7px 12px', borderRadius: '24px',
            border: '1px solid #e8eaed', background: '#f1f3f4',
            color: '#202124', fontSize: '13px', width: '200px',
            outline: 'none', transition: 'border 0.18s'
          }}
          onFocus={e => e.target.style.border = '1px solid #1a73e8'}
          onBlur={e  => e.target.style.border = '1px solid #e8eaed'}
        />

        <select value={banco} onChange={e => { setBanco(e.target.value); setPage(1); }}
          style={{
            padding: '7px 12px', borderRadius: '6px',
            border: '1px solid #e8eaed', background: '#f1f3f4',
            color: '#5f6368', fontSize: '13px', cursor: 'pointer'
          }}>
          <option value="">Todos los bancos</option>
          {bancos.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <button onClick={() => exportarCSV(filtered)} style={{
          padding: '7px 16px', background: 'transparent',
          color: '#1a73e8', border: '1px solid #dadce0',
          borderRadius: '6px', fontSize: '13px', fontWeight: 500,
          cursor: 'pointer', transition: 'all 0.18s'
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#e8f0fe'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
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
              <tr><td colSpan={9} style={{...td, textAlign:'center', color:'#9aa0a6', padding:'40px'}}>
                Sin resultados
              </td></tr>
            ) : rows.map((e, i) => (
              <tr key={e.id||e.numero_expediente||i}
                style={{ background: 'transparent', transition: 'background 0.1s' }}
                onMouseEnter={ev => ev.currentTarget.style.background = '#f8f9fa'}
                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
              >
                <td style={td}>
                  <code style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '12px', color: '#1a73e8' }}>
                    {e.numero_expediente||'—'}
                  </code>
                </td>
                <td style={td}>
                  {e.banco
                    ? <span style={{ fontSize:'12px', color:'#5f6368', background:'#f1f3f4', padding:'2px 8px', borderRadius:'12px' }}>{e.banco}</span>
                    : <span style={{color:'#dadce0'}}>—</span>}
                </td>
                <td style={{...td, maxWidth:'160px'}}>
                  <span title={e.ubicacion} style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:'12px' }}>
                    {e.ubicacion||'—'}
                  </span>
                </td>
                <td style={{...td, textAlign:'right', fontFamily:'Roboto Mono, monospace', fontSize:'12px', color:'#9aa0a6'}}>
                  {fmtMXN(e.monto_adeudo)}
                </td>
                <td style={{...td, textAlign:'right', fontFamily:'Roboto Mono, monospace', fontSize:'12px', fontWeight:500, color:'#202124'}}>
                  {fmtMXN(e.valor_estimado)}
                </td>
                <td style={{...td, textAlign:'right'}}>
                  {e.rentabilidad !== null && e.rentabilidad !== undefined
                    ? <span style={{ fontFamily:'Roboto Mono, monospace', fontSize:'12px', fontWeight:500,
                        color: e.rentabilidad>=0 ? '#137333' : '#c5221f' }}>
                        {e.rentabilidad>=0?'+':''}{Number(e.rentabilidad).toFixed(1)}%
                      </span>
                    : '—'}
                </td>
                <td style={td}><Chip text={e.status_juridico} /></td>
                <td style={td}><Chip text={e.status_pjv} /></td>
                <td style={{...td, maxWidth:'150px'}}>
                  <span title={e.contacto} style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#9aa0a6', fontSize:'11px' }}>
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
          padding: '12px 16px', borderTop: '1px solid #e8eaed',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#fafafa'
        }}>
          <span style={{ fontSize: '12px', color: '#9aa0a6' }}>
            {(page-1)*PAGE+1}–{Math.min(page*PAGE, filtered.length)} de {filtered.length}
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
                width: '32px', height: '32px', borderRadius: '50%',
                border: 'none',
                background: btn.active ? '#e8f0fe' : 'transparent',
                color: btn.disabled ? '#dadce0' : btn.active ? '#1a73e8' : '#5f6368',
                fontSize: '13px', fontWeight: btn.active ? 500 : 400,
                cursor: btn.disabled ? 'not-allowed' : 'pointer',
                transition: 'background 0.18s'
              }}>{btn.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
