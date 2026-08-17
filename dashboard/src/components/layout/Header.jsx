import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, BellDot, Menu, Eye } from 'lucide-react'
import useAuthStore from '../../store/authStore.js'
import { notificationsAPI, adminAPI } from '../../lib/api.js'
import { getTenantOverride } from '../../lib/tenantOverride.js'

/**
 * Selector de colegio, solo para admin.
 *
 * Sirve para dar soporte sin pedirle la contraseña a nadie: el admin elige un
 * colegio y ve exactamente el panel que ve su directora.
 */
function SelectorColegio() {
  const { isAdmin, cambiarTenant, viendoOtroColegio } = useAuthStore()
  const [colegios, setColegios] = useState([])
  const actual = getTenantOverride() || ''

  useEffect(() => {
    if (!isAdmin) return
    adminAPI.listTenants()
      .then(res => setColegios(res.data.tenants || []))
      .catch(() => setColegios([]))
  }, [isAdmin])

  if (!isAdmin || colegios.length === 0) return null

  return (
    // Visible también en móvil: el soporte se da desde donde uno esté, y
    // esconderlo en pantalla chica era dejarlo inservible justo cuando te
    // habla una directora y andas fuera de la oficina.
    <div className="flex items-center gap-2">
      {viendoOtroColegio && (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
          <Eye size={12} />
          <span className="hidden sm:inline">Viendo otro colegio</span>
        </span>
      )}
      <select
        value={actual}
        onChange={e => cambiarTenant(e.target.value || null)}
        className="text-xs rounded-full border border-md-outline px-2 sm:px-3 py-1.5 bg-md-surface text-md-on-surface max-w-[120px] sm:max-w-[180px]"
        title="Ver el panel de otro colegio"
      >
        <option value="">Mi colegio</option>
        {colegios.map(t => (
          <option key={t.id} value={t.id}>{t.display_name || t.name}</option>
        ))}
      </select>
    </div>
  )
}

const ROUTE_TITLES = {
  '/': 'Inicio',
  '/mensajes': 'Mensajes',
  '/comunicados': 'Comunicados',
  '/broadcasts': 'Comunicados',
  '/contacts': 'Contactos',
  '/settings': 'Configuración',
  '/admin': 'Panel Admin',
  '/admin/tenants': 'Gestión de Tenants'
}

function getTitle(pathname) {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
  if (pathname.startsWith('/contacts/')) return 'Detalle de contacto'
  if (pathname.startsWith('/admin/tenants/')) return 'Tenant'
  return 'Kollybry'
}

export default function Header({ onMenuClick }) {
  const { tenant } = useAuthStore()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])

  const title = getTitle(location.pathname)

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 60000)
    return () => clearInterval(interval)
  }, [])

  async function fetchUnreadCount() {
    try {
      const response = await notificationsAPI.list({ limit: 5 })
      setUnreadCount(response.data.unread_count || 0)
      setNotifications(response.data.notifications || [])
    } catch {
      // ignore
    }
  }

  async function handleBellClick() {
    setShowNotifications(!showNotifications)
    if (!showNotifications && unreadCount > 0) {
      try {
        await notificationsAPI.markAllRead()
        setUnreadCount(0)
      } catch {
        // ignore
      }
    }
  }

  return (
    <header className="h-16 bg-md-surface-container-low border-b border-md-outline-variant flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-md-on-surface-variant hover:bg-md-surface-container rounded-full transition-colors"
        >
          <Menu size={20} />
        </button>
        <h2 className="text-base lg:text-lg font-medium text-md-on-surface">{title}</h2>
      </div>

      <div className="flex items-center gap-2">
        <SelectorColegio />
        {tenant && (
          <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full bg-md-primary-container text-md-on-primary-container text-xs font-medium">
            {tenant.display_name || tenant.name}
          </span>
        )}

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={handleBellClick}
            className="relative p-2 text-md-on-surface-variant hover:bg-md-surface-container rounded-full transition-colors"
          >
            {unreadCount > 0 ? (
              <>
                <BellDot size={20} />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-md-error text-md-on-error text-xs rounded-full flex items-center justify-center font-bold leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </>
            ) : (
              <Bell size={20} />
            )}
          </button>

          {/* Notifications dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-md3-3 border border-md-outline-variant z-50 overflow-hidden">
              <div className="px-5 py-3 border-b border-md-outline-variant">
                <h3 className="text-sm font-semibold text-md-on-surface">Notificaciones</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-md-on-surface-variant">
                    Sin notificaciones nuevas
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      className={`px-5 py-3 border-b border-md-outline-variant/50 last:border-0 ${
                        !notif.read ? 'bg-md-primary-container/20' : ''
                      }`}
                    >
                      <p className="text-sm text-md-on-surface line-clamp-2">{notif.message}</p>
                      <p className="text-xs text-md-on-surface-variant mt-1">
                        {new Date(notif.created_at).toLocaleString('es-MX')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {showNotifications && (
          <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
        )}
      </div>
    </header>
  )
}
