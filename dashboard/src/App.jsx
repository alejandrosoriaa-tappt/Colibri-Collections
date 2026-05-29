import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore.js'

import AppLayout from './components/layout/AppLayout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import CampaignsPage from './pages/CampaignsPage.jsx'
import CampaignDetailPage from './pages/CampaignDetailPage.jsx'
import UploadPage from './pages/UploadPage.jsx'
import ContactsPage from './pages/ContactsPage.jsx'
import MessagesPage from './pages/MessagesPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import BroadcastsPage from './pages/BroadcastsPage.jsx'
import MensajesPage from './pages/MensajesPage.jsx'
import AdminPage from './pages/admin/AdminPage.jsx'
import TenantsPage from './pages/admin/TenantsPage.jsx'

export default function App() {
  const initialize = useAuthStore(s => s.initialize)

  useEffect(() => {
    initialize()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/mensajes" element={<MensajesPage />} />
          <Route path="/broadcasts" element={<BroadcastsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route element={<AppLayout requireAdmin />}>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/tenants" element={<TenantsPage />} />
          <Route path="/admin/tenants/:id" element={<TenantsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
