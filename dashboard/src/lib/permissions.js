/**
 * Role-based access control definitions
 *
 * Roles:
 *  owner   – full access (director, admin)
 *  billing – campaigns, contacts, invoices
 *  comms   – broadcasts / comunicados only
 */

export const ROLE_LABELS = {
  owner:   'Administrador',
  billing: 'Cobranza',
  comms:   'Comunicados',
}

/**
 * Routes each role can access.
 * Paths are matched with startsWith so /campaigns covers /campaigns/:id.
 */
const ROLE_ROUTES = {
  owner:   ['/', '/mensajes', '/broadcasts', '/contacts', '/cobranza', '/campaigns', '/upload', '/messages', '/settings'],
  billing: ['/', '/mensajes', '/broadcasts', '/contacts', '/cobranza', '/campaigns', '/upload', '/messages'],
  comms:   ['/', '/mensajes', '/broadcasts'],
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
  { to: '/mensajes', label: 'Mensajes',        iconName: 'MessageSquare',  exact: false, roles: ['owner', 'billing', 'comms'] },
  { to: '/contacts', label: 'Contactos',       iconName: 'Users',          exact: false, roles: ['owner', 'billing'] },
  { to: '/cobranza', label: 'Cobranza',         iconName: 'CircleDollarSign', exact: false, roles: ['owner', 'billing'] },
  { to: '/settings', label: 'Configuración',   iconName: 'Settings',       exact: false, roles: ['owner'] },
]
