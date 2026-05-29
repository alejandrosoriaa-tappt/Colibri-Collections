import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'
import useAuthStore from '../../store/authStore.js'

export default function AppLayout({ requireAdmin = false }) {
  const { user, session, isAdmin, isLoading } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-md-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-md-on-surface-variant">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!session || !user) return <Navigate to="/login" replace />
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-md-surface flex">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(o => !o)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
