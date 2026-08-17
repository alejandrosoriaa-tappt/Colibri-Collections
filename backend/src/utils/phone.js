/**
 * Phone number normalization — single source of truth.
 *
 * Current market: Mexico (+521)
 * Future: when adding international markets, extend the switch below
 * by detecting country prefix and applying the right E.164 format.
 *
 * Handles common Mexican input formats:
 *   5512345678       → +5215512345678  (10 digits, local)
 *   525512345678     → +5215512345678  (12 digits, missing mobile 1)
 *   5215512345678    → +5215512345678  (13 digits, missing +)
 *   +5215512345678   → +5215512345678  (already correct)
 *   +525512345678    → +5215512345678  (intl without mobile 1)
 *
 * Returns null if the number can't be normalized (invalid format).
 */
export function normalizePhone(raw) {
  if (!raw) return null

  const crudo = String(raw).trim()
  // Si quien capturó escribió el "+", ya dijo de qué país es. Antes se ignoraba
  // y cualquier número que no fuera mexicano se descartaba en silencio: un papá
  // con +1 quedaba fuera del padrón sin que nadie se enterara.
  const traeLada = crudo.startsWith('+')

  // Strip formatting characters but keep digits only
  let digits = crudo.replace(/[\s\-\(\)\.\+]/g, '')

  // Remove leading zeros (sometimes pasted from Excel)
  digits = digits.replace(/^0+/, '')

  if (digits.length === 10) {
    // Plain Mexican local number: XXXXXXXXXX → +521XXXXXXXXXX
    return `+521${digits}`
  }
  if (digits.length === 12 && digits.startsWith('52')) {
    // Country code but missing mobile 1: 52XXXXXXXXXX → +521XXXXXXXXXX
    return `+521${digits.slice(2)}`
  }
  if (digits.length === 13 && digits.startsWith('521')) {
    // Correct digits, just missing +
    return `+${digits}`
  }

  // Estados Unidos y Canadá: 1 + 10 dígitos. Se acepta aunque no traiga "+",
  // porque en los padrones escolares aparece seguido escrito así.
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }

  // Cualquier otro país, siempre que hayan escrito el "+". E.164 permite de 8 a
  // 15 dígitos contando la lada. No se adivina: sin "+" no hay forma de saber
  // si 4421234567 es de Querétaro o de otro lado.
  if (traeLada && digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`
  }

  // Unknown format — return null so the caller can decide (skip or flag)
  return null
}

/**
 * Enmascara un teléfono para logs: +5214425610078 → +52·····0078
 * Los logs de Railway se conservan y los ve cualquiera con acceso al proyecto;
 * no tienen por qué guardar el padrón completo de un colegio.
 */
export function telLog(tel) {
  const s = String(tel ?? '')
  if (s.length < 6) return '···'
  return `${s.slice(0, 3)}·····${s.slice(-4)}`
}
