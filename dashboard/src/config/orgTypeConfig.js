/**
 * Central configuration per org type.
 * All labels, field names, and feature flags live here.
 * To add a new type: add an entry here — no new DB columns or React components needed.
 */

export const ORG_CONFIG = {
  colegio: {
    label: 'Colegio / Escuela',
    contactLabel: 'Familia',
    contactLabelPlural: 'Familias',
    hasStudent: true,
    studentLabel: 'Alumno',
    groupLabel: 'Grupo / Grado',
    idExternoLabel: 'Matrícula',
    campaignLabel: 'Colegiatura',
    amountLabel: 'Colegiatura',
    searchPlaceholder: 'Buscar por familia, alumno, teléfono...',
    hasMembership: false,
  },
  academia: {
    label: 'Academia',
    contactLabel: 'Familia',
    contactLabelPlural: 'Familias',
    hasStudent: true,
    studentLabel: 'Alumno',
    groupLabel: 'Nivel / Clase',
    idExternoLabel: 'Matrícula',
    campaignLabel: 'Mensualidad',
    amountLabel: 'Mensualidad',
    searchPlaceholder: 'Buscar por familia, alumno, teléfono...',
    hasMembership: false,
  },
  // Covers: gym, golf club, tennis club, sports clubs — same structure
  club: {
    label: 'Club / Gimnasio',
    contactLabel: 'Socio',
    contactLabelPlural: 'Socios',
    hasStudent: false,
    studentLabel: null,
    groupLabel: 'Categoría',
    idExternoLabel: 'Núm. membresía',
    campaignLabel: 'Cuota mensual',
    amountLabel: 'Cuota',
    searchPlaceholder: 'Buscar por nombre, membresía, teléfono...',
    hasMembership: true,
  },
  // Legacy alias — same as club
  gimnasio: {
    label: 'Gimnasio',
    contactLabel: 'Socio',
    contactLabelPlural: 'Socios',
    hasStudent: false,
    studentLabel: null,
    groupLabel: 'Categoría',
    idExternoLabel: 'Núm. membresía',
    campaignLabel: 'Mensualidad',
    amountLabel: 'Mensualidad',
    searchPlaceholder: 'Buscar por nombre, membresía, teléfono...',
    hasMembership: true,
  },
  condominio: {
    label: 'Condominio',
    contactLabel: 'Residente',
    contactLabelPlural: 'Residentes',
    hasStudent: false,
    studentLabel: null,
    groupLabel: 'Torre / Unidad',
    idExternoLabel: 'ID Externo',
    campaignLabel: 'Cuota de mantenimiento',
    amountLabel: 'Cuota',
    searchPlaceholder: 'Buscar por nombre, unidad, teléfono...',
    hasMembership: false,
  },
  general: {
    label: 'General',
    contactLabel: 'Contacto',
    contactLabelPlural: 'Contactos',
    hasStudent: false,
    studentLabel: null,
    groupLabel: 'Grupo',
    idExternoLabel: 'ID Externo',
    campaignLabel: 'Cobro',
    amountLabel: 'Monto',
    searchPlaceholder: 'Buscar por nombre, teléfono...',
    hasMembership: false,
  },
}

/** Returns org config for a given org_type, falls back to 'general'. */
export const getOrgConfig = (orgType) =>
  ORG_CONFIG[orgType] || ORG_CONFIG.general

/**
 * Options for org type selectors (consolidated — gimnasio → club).
 * Existing tenants with org_type='gimnasio' still work via getOrgConfig fallback.
 */
export const ORG_TYPE_OPTIONS = [
  { value: 'colegio',    label: 'Colegio / Escuela' },
  { value: 'academia',   label: 'Academia' },
  { value: 'club',       label: 'Club / Gimnasio' },
  { value: 'condominio', label: 'Condominio' },
  { value: 'general',    label: 'General' },
]
