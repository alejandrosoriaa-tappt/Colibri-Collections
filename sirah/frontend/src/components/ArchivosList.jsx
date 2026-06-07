import React, { useEffect, useState } from 'react';
import useAppStore from '../store/appStore';
import { useAPI } from '../hooks/useAPI';

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ArchivosList({ onCargar }) {
  const { archivos, setArchivos } = useAppStore();
  const { fetchArchivos, renameArchivo, deleteArchivo, cargarArchivo } = useAPI();

  const [editingId,  setEditingId]  = useState(null);
  const [editValue,  setEditValue]  = useState('');
  const [loadingId,  setLoadingId]  = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => { fetchArchivos(); }, []);

  async function handleRename(id) {
    if (!editValue.trim()) return;
    setSaving(true);
    try {
      const updated = await renameArchivo(id, editValue.trim());
      setArchivos(archivos.map(a => a.id === id ? { ...a, nombre_display: updated.nombre_display } : a));
      setEditingId(null);
    } catch { /* no-op */ }
    finally { setSaving(false); }
  }

  async function handleDelete(id, nombre) {
    if (!window.confirm(`¿Eliminar "${nombre}" y sus ${archivos.find(a=>a.id===id)?.total || 0} expedientes? Esta acción no se puede deshacer.`)) return;
    setDeletingId(id);
    try {
      await deleteArchivo(id);
      setArchivos(archivos.filter(a => a.id !== id));
    } catch { /* no-op */ }
    finally { setDeletingId(null); }
  }

  async function handleCargar(id) {
    setLoadingId(id);
    try {
      await cargarArchivo(id);
      onCargar?.();
    } catch { /* no-op */ }
    finally { setLoadingId(null); }
  }

  if (!archivos.length) return (
    <div style={{
      background: '#ffffff', border: '1px solid #e0e0e0',
      borderRadius: '12px', padding: '64px 20px', textAlign: 'center'
    }}>
      <div style={{ fontSize: '48px', opacity: 0.12, marginBottom: '16px' }}>🗂</div>
      <div style={{ fontSize: '15px', color: '#757575', fontWeight: 700 }}>
        Sin archivos procesados aún
      </div>
      <div style={{ fontSize: '13px', color: '#9e9e9e', marginTop: '6px', fontWeight: 600 }}>
        Sube un Excel en la sección Cartera para comenzar
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontSize: '13px', color: '#5c7099', fontWeight: 600, marginBottom: '4px' }}>
        {archivos.length} {archivos.length === 1 ? 'archivo procesado' : 'archivos procesados'} · Los datos persisten entre sesiones
      </div>

      {archivos.map(a => {
        const displayName = a.nombre_display || a.nombre;
        const isEditing   = editingId === a.id;
        const isLoading   = loadingId  === a.id;
        const isDeleting  = deletingId === a.id;

        return (
          <div key={a.id} style={{
            background: '#ffffff',
            border: '1px solid #e0e0e0',
            borderLeft: '4px solid #1565c0',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {/* Name row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {isEditing ? (
                <>
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter')  handleRename(a.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    style={{
                      flex: 1, minWidth: '160px',
                      padding: '6px 10px', borderRadius: '6px',
                      border: '2px solid #1565c0', outline: 'none',
                      fontSize: '14px', fontWeight: 700, color: '#212121'
                    }}
                  />
                  <button onClick={() => handleRename(a.id)} disabled={saving} style={btnStyle('#1565c0')}>
                    {saving ? '…' : '✓ Guardar'}
                  </button>
                  <button onClick={() => setEditingId(null)} style={btnStyle('#757575')}>
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#0d2a6b', flex: 1 }}>
                    {displayName}
                  </span>
                  {a.nombre_display && (
                    <span style={{ fontSize: '11px', color: '#9e9e9e', fontWeight: 600 }}>
                      {a.nombre}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Meta row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '13px', fontWeight: 800, color: '#1565c0',
                background: '#e3f2fd', padding: '3px 10px', borderRadius: '20px'
              }}>
                {Number(a.total).toLocaleString()} expedientes
              </span>
              <span style={{ fontSize: '12px', color: '#757575', fontWeight: 600 }}>
                {fmt(a.created_at)}
              </span>
            </div>

            {/* Actions */}
            {!isEditing && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => handleCargar(a.id)} disabled={isLoading} style={btnStyle('#1565c0')}>
                  {isLoading ? 'Cargando…' : '📂 Cargar en tabla'}
                </button>
                <button onClick={() => { setEditingId(a.id); setEditValue(displayName); }} style={btnStyle('#424242')}>
                  ✎ Renombrar
                </button>
                <button onClick={() => handleDelete(a.id, displayName)} disabled={isDeleting} style={btnStyle('#b71c1c')}>
                  {isDeleting ? 'Eliminando…' : '🗑 Eliminar'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function btnStyle(bg) {
  return {
    padding: '7px 14px', background: bg,
    color: '#ffffff', border: 'none',
    borderRadius: '6px', fontSize: '12px', fontWeight: 700,
    cursor: 'pointer', whiteSpace: 'nowrap'
  };
}
