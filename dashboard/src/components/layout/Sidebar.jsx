import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Settings,
  Shield,
  Building2,
  LogOut,
  X,
  Briefcase
} from 'lucide-react'
import useAuthStore from '../../store/authStore.js'
import { NAV_ITEMS, ROLE_LABELS } from '../../lib/permissions.js'

const ICONS = { LayoutDashboard, MessageSquare, Users, Settings, Briefcase }

const adminLinks = [
  { to: '/admin',         icon: Shield,    label: 'Panel Admin', exact: true },
  { to: '/admin/tenants', icon: Building2, label: 'Tenants' },
]

const ROLE_BADGE = {
  owner:   { bg: 'bg-md-primary-container',  text: 'text-md-on-primary-container' },
  billing: { bg: 'bg-amber-100',              text: 'text-amber-800' },
  comms:   { bg: 'bg-green-100',              text: 'text-green-800' },
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, tenant, isAdmin, tenantRole, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleNavClick = () => {
    if (window.innerWidth < 1024) onClose()
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'
  const initials    = displayName.charAt(0).toUpperCase()

  const linkClass = ({ isActive }) =>
    `flex items-center gap-4 px-4 py-3 rounded-full font-medium text-sm transition-colors duration-150 ${
      isActive
        ? 'bg-md-primary-container text-md-on-primary-container'
        : 'text-md-on-surface-variant hover:bg-md-surface-container'
    }`

  // Filter nav items for this role (admins see everything)
  const visibleNav = NAV_ITEMS.filter(item =>
    isAdmin || !tenantRole || item.roles.includes(tenantRole)
  )

  const roleBadge = tenantRole && tenantRole !== 'owner' ? ROLE_BADGE[tenantRole] : null
  const roleLabel = ROLE_LABELS[tenantRole] || ''

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
        {visibleNav.map(({ to, iconName, label, exact }) => {
          const Icon = ICONS[iconName]
          return (
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
          )
        })}

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
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-medium text-md-on-surface truncate leading-tight">{displayName}</p>
              {roleBadge && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${roleBadge.bg} ${roleBadge.text}`}>
                  {roleLabel}
                </span>
              )}
            </div>
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
