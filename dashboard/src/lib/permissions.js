/**
 * Role-based access control definitions
 *
 * Roles:
 *  owner   – full access (director, admin)
 *  billing – mensajes + padrón de contactos (clave histórica, ver nota)
 *  comms   – mensajes / comunicados only
 *
 * Nota: la clave `billing` viene de cuando existían las campañas de cobro.
 * Se conserva el identificador para no invalidar los usuarios que ya lo
 * tienen guardado en la base; hoy significa "coordinación" (mensajes + padrón).
 */

export const ROLE_LABELS = {
  owner:   'Administrador',
  billing: 'Coordinación',
  comms:   'Comunicados',
}

/**
 * Routes each role can access.
 * Paths are matched with startsWith so /x covers /x/:id.
 */
const ROLE_ROUTES = {
  owner:   ['/', '/mensajes', '/comunicados', '/broadcasts', '/contacts', '/settings'],
  billing: ['/', '/mensajes', '/comunicados', '/broadcasts', '/contacts'],
  comms:   ['/', '/mensajes', '/comunicados', '/broadcasts'],
}

/**
 * Returns true if `role` can access `pathname`.
 * Falls back to false for unknown roles (safety-first).
 */
export function canAccess(role, pathname) {
  if (!role) return false
  const allowed = ROLE_ROUTES[role] || []
  return allowed.some(prefix =>
    pathname === prefix || pathname.startsWith(prefix + '/')
  )
}

/**
 * Sidebar nav items with the roles that can see them.
 */
export const NAV_ITEMS = [
  { to: '/',         label: 'Inicio',         iconName: 'LayoutDashboard', exact: true,  roles: ['owner', 'billing', 'comms'] },
  // Mensajes = dirigido a salones/grupos · Comunicados = a toda la comunidad
  { to: '/mensajes',    label: 'Mensajes',     iconName: 'MessageSquare',  exact: false, roles: ['owner', 'billing', 'comms'] },
  { to: '/comunicados', label: 'Comunicados',  iconName: 'Radio',          exact: false, roles: ['owner', 'billing', 'comms'] },
  { to: '/contacts', label: 'Contactos',       iconName: 'Users',          exact: false, roles: ['owner', 'billing'] },
  { to: '/settings', label: 'Configuración',   iconName: 'Settings',       exact: false, roles: ['owner'] },
]
