import React, { useState, useMemo } from 'react';
import useAppStore from '../store/appStore';
import { useAPI } from '../hooks/useAPI';

const PAGE = 10;

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtMXN = (v) =>
  v !== null && v !== undefined && !isNaN(v)
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v)
    : '—';

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ text }) {
  if (!text) return <span style={{ color: 'var(--gray-400)' }}>—</span>;

  const lower = text.toLowerCase();
  let color = 'var(--gray-600)', bg = 'var(--gray-100)';

  if (lower.includes('remate') || lower.includes('embargo') || lower.includes('ejecuci'))
    { color = '#b8612a'; bg = 'rgba(217,122,58,0.12)'; }
  else if (lower.includes('favorable') || lower.includes('sentencia') || lower.includes('ganado'))
    { color = 'var(--sirah-success-dark)'; bg = 'rgba(46,204,113,0.12)'; }
  else if (lower.includes('amparo') || lower.includes('suspen'))
    { color = 'var(--sirah-warning)'; bg = 'rgba(231,76,60,0.10)'; }
  else if (lower.includes('proceso') || lower.includes('curso') || lower.includes('tramite'))
    { color = 'var(--sirah-info)'; bg = 'rgba(52,152,219,0.12)'; }
  else if (lower.includes('convenio') || lower.includes('pago'))
    { color = '#8e44ad'; bg = 'rgba(142,68,173,0.10)'; }

  return (
    <span
      title={text}
      style={{
        display:       'inline-block',
        padding:       '2px 7px',
        borderRadius:  '4px',
        fontSize:      '11px',
        fontWeight:    600,
        color, bg,
        background:    bg,
        maxWidth:      '190px',
        overflow:      'hidden',
        textOverflow:  'ellipsis',
        whiteSpace:    'nowrap'
      }}
    >
      {text}
    </span>
  );
}

// ─── Th con sort ──────────────────────────────────────────────────────────────
function Th({ children, field, sortField, sortDir, onSort, align = 'left' }) {
  const active = sortField === field;
  return (
    <th
      onClick={() => onSort(field)}
      style={{
        padding:       '10px 12px',
        textAlign:     align,
        fontSize:      '11px',
        fontWeight:    700,
        color:         active ? 'var(--sirah-accent)' : 'var(--gray-600)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        cursor:        'pointer',
        whiteSpace:    'nowrap',
        userSelect:    'none',
        background:    'var(--gray-100)',
        borderBottom:  '2px solid var(--gray-300)'
      }}
    >
      {children}{' '}
      <span style={{ fontSize: '10px', opacity: active ? 1 : 0.4 }}>
        {active ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
      </span>
    </th>
  );
}

// ─── ResultTable ─────────────────────────────────────────────────────────────
export default function ResultTable() {
  const { expedientes }  = useAppStore();
  const { exportarCSV }  = useAPI();

  const [page,      setPage]      = useState(1);
  const [sortField, setSortField] = useState('numero_expediente');
  const [sortDir,   setSortDir]   = useState('asc');
  const [search,    setSearch]    = useState('');
  const [banco,     setBanco]     = useState('');

  // ── Bancos únicos ──────────────────────────────────────────────────────────
  const bancos = useMemo(
    () => [...new Set(expedientes.map(e => e.banco).filter(Boolean))].sort(),
    [expedientes]
  );

  // ── Filtrado + sort ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let d = [...expedientes];

    if (search) {
      const q = search.toLowerCase();
      d = d.filter(e =>
        [e.numero_expediente, e.banco, e.ubicacion, e.contacto, e.status_juridico]
          .some(v => v?.toLowerCase().includes(q))
      );
    }
    if (banco) d = d.filter(e => e.banco === banco);

    d.sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });

    return d;
  }, [expedientes, search, banco, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE);
  const rows       = filtered.slice((page - 1) * PAGE, page * PAGE);

  function sort(field) {
    setSortDir(d => sortField === field ? (d === 'asc' ? 'desc' : 'asc') : 'asc');
    setSortField(field);
    setPage(1);
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!expedientes.length) {
    return (
      <div style={{
        background:   'white',
        borderRadius: '12px',
        padding:      '60px 20px',
        textAlign:    'center',
        boxShadow:    'var(--shadow)',
        color:        'var(--gray-500)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '14px' }}>📋</div>
        <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '6px' }}>
          Sin expedientes cargados
        </div>
        <div style={{ fontSize: '13px' }}>
          Sube un CSV de cartera bancaria para ver los resultados aquí.
        </div>
      </div>
    );
  }

  const tdBase = { padding: '10px 12px', fontSize: '13px', verticalAlign: 'middle', borderBottom: '1px solid var(--gray-200)' };

  return (
    <div style={{ background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>

      {/* ─ Toolbar */}
      <div style={{
        padding:       '14px 18px',
        borderBottom:  '1px solid var(--gray-200)',
        display:       'flex',
        flexWrap:      'wrap',
        gap:           '10px',
        alignItems:    'center'
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize:   '15px',
          color:      'var(--sirah-primary)',
          flex:       1,
          minWidth:   '120px'
        }}>
          📋 Expedientes ({filtered.length} / {expedientes.length})
        </h2>

        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="🔍 Buscar expediente, banco, zona…"
          style={{
            padding:      '7px 11px',
            borderRadius: 'var(--radius-sm)',
            border:       '1px solid var(--gray-300)',
            fontSize:     '13px',
            width:        '230px',
            outline:      'none',
            flexShrink:   0
          }}
        />

        <select
          value={banco}
          onChange={e => { setBanco(e.target.value); setPage(1); }}
          style={{
            padding:      '7px 11px',
            borderRadius: 'var(--radius-sm)',
            border:       '1px solid var(--gray-300)',
            fontSize:     '13px',
            background:   'white',
            cursor:       'pointer'
          }}
        >
          <option value="">Todos los bancos</option>
          {bancos.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <button
          onClick={() => exportarCSV(filtered)}
          style={{
            padding:      '7px 14px',
            background:   'var(--sirah-primary)',
            color:        'white',
            border:       'none',
            borderRadius: 'var(--radius-sm)',
            fontSize:     '13px',
            fontWeight:   600,
            cursor:       'pointer',
            whiteSpace:   'nowrap',
            transition:   'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--sirah-accent)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--sirah-primary)'}
        >
          ⬇ Exportar CSV
        </button>
      </div>

      {/* ─ Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <Th field="numero_expediente" {...{ sortField, sortDir, onSort: sort }}>Expediente</Th>
              <Th field="banco"             {...{ sortField, sortDir, onSort: sort }}>Banco</Th>
              <Th field="ubicacion"         {...{ sortField, sortDir, onSort: sort }}>Ubicación</Th>
              <Th field="monto_adeudo"      {...{ sortField, sortDir, onSort: sort }} align="right">Monto Adeudo</Th>
              <Th field="valor_estimado"    {...{ sortField, sortDir, onSort: sort }} align="right">Valor Est.</Th>
              <Th field="rentabilidad"      {...{ sortField, sortDir, onSort: sort }} align="right">Rent. %</Th>
              <Th field="status_juridico"   {...{ sortField, sortDir, onSort: sort }}>Status Jurídico</Th>
              <Th field="status_pjv"        {...{ sortField, sortDir, onSort: sort }}>Status PJV</Th>
              <Th field="contacto"          {...{ sortField, sortDir, onSort: sort }}>Contacto</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ ...tdBase, textAlign: 'center', color: 'var(--gray-400)', padding: '40px' }}>
                  Sin resultados para la búsqueda actual
                </td>
              </tr>
            ) : rows.map((e, i) => (
              <tr
                key={e.id || e.numero_expediente || i}
                style={{ background: i % 2 === 0 ? 'white' : 'var(--gray-100)', transition: 'background 0.1s' }}
                onMouseEnter={ev => ev.currentTarget.style.background = '#eef2f7'}
                onMouseLeave={ev => ev.currentTarget.style.background = i % 2 === 0 ? 'white' : 'var(--gray-100)'}
              >
                {/* Expediente */}
                <td style={tdBase}>
                  <code style={{
                    fontFamily: 'var(--font-data)',
                    fontSize:   '12px',
                    fontWeight: 700,
                    color:      'var(--sirah-primary)'
                  }}>
                    {e.numero_expediente || '—'}
                  </code>
                </td>

                {/* Banco */}
                <td style={tdBase}>
                  {e.banco
                    ? <span style={{
                        background: 'var(--gray-200)',
                        color:      'var(--sirah-primary)',
                        padding:    '2px 8px',
                        borderRadius: '4px',
                        fontSize:   '12px',
                        fontWeight: 500
                      }}>{e.banco}</span>
                    : '—'}
                </td>

                {/* Ubicación */}
                <td style={{ ...tdBase, maxWidth: '180px' }}>
                  <span title={e.ubicacion} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.ubicacion || '—'}
                  </span>
                </td>

                {/* Monto adeudo */}
                <td style={{ ...tdBase, textAlign: 'right', fontFamily: 'var(--font-data)', fontSize: '12px', color: 'var(--gray-700)' }}>
                  {fmtMXN(e.monto_adeudo)}
                </td>

                {/* Valor estimado */}
                <td style={{ ...tdBase, textAlign: 'right', fontFamily: 'var(--font-data)', fontSize: '12px', fontWeight: 700, color: 'var(--sirah-accent)' }}>
                  {fmtMXN(e.valor_estimado)}
                </td>

                {/* Rentabilidad */}
                <td style={{ ...tdBase, textAlign: 'right' }}>
                  {e.rentabilidad !== null && e.rentabilidad !== undefined ? (
                    <span style={{
                      color:      e.rentabilidad >= 0 ? 'var(--sirah-success-dark)' : 'var(--sirah-warning)',
                      fontWeight: 700,
                      fontFamily: 'var(--font-data)',
                      fontSize:   '12px'
                    }}>
                      {e.rentabilidad >= 0 ? '+' : ''}{Number(e.rentabilidad).toFixed(1)}%
                    </span>
                  ) : '—'}
                </td>

                {/* Status jurídico */}
                <td style={tdBase}><StatusBadge text={e.status_juridico} /></td>

                {/* Status PJV */}
                <td style={tdBase}><StatusBadge text={e.status_pjv} /></td>

                {/* Contacto */}
                <td style={{ ...tdBase, maxWidth: '160px' }}>
                  <span title={e.contacto} style={{
                    display:      'block',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace:   'nowrap',
                    color:        'var(--gray-600)',
                    fontSize:     '12px'
                  }}>
                    {e.contacto || '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─ Pagination */}
      {totalPages > 1 && (
        <div style={{
          padding:       '12px 18px',
          borderTop:     '1px solid var(--gray-200)',
          display:       'flex',
          alignItems:    'center',
          justifyContent:'space-between',
          flexWrap:      'wrap',
          gap:           '8px'
        }}>
          <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
            {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, filtered.length)} de {filtered.length}
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <PagBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Ant</PagBtn>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return (
                <PagBtn key={p} onClick={() => setPage(p)} active={p === page}>{p}</PagBtn>
              );
            })}

            <PagBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Sig →</PagBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function PagBtn({ children, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding:      '5px 10px',
        borderRadius: 'var(--radius-sm)',
        border:       `1px solid ${active ? 'var(--sirah-primary)' : 'var(--gray-300)'}`,
        background:   active ? 'var(--sirah-primary)' : 'white',
        color:        active ? 'white' : disabled ? 'var(--gray-400)' : 'var(--gray-700)',
        fontSize:     '12px',
        fontWeight:   active ? 700 : 400,
        cursor:       disabled ? 'not-allowed' : 'pointer'
      }}
    >
      {children}
    </button>
  );
}
