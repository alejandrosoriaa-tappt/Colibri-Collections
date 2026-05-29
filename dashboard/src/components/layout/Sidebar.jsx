import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Settings,
  Shield,
  Building2,
  LogOut,
  X
} from 'lucide-react'
import useAuthStore from '../../store/authStore.js'

const navLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Inicio', exact: true },
  { to: '/mensajes', icon: MessageSquare, label: 'Mensajes' },
  { to: '/contacts', icon: Users, label: 'Contactos' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
]

const adminLinks = [
  { to: '/admin', icon: Shield, label: 'Panel Admin', exact: true },
  { to: '/admin/tenants', icon: Building2, label: 'Tenants' },
]

export default function Sidebar({ isOpen, onClose }) {
  const { user, tenant, isAdmin, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleNavClick = () => {
    if (window.innerWidth < 1024) onClose()
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'
  const initials = displayName.charAt(0).toUpperCase()

  const linkClass = ({ isActive }) =>
    `flex items-center gap-4 px-4 py-3 rounded-full font-medium text-sm transition-colors duration-150 ${
      isActive
        ? 'bg-md-primary-container text-md-on-primary-container'
        : 'text-md-on-surface-variant hover:bg-md-surface-container'
    }`

  return (
    <aside
      className={`
        fixed top-0 left-0 z-30 h-full w-64 flex flex-col transition-transform duration-300
        lg:static lg:translate-x-0 lg:z-auto lg:flex-shrink-0
        bg-md-surface-container-low
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Kollybry" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="text-base font-bold text-md-on-surface leading-tight">Kollybry</h1>
            {tenant && (
              <p className="text-xs text-md-on-surface-variant truncate max-w-[130px]" title={tenant.display_name || tenant.name}>
                {tenant.display_name || tenant.name}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-2 text-md-on-surface-variant hover:bg-md-surface-container rounded-full transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navLinks.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={handleNavClick}
            className={linkClass}
          >
            <Icon size={20} className="flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="pt-5 pb-1 px-4">
              <p className="text-xs font-semibold text-md-on-surface-variant/50 uppercase tracking-widest">
                Admin
              </p>
            </div>
            {adminLinks.map(({ to, icon: Icon, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                onClick={handleNavClick}
                className={linkClass}
              >
                <Icon size={20} className="flex-shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="px-3 pb-5 pt-3 border-t border-md-outline-variant">
        <div className="flex items-center gap-3 px-2 py-2 rounded-full hover:bg-md-surface-container transition-colors group">
          <div className="w-9 h-9 rounded-full bg-md-primary-container flex items-center justify-center font-semibold text-md-on-primary-container text-sm flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-md-on-surface truncate leading-tight">{displayName}</p>
            <p className="text-xs text-md-on-surface-variant truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="p-2 text-md-on-surface-variant hover:text-md-on-surface rounded-full transition-colors flex-shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
