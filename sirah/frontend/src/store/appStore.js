import { create } from 'zustand';

/**
 * Estado global de SIRAH.
 * Todos los componentes consumen este store via useAppStore().
 */
const useAppStore = create((set, get) => ({
  // ── Datos ──────────────────────────────────────────────────────────────────
  expedientes: [],
  estadisticas: {
    total:                 0,
    valor_total:           0,
    promedio_valor:        0,
    rentabilidad_promedio: 0,
    por_banco:             {},
    por_ubicacion:         {}
  },

  // ── UI ─────────────────────────────────────────────────────────────────────
  loading:    false,
  error:      null,
  uploadDone: false,

  // ── Setters ────────────────────────────────────────────────────────────────
  setExpedientes: (expedientes) => set({ expedientes }),

  setEstadisticas: (estadisticas) => set({ estadisticas }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  setUploadDone: (uploadDone) => set({ uploadDone }),

  // Agrega expedientes sin reemplazar los existentes
  addExpedientes: (nuevos) =>
    set((s) => ({ expedientes: [...s.expedientes, ...nuevos] })),

  // Recalcula estadísticas desde los expedientes actuales
  recalcularStats: () => {
    const { expedientes } = get();
    const total = expedientes.length;
    const valorTotal = expedientes.reduce((s, e) => s + (Number(e.valor_estimado) || 0), 0);
    const rentTotal  = expedientes.reduce((s, e) => s + (Number(e.rentabilidad)   || 0), 0);

    const porBanco     = {};
    const porUbicacion = {};
    expedientes.forEach((e) => {
      if (e.banco)     porBanco[e.banco]         = (porBanco[e.banco]         || 0) + 1;
      if (e.ubicacion) porUbicacion[e.ubicacion] = (porUbicacion[e.ubicacion] || 0) + 1;
    });

    set({
      estadisticas: {
        total,
        valor_total:           valorTotal,
        promedio_valor:        total ? valorTotal / total : 0,
        rentabilidad_promedio: total ? rentTotal  / total : 0,
        por_banco:             porBanco,
        por_ubicacion:         porUbicacion
      }
    });
  },

  // Reset completo
  reset: () =>
    set({
      expedientes:  [],
      loading:      false,
      error:        null,
      uploadDone:   false,
      estadisticas: {
        total: 0, valor_total: 0, promedio_valor: 0,
        rentabilidad_promedio: 0, por_banco: {}, por_ubicacion: {}
      }
    })
}));

export default useAppStore;
