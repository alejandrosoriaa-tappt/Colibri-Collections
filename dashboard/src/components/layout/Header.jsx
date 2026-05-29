import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, BellDot, Menu } from 'lucide-react'
import useAuthStore from '../../store/authStore.js'
import { notificationsAPI } from '../../lib/api.js'

const ROUTE_TITLES = {
  '/': 'Inicio',
  '/mensajes': 'Mensajes',
  '/campaigns': 'Campañas',
  '/broadcasts': 'Comunicados',
  '/upload': 'Subir archivo',
  '/contacts': 'Contactos',
  '/messages': 'Registro de mensajes',
  '/settings': 'Configuración',
  '/admin': 'Panel Admin',
  '/admin/tenants': 'Gestión de Tenants'
}

function getTitle(pathname) {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
  if (pathname.startsWith('/campaigns/')) return 'Detalle de campaña'
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
