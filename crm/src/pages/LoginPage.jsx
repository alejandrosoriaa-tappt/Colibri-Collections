import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Sprout, Mail, Lock, ArrowRight } from 'lucide-react'
import useAuthStore from '../store/authStore.js'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

export default function LoginPage() {
  const { session, login, loginWithGoogle, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

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

  async function handleGoogle() {
    setGoogleLoading(true)
    await loginWithGoogle()
    // Supabase redirects to Google — page will reload on return
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

          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 border border-crm-outline-variant bg-white hover:bg-crm-surface-container-low py-3 rounded-full text-sm font-medium text-crm-on-surface shadow-md3-1 hover:shadow-md3-2 transition-all disabled:opacity-60 mb-5"
          >
            {googleLoading
              ? <div className="w-4 h-4 border-2 border-crm-outline border-t-transparent rounded-full animate-spin" />
              : <GoogleIcon />
            }
            Continuar con Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-crm-outline-variant" />
            <span className="text-xs text-crm-on-surface-variant">o con contraseña</span>
            <div className="flex-1 h-px bg-crm-outline-variant" />
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
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-crm-outline-variant bg-crm-surface text-sm text-crm-on-surface focus:outline-none focus:border-crm-primary focus:ring-1 focus:ring-crm-primary transition-colors"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-crm-error bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || (!email && !password)}
              className="w-full flex items-center justify-center gap-2 bg-crm-primary text-crm-on-primary py-3 rounded-full font-medium text-sm shadow-md3-1 hover:shadow-md3-2 transition-all disabled:opacity-60"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Entrar <ArrowRight size={15} /></>
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
