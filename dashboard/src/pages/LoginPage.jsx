import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, MessageSquareText, Zap, ShieldCheck } from 'lucide-react'
import useAuthStore from '../store/authStore.js'
import supabase from '../lib/supabase.js'

const FEATURES = [
  { icon: Zap,                text: 'Recordatorios automáticos de cobro' },
  { icon: MessageSquareText,  text: 'Comunicados masivos por WhatsApp' },
  { icon: ShieldCheck,        text: 'Gestión segura de contactos y grupos' },
]

export default function LoginPage() {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [mode, setMode]           = useState('login') // 'login' | 'reset'
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError]     = useState(null)

  const { login, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    const result = await login(email, password)
    if (result.success) navigate('/')
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
    <div className="min-h-screen flex bg-white">

      {/* ── Left branding panel (desktop only) ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-shrink-0 bg-md-primary flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute top-1/3 -left-16 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 right-8 w-56 h-56 rounded-full bg-white/5" />

        {/* Logo + name */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md3-2 flex-shrink-0">
              <img src="/logo.png" alt="Kollybry" className="w-8 h-8 object-contain" />
            </div>
            <span className="text-white text-xl font-bold tracking-tight">Kollybry</span>
          </div>

          <h2 className="text-white text-3xl font-bold leading-snug">
            Comunica con<br />tu comunidad
          </h2>
          <p className="text-white/60 text-base mt-3 leading-relaxed">
            Automatiza recordatorios y comunicados<br />por WhatsApp para toda tu organización.
          </p>

          {/* Feature list */}
          <div className="mt-10 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Icon size={15} className="text-white" />
                </div>
                <span className="text-white/80 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="relative z-10 text-white/30 text-xs">
          © {new Date().getFullYear()} Kollybry · Todos los derechos reservados
        </p>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-2 p-5 border-b border-md-outline-variant">
          <div className="w-8 h-8 bg-md-primary rounded-xl flex items-center justify-center">
            <img src="/logo.png" alt="Kollybry" className="w-5 h-5 object-contain" />
          </div>
          <span className="font-semibold text-md-on-surface">Kollybry</span>
        </div>

        {/* Form center */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">

            {/* ── Login mode ── */}
            {mode === 'login' && (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl font-semibold text-md-on-surface">Bienvenido</h1>
                  <p className="text-sm text-md-on-surface-variant mt-1">Ingresa tus credenciales para continuar</p>
                </div>

                {error && (
                  <div className="flex items-start gap-3 p-3.5 bg-md-error-container rounded-2xl mb-5">
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
                      placeholder="director@empresa.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoFocus
                      autoComplete="email"
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
                      autoComplete="current-password"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-primary w-full text-base py-3.5 mt-2"
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 size={16} className="animate-spin" />}
                    {isLoading ? 'Ingresando...' : 'Iniciar sesión'}
                  </button>
                </form>

                <button
                  onClick={() => { setMode('reset'); clearError() }}
                  className="w-full text-center text-sm text-md-primary mt-4 py-2 hover:bg-md-primary-container rounded-full transition-colors"
                >
                  Olvidé mi contraseña
                </button>
              </>
            )}

            {/* ── Reset mode ── */}
            {mode === 'reset' && (
              <>
                <button
                  onClick={() => { setMode('login'); setResetSent(false); setResetError(null) }}
                  className="flex items-center gap-1.5 text-sm text-md-on-surface-variant hover:text-md-on-surface mb-6 transition-colors"
                >
                  <ArrowLeft size={15} /> Volver al inicio de sesión
                </button>

                <div className="mb-7">
                  <h1 className="text-2xl font-semibold text-md-on-surface">Recuperar acceso</h1>
                  <p className="text-sm text-md-on-surface-variant mt-1">
                    Te enviaremos un enlace para crear una nueva contraseña.
                  </p>
                </div>

                {resetSent ? (
                  <div className="flex items-start gap-3 p-4 bg-md-primary-container rounded-2xl">
                    <CheckCircle2 size={18} className="text-md-on-primary-container flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-md-on-primary-container">¡Correo enviado!</p>
                      <p className="text-sm text-md-on-primary-container/80 mt-0.5">
                        Revisa tu bandeja de entrada en <strong>{email}</strong> y sigue el enlace para crear una nueva contraseña.
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleReset} className="space-y-4">
                    {resetError && (
                      <div className="flex items-start gap-3 p-3.5 bg-md-error-container rounded-2xl">
                        <AlertCircle size={15} className="text-md-on-error-container flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-md-on-error-container">{resetError}</p>
                      </div>
                    )}
                    <div>
                      <label className="label">Correo electrónico</label>
                      <input
                        type="email"
                        className="input"
                        placeholder="director@empresa.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        autoFocus
                        autoComplete="email"
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn-primary w-full text-base py-3.5"
                      disabled={resetLoading}
                    >
                      {resetLoading && <Loader2 size={16} className="animate-spin" />}
                      {resetLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                    </button>
                  </form>
                )}
              </>
            )}

            {/* Footer links */}
            <div className="mt-10 pt-6 border-t border-md-outline-variant text-center space-y-2">
              <a
                href="https://wa.me/5215512345678?text=Hola%2C%20me%20interesa%20Kollybry"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-md-on-surface-variant hover:text-md-primary transition-colors"
              >
                ¿No tienes cuenta? Contáctanos →
              </a>
              <p className="text-xs text-md-on-surface-variant/60">
                ¿Problemas? soporte@kollybry.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
