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
    campaignPlaceholder: 'Ej. Colegiatura Mayo 2025',
    searchPlaceholder: 'Buscar por familia, alumno, teléfono...',
    hasMembership: false,
    conceptos: [
      'Colegiatura',
      'Reinscripción',
      'Cuota de Materiales',
      'Seguro Escolar',
      'Actividades Extraescolares',
      'Regularización Académica',
      'Campamento Escolar',
      'Inscripción',
      'Otro',
    ],
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
    campaignPlaceholder: 'Ej. Mensualidad Mayo 2025',
    searchPlaceholder: 'Buscar por familia, alumno, teléfono...',
    hasMembership: false,
    conceptos: [
      'Mensualidad',
      'Inscripción',
      'Cuota de Uniforme',
      'Material Didáctico',
      'Examen',
      'Evento Especial',
      'Otro',
    ],
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
    campaignLabel: 'Mensualidad',
    amountLabel: 'Cuota',
    campaignPlaceholder: 'Ej. Mensualidad Mayo 2025',
    searchPlaceholder: 'Buscar por nombre, membresía, teléfono...',
    hasMembership: true,
    conceptos: [
      'Mensualidad',
      'Membresía Anual',
      'Cuota de Inscripción',
      'Clase Especial',
      'Torneo',
      'Evento',
      'Servicio',
      'Otro',
    ],
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
    campaignPlaceholder: 'Ej. Mensualidad Mayo 2025',
    searchPlaceholder: 'Buscar por nombre, membresía, teléfono...',
    hasMembership: true,
    conceptos: [
      'Mensualidad',
      'Membresía Anual',
      'Cuota de Inscripción',
      'Clase Especial',
      'Evento',
      'Servicio',
      'Otro',
    ],
  },
  condominio: {
    label: 'Condominio',
    contactLabel: 'Residente',
    contactLabelPlural: 'Residentes',
    hasStudent: false,
    studentLabel: null,
    groupLabel: 'Torre / Sección',
    idExternoLabel: 'Número de unidad',
    campaignLabel: 'Cuota de mantenimiento',
    amountLabel: 'Cuota',
    campaignPlaceholder: 'Ej. Mantenimiento Mayo 2025',
    searchPlaceholder: 'Buscar por nombre, torre, teléfono...',
    hasMembership: false,
    conceptos: [
      'Cuota de mantenimiento',
      'Cuota extraordinaria',
      'Fondo de reserva',
      'Agua',
      'Gas',
      'Electricidad',
      'Reparación',
      'Seguridad',
      'Otro',
    ],
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
    campaignPlaceholder: 'Ej. Cobro Mayo 2025',
    searchPlaceholder: 'Buscar por nombre, teléfono...',
    hasMembership: false,
    conceptos: [
      'Mensualidad',
      'Membresía',
      'Cuota',
      'Renta',
      'Servicio',
      'Inscripción',
      'Otro',
    ],
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
