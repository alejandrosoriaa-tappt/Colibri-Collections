import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, LogOut, Sprout } from 'lucide-react'
import useAuthStore from '../store/authStore.js'

export default function Layout() {
  const { user, session, isLoading, logout } = useAuthStore()
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-crm-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-crm-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-crm-on-surface-variant">Cargando…</p>
        </div>
      </div>
    )
  }

  if (!session || !user) return <Navigate to="/login" replace />

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'

  const navClass = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
      isActive
        ? 'bg-crm-primary text-crm-on-primary shadow-md3-1'
        : 'text-crm-on-surface-variant hover:bg-crm-surface-container'
    }`

  return (
    <div className="min-h-screen bg-crm-surface flex flex-col">

      {/* Header — estilo landing nkuvo.com */}
      <header className="bg-crm-primary-container/40 border-b border-crm-outline-variant/50 sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-crm-on-surface flex items-center justify-center">
              <Sprout size={18} className="text-crm-primary-container" />
            </div>
            <div className="leading-tight">
              <span className="font-bold text-crm-on-surface">NKUVO</span>{' '}
              <span className="font-bold text-crm-primary">CRM</span>
              <p className="text-[10px] text-crm-on-surface-variant -mt-0.5 hidden sm:block">
                Ideas que toman forma
              </p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1.5">
            <NavLink to="/crm" end className={navClass}>
              <LayoutDashboard size={15} />
              <span className="hidden sm:inline">Inicio</span>
            </NavLink>
            <NavLink to="/crm/clients" className={navClass}>
              <Users size={15} />
              <span className="hidden sm:inline">Clientes</span>
            </NavLink>
          </nav>

          {/* User */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden md:block text-right leading-tight">
              <p className="text-sm font-medium text-crm-on-surface">{displayName}</p>
              <p className="text-[11px] text-crm-on-surface-variant">{user?.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-crm-secondary-container flex items-center justify-center font-semibold text-crm-on-secondary-container text-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-2 text-crm-on-surface-variant hover:text-crm-on-surface hover:bg-crm-surface-container rounded-full transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 lg:p-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="py-4 text-center">
        <p className="text-xs text-crm-on-surface-variant/60">
          NKUVO CRM · Una iniciativa de NKUVO IDEAS SAS DE CV
        </p>
      </footer>
    </div>
  )
}
