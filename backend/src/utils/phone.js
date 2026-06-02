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

  // Strip formatting characters but keep digits only
  let digits = String(raw).trim().replace(/[\s\-\(\)\.\+]/g, '')

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

  // TODO: Add other country codes here when expanding internationally
  // if (digits.startsWith('1') && digits.length === 11) return `+${digits}` // US/Canada
  // if (digits.startsWith('34') && digits.length === 11) return `+${digits}` // Spain

  // Unknown format — return null so the caller can decide (skip or flag)
  return null
}
