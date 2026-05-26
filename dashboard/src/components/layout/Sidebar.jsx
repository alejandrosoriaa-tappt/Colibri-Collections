import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Megaphone,
  Upload,
  Users,
  MessageSquare,
  Settings,
  Shield,
  Building2,
  LogOut,
  X,
  Radio
} from 'lucide-react'
import useAuthStore from '../../store/authStore.js'

const navLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Inicio', exact: true },
  { to: '/campaigns', icon: Megaphone, label: 'Cobros' },
  { to: '/broadcasts', icon: Radio, label: 'Comunicados' },
  { to: '/upload', icon: Upload, label: 'Subir contactos', highlight: true },
  { to: '/contacts', icon: Users, label: 'Contactos' },
  { to: '/messages', icon: MessageSquare, label: 'Mensajes' },
  { to: '/settings', icon: Settings, label: 'Configuración' }
]

const adminLinks = [
  { to: '/admin', icon: Shield, label: 'Panel Admin', exact: true },
  { to: '/admin/tenants', icon: Building2, label: 'Tenants' }
]

export default function Sidebar({ isOpen, onClose }) {
  const { user, tenant, isAdmin, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const getNavClass = ({ isActive }, highlight) => {
    const base = 'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-sm'
    if (isActive) return `${base} bg-white bg-opacity-20 text-white font-semibold`
    if (highlight) return `${base} bg-white bg-opacity-10 text-white hover:bg-opacity-20 border border-white border-opacity-30`
    return `${base} text-white text-opacity-80 hover:bg-white hover:bg-opacity-10`
  }

  const handleNavClick = () => {
    // Cerrar sidebar en móvil al navegar
    if (window.innerWidth < 1024) onClose()
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'
  const initials = displayName.charAt(0).toUpperCase()

  return (
    <aside
      className={`
        fixed top-0 left-0 z-30 h-full w-64 flex flex-col text-white transition-transform duration-300
        lg:static lg:translate-x-0 lg:z-auto lg:flex-shrink-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      style={{ backgroundColor: '#0d6e4f' }}
    >
      {/* Logo + cerrar en móvil */}
      <div className="px-5 py-5 border-b border-white border-opacity-10 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Colibrí" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">ColYbiz</h1>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden text-white text-opacity-60 hover:text-opacity-100 p-1 rounded-lg hover:bg-white hover:bg-opacity-10 mt-1"
        >
          <X size={18} />
        </button>
      </div>

      {tenant && (
        <div className="px-5 py-2 border-b border-white border-opacity-10">
          <p className="text-xs text-white text-opacity-60 truncate">{tenant.display_name || tenant.name}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navLinks.map(({ to, icon: Icon, label, exact, highlight }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={handleNavClick}
            className={(navProps) => getNavClass(navProps, highlight)}
          >
            <Icon size={18} className="flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1">
              <p className="px-4 text-xs font-semibold text-white text-opacity-50 uppercase tracking-wider">
                Admin
              </p>
            </div>
            {adminLinks.map(({ to, icon: Icon, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                onClick={handleNavClick}
                className={(navProps) => getNavClass(navProps, false)}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-white border-opacity-10">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-white bg-opacity-20 flex items-center justify-center font-semibold text-white text-sm flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            <p className="text-xs text-white text-opacity-60 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-white text-opacity-60 hover:text-opacity-100 transition-opacity p-1 rounded-lg hover:bg-white hover:bg-opacity-10"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
