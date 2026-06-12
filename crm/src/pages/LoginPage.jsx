import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Sprout, Mail, Lock, ArrowRight } from 'lucide-react'
import useAuthStore from '../store/authStore.js'

export default function LoginPage() {
  const { session, login, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (session && !isLoading) return <Navigate to="/crm" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const result = await login(email, password)
    setSubmitting(false)
    if (result.success) {
      navigate('/crm')
    } else {
      setError('Correo o contraseña incorrectos')
    }
  }

  return (
    <div className="min-h-screen bg-crm-surface flex flex-col items-center justify-center p-4">

      {/* Halo verde como la landing */}
      <div className="relative w-full max-w-sm">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-crm-primary-container/50 rounded-full blur-3xl pointer-events-none" />

        <div className="relative bg-white rounded-4xl shadow-md3-2 border border-crm-outline-variant/40 p-8">

          {/* Brand */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-crm-on-surface flex items-center justify-center mb-3 shadow-md3-2">
              <Sprout size={26} className="text-crm-primary-container" />
            </div>
            <h1 className="text-xl font-bold text-crm-on-surface">
              NKUVO <span className="text-crm-primary">CRM</span>
            </h1>
            <p className="text-xs text-crm-on-surface-variant mt-1">Ideas que toman forma</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-crm-on-surface-variant mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-crm-on-surface-variant" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-crm-outline-variant bg-crm-surface text-sm text-crm-on-surface focus:outline-none focus:border-crm-primary focus:ring-1 focus:ring-crm-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-crm-on-surface-variant mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-crm-on-surface-variant" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-crm-outline-variant bg-crm-surface text-sm text-crm-on-surface focus:outline-none focus:border-crm-primary focus:ring-1 focus:ring-crm-primary transition-colors"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-crm-error bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-crm-primary text-crm-on-primary py-3 rounded-full font-medium text-sm shadow-md3-1 hover:shadow-md3-2 transition-all disabled:opacity-60"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Entrar <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-crm-on-surface-variant/60 mt-6">
          Una iniciativa de NKUVO IDEAS SAS DE CV
        </p>
      </div>
    </div>
  )
}
