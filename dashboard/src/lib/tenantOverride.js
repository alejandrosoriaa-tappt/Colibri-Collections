/**
 * Colegio que está viendo un admin.
 *
 * El sistema asume que cada persona pertenece a UN colegio: al resolver la
 * membresía usa un método que devuelve error si encuentra dos. Por eso un admin
 * no puede simplemente "pertenecer" a todos los colegios para dar soporte —lo
 * dejaría sin poder entrar a ninguno—.
 *
 * En vez de eso, el admin declara en cada petición a qué colegio se refiere.
 * El backend ya lo contempla: `inferTenantGuard` acepta un tenant_id explícito
 * cuando quien pregunta es admin, y lo ignora para todos los demás. O sea que
 * esto NO es un permiso: un usuario normal que lo mande sigue viendo lo suyo.
 *
 * Vive en localStorage para que sobreviva a recargar la página: si se perdiera,
 * el admin estaría a mitad de un soporte y volvería de golpe a su propio
 * colegio sin darse cuenta de que cambió de contexto.
 */
const LLAVE = 'kollybry.admin.tenant'

export function getTenantOverride() {
  try {
    return localStorage.getItem(LLAVE) || null
  } catch {
    // Modo incógnito o storage bloqueado: se trabaja sin selector.
    return null
  }
}

export function setTenantOverride(tenantId) {
  try {
    if (tenantId) localStorage.setItem(LLAVE, tenantId)
    else localStorage.removeItem(LLAVE)
  } catch {
    /* sin storage no hay nada que guardar */
  }
}
