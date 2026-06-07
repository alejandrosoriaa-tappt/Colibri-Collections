import { useCallback } from 'react';
import axios from 'axios';
import useAppStore from '../store/appStore';

// En dev usa el proxy de Vite → localhost:3000
// En producción Railway usa VITE_API_URL (ej: https://sirah-backend.up.railway.app)
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

/**
 * Hook centralizado para todas las llamadas a la API de SIRAH.
 * Maneja loading, errores y actualización del store automáticamente.
 */
export function useAPI() {
  const store = useAppStore();

  // ── procesarCartera ────────────────────────────────────────────────────────
  const procesarCartera = useCallback(async (archivo) => {
    store.setLoading(true);
    store.clearError();
    store.setUploadDone(false);

    try {
      const form = new FormData();
      form.append('archivo', archivo);

      const { data } = await axios.post(`${BASE}/procesar-cartera`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90_000
      });

      store.setExpedientes(data.expedientes || []);

      if (data.estadisticas) {
        const s = data.estadisticas;
        store.setEstadisticas({
          total:                 s.total || 0,
          valor_total:           s.valor_total || 0,
          promedio_valor:        s.total ? s.valor_total / s.total : 0,
          rentabilidad_promedio: s.promedio_rentabilidad || 0,
          por_banco:             {},
          por_ubicacion:         {}
        });
      }

      store.setUploadDone(true);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error al procesar la cartera';
      store.setError(msg);
      throw err;
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  // ── leerHojas ─────────────────────────────────────────────────────────────
  const leerHojas = useCallback(async (archivo) => {
    const form = new FormData();
    form.append('archivo', archivo);
    const { data } = await axios.post(`${BASE}/leer-hojas`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30_000
    });
    return data;
  }, []);

  // ── fetchExpedientes ───────────────────────────────────────────────────────
  const fetchExpedientes = useCallback(async (filters = {}) => {
    store.setLoading(true);
    store.clearError();

    try {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      );
      const url = `${BASE}/expedientes${params.toString() ? `?${params}` : ''}`;
      const { data } = await axios.get(url, { timeout: 30_000 });

      store.setExpedientes(data.expedientes || []);
      store.recalcularStats();
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al obtener expedientes';
      store.setError(msg);
      throw err;
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  // ── fetchEstadisticas ──────────────────────────────────────────────────────
  const fetchEstadisticas = useCallback(async () => {
    try {
      const { data } = await axios.get(`${BASE}/estadisticas`, { timeout: 15_000 });
      if (data.estadisticas) store.setEstadisticas(data.estadisticas);
      return data.estadisticas;
    } catch {
      // No critico — las stats pueden estar vacías al inicio
    }
  }, [store]);

  // ── exportarCSV ────────────────────────────────────────────────────────────
  const exportarCSV = useCallback((expedientes) => {
    if (!expedientes?.length) return;

    const COLS = [
      ['nombre_archivo',    'Archivo Fuente'],
      ['tipo_cartera',      'Pestaña/Tipo'],
      ['folio_banco',       'Folio Banco'],
      ['numero_expediente', 'Expediente'],
      ['banco',             'Banco'],
      ['ubicacion',         'Ubicación'],
      ['valor_catastral',   'Valor Catastral'],
      ['monto_adeudo',      'Monto Adeudo'],
      ['valor_estimado',    'Valor Estimado'],
      ['rentabilidad',      'Rentabilidad %'],
      ['status_juridico',   'Status Jurídico'],
      ['status_pjv',        'Status PJV'],
      ['contacto',          'Contacto'],
      ['notas',             'Notas']
    ];

    const escape = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    };

    const rows = [
      COLS.map(([, label]) => label).join(','),
      ...expedientes.map(e => COLS.map(([k]) => escape(e[k])).join(','))
    ].join('\n');

    const blob = new Blob(['﻿' + rows], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href:     url,
      download: `sirah-cartera-${new Date().toISOString().slice(0, 10)}.csv`
    });
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return { procesarCartera, leerHojas, fetchExpedientes, fetchEstadisticas, exportarCSV };
}
