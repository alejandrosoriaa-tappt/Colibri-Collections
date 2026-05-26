import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, BellDot, Menu } from 'lucide-react'
import useAuthStore from '../../store/authStore.js'
import { notificationsAPI } from '../../lib/api.js'

const ROUTE_TITLES = {
  '/': 'Inicio',
  '/campaigns': 'Campañas',
  '/upload': 'Subir archivo',
  '/contacts': 'Contactos',
  '/messages': 'Mensajes',
  '/settings': 'Configuración',
  '/admin': 'Panel Admin',
  '/admin/tenants': 'Gestión de Tenants'
}

function getTitle(pathname) {
  // Exact match
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
  // Dynamic routes
  if (pathname.startsWith('/campaigns/')) return 'Detalle de campaña'
  if (pathname.startsWith('/contacts/')) return 'Detalle de contacto'
  return 'Colibrí Communications'
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
    const interval = setInterval(fetchUnreadCount, 60000) // every minute
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
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Botón hamburger — solo visible en móvil */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <Menu size={20} />
        </button>
        <h2 className="text-base lg:text-lg font-semibold text-gray-900">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        {tenant && (
          <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full bg-colibri-50 text-colibri text-xs font-medium border border-colibri-100">
            {tenant.display_name || tenant.name}
          </span>
        )}

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={handleBellClick}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            {unreadCount > 0 ? (
              <>
                <BellDot size={20} />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </>
            ) : (
              <Bell size={20} />
            )}
          </button>

          {/* Notifications dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Notificaciones</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    No hay notificaciones
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${!notif.read ? 'bg-green-50' : ''}`}
                    >
                      <p className="text-sm text-gray-800 line-clamp-2">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notif.created_at).toLocaleString('es-MX')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Click outside to close notifications */}
        {showNotifications && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowNotifications(false)}
          />
        )}
      </div>
    </header>
  )
}
