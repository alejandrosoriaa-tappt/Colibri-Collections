// ── Catálogo escolar canónico (vocabulario controlado) ──────────────────────────
// Fuente única de verdad para sección / grado / salón en colegios y academias.
// Debe coincidir EXACTO con el catálogo del frontend (ContactsPage.jsx).

export const SECCIONES = ['Preescolar', 'Primaria', 'Secundaria', 'Preparatoria']

export const GRADOS_POR_SECCION = {
  Preescolar:   ['1ro', '2do', '3ro'],
  Primaria:     ['1ro', '2do', '3ro', '4to', '5to', '6to'],
  Secundaria:   ['1ro', '2do', '3ro'],
  Preparatoria: ['1ro', '2do', '3ro'],
}

export const SALONES = ['A', 'B', 'C', 'D', 'E']

// Mapa de normalización: variantes comunes → valor canónico de SECCIÓN
const SECCION_ALIASES = {
  preescolar: 'Preescolar',
  kinder: 'Preescolar',
  kínder: 'Preescolar',
  primaria: 'Primaria',
  prim: 'Primaria',
  secundaria: 'Secundaria',
  sec: 'Secundaria',
  secu: 'Secundaria',
  preparatoria: 'Preparatoria',
  prepa: 'Preparatoria',
  bachillerato: 'Preparatoria',
  'preparatoria / bachillerato': 'Preparatoria',
}

// Mapa de normalización de GRADO: número o variante → '1ro'..'6to'
const GRADO_CANON = ['1ro', '2do', '3ro', '4to', '5to', '6to']
const GRADO_ALIASES = {
  '1': '1ro', '1ro': '1ro', '1°': '1ro', 'primero': '1ro',
  '2': '2do', '2do': '2do', '2°': '2do', 'segundo': '2do',
  '3': '3ro', '3ro': '3ro', '3°': '3ro', 'tercero': '3ro',
  '4': '4to', '4to': '4to', '4°': '4to', 'cuarto': '4to',
  '5': '5to', '5to': '5to', '5°': '5to', 'quinto': '5to',
  '6': '6to', '6to': '6to', '6°': '6to', 'sexto': '6to',
}

function clean(v) {
  return String(v ?? '').trim()
}

/** Normaliza una sección a su valor canónico, o null si no se reconoce. */
export function normalizeSeccion(value) {
  const v = clean(value)
  if (!v) return null
  if (SECCIONES.includes(v)) return v
  return SECCION_ALIASES[v.toLowerCase()] || null
}

/** Normaliza un grado a '1ro'..'6to', o null si no se reconoce. */
export function normalizeGrado(value) {
  const v = clean(value)
  if (!v) return null
  if (GRADO_CANON.includes(v)) return v
  // quitar sufijos tipo "ro/do/to/°" y espacios para mapear por número
  const key = v.toLowerCase().replace(/\s+/g, '')
  return GRADO_ALIASES[key] || null
}

/** Normaliza un salón a 'A'..'E' (mayúscula), o null si no se reconoce. */
export function normalizeSalon(value) {
  const v = clean(value).toUpperCase()
  if (!v) return null
  return SALONES.includes(v) ? v : null
}

/**
 * Construye el nombre de grupo canónico para un alumno de colegio/academia.
 * Regla de oro: SIEMPRE "Seccion Grado Salon" con los valores normalizados.
 * Si falta sección o grado, regresa lo que se pueda construir (parcial) para
 * no perder información, pero priorizando el formato consistente.
 *
 * @returns { grupo, seccion, grado, salon } valores normalizados
 */
export function buildEscolarGrupo({ seccion, grado, salon }) {
  const s = normalizeSeccion(seccion)
  const g = normalizeGrado(grado)
  const a = normalizeSalon(salon)

  // Validar que el grado pertenezca a la sección (si ambos existen)
  let gradoValido = g
  if (s && g && !(GRADOS_POR_SECCION[s] || []).includes(g)) {
    gradoValido = null
  }

  const parts = [s, gradoValido, a].filter(Boolean)
  return {
    grupo: parts.length ? parts.join(' ') : null,
    seccion: s,
    grado: gradoValido,
    salon: a,
  }
}
