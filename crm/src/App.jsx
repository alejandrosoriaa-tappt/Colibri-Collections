import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore.js'

import Layout from './components/Layout.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import LoginPage from './pages/LoginPage.jsx'
import CrmDashboardPage from './pages/CrmDashboardPage.jsx'
import CrmClientsPage from './pages/CrmClientsPage.jsx'
import CrmClientDetailPage from './pages/CrmClientDetailPage.jsx'

export default function App() {
  const initialize = useAuthStore(s => s.initialize)

  useEffect(() => {
    initialize()
  }, [])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<Layout />}>
            <Route path="/crm"             element={<CrmDashboardPage />} />
            <Route path="/crm/clients"     element={<CrmClientsPage />} />
            <Route path="/crm/clients/:id" element={<CrmClientDetailPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/crm" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
