import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import useAuthStore from './store/authStore.js'
import { canAccess } from './lib/permissions.js'

import AppLayout from './components/layout/AppLayout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ContactsPage from './pages/ContactsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import BroadcastsPage from './pages/BroadcastsPage.jsx'
import MensajesPage from './pages/MensajesPage.jsx'
import AdminPage from './pages/admin/AdminPage.jsx'
import TenantsPage from './pages/admin/TenantsPage.jsx'

/**
 * Redirects to "/" if the current user's role doesn't allow this route.
 * Admins bypass all role checks.
 */
function RoleRoute({ children }) {
  const { tenantRole, isAdmin, isLoading } = useAuthStore()
  const { pathname } = useLocation()

  // Still initializing — let AppLayout handle the loading state
  if (isLoading) return null

  // Admins always pass
  if (isAdmin) return children

  if (!canAccess(tenantRole, pathname)) {
    return <Navigate to="/" replace />
  }

  return children
}

export default function App() {
  const initialize = useAuthStore(s => s.initialize)

  useEffect(() => {
    initialize()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<AppLayout />}>
          {/* Accessible by all roles */}
          <Route path="/"            element={<DashboardPage />} />
          {/* Dos productos sobre el mismo motor de difusión: Mensajes va a
              salones/grupos concretos, Comunicados va a toda la comunidad. */}
          <Route path="/mensajes"    element={<MensajesPage modo="grupos" />} />
          <Route path="/comunicados" element={<MensajesPage modo="general" />} />
          {/* Compositor compartido; no aparece en el menú */}
          <Route path="/broadcasts"  element={<BroadcastsPage />} />

          {/* contactos + owner */}
          <Route path="/contacts"        element={<RoleRoute><ContactsPage /></RoleRoute>} />

          {/* owner only */}
          <Route path="/settings"        element={<RoleRoute><SettingsPage /></RoleRoute>} />
        </Route>

        <Route element={<AppLayout requireAdmin />}>
          <Route path="/admin"                element={<AdminPage />} />
          <Route path="/admin/tenants"        element={<TenantsPage />} />
          <Route path="/admin/tenants/:id"    element={<TenantsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
