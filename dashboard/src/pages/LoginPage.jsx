import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import useAuthStore from '../store/authStore.js'
import supabase from '../lib/supabase.js'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'reset'
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState(null)

  const { login, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    const result = await login(email, password)
    if (result.success) {
      navigate('/')
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (!email) { setResetError('Ingresa tu correo primero'); return }
    setResetLoading(true)
    setResetError(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error
      setResetSent(true)
    } catch (err) {
      setResetError(err.message || 'No se pudo enviar el correo')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-colibri-900 via-colibri-700 to-colibri-500 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-28 h-28 bg-white rounded-3xl shadow-lg mb-5">
            <img src="/logo.png" alt="Kollybry" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white">Kollybry</h1>
          <p className="text-white/70 text-sm mt-1">Comunicación automática por WhatsApp</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-md3-3 p-8">

          {mode === 'login' && (
            <>
              <h2 className="text-xl font-semibold text-md-on-surface mb-6">Iniciar sesión</h2>

              {error && (
                <div className="flex items-start gap-3 p-3 bg-md-error-container rounded-2xl mb-5">
                  <AlertCircle size={16} className="text-md-on-error-container flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-md-on-error-container">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Correo electrónico</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="tu@empresa.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="label">Contraseña</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full mt-2"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 size={16} className="animate-spin" />}
                  {isLoading ? 'Ingresando...' : 'Entrar'}
                </button>
              </form>

              {/* Forgot password */}
              <button
                onClick={() => { setMode('reset'); clearError() }}
                className="w-full text-center text-sm text-md-primary mt-4 hover:underline"
              >
                Olvidé mi contraseña
              </button>
            </>
          )}

          {mode === 'reset' && (
            <>
              <button
                onClick={() => { setMode('login'); setResetSent(false); setResetError(null) }}
                className="text-xs text-md-on-surface-variant hover:text-md-on-surface mb-4 flex items-center gap-1"
              >
                ← Volver
              </button>

              <h2 className="text-xl font-semibold text-md-on-surface mb-2">Recuperar contraseña</h2>
              <p className="text-sm text-md-on-surface-variant mb-5">
                Te enviaremos un enlace para crear una nueva contraseña.
              </p>

              {resetSent ? (
                <div className="flex items-start gap-3 p-4 bg-md-primary-container rounded-2xl">
                  <CheckCircle2 size={18} className="text-md-on-primary-container flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-md-on-primary-container">¡Correo enviado!</p>
                    <p className="text-sm text-md-on-primary-container/80 mt-0.5">
                      Revisa tu bandeja de entrada en <strong>{email}</strong> y sigue el enlace.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  {resetError && (
                    <div className="flex items-start gap-3 p-3 bg-md-error-container rounded-2xl">
                      <AlertCircle size={15} className="text-md-on-error-container flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-md-on-error-container">{resetError}</p>
                    </div>
                  )}
                  <div>
                    <label className="label">Correo electrónico</label>
                    <input
                      type="email"
                      className="input"
                      placeholder="tu@empresa.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-primary w-full"
                    disabled={resetLoading}
                  >
                    {resetLoading && <Loader2 size={16} className="animate-spin" />}
                    {resetLoading ? 'Enviando...' : 'Enviar enlace'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-2">
          <a
            href="https://wa.me/521XXXXXXXXXX?text=Hola%2C%20me%20interesa%20Kollybry"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-white/70 text-sm hover:text-white transition-colors"
          >
            ¿No tienes cuenta? Contáctanos →
          </a>
          <p className="text-white/40 text-xs">
            ¿Problemas? soporte@kollybry.com
          </p>
        </div>
      </div>
    </div>
  )
}
