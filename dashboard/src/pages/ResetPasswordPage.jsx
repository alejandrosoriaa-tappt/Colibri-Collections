import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import supabase from '../lib/supabase.js'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [showPwd, setShowPwd]       = useState(false)
  const [showCfm, setShowCfm]       = useState(false)
  const [isLoading, setIsLoading]   = useState(false)
  const [done, setDone]             = useState(false)
  const [error, setError]           = useState(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [isInvite, setIsInvite]     = useState(false)

  // Supabase puts the token in the URL hash on invite / recovery
  // We need to let the SDK parse it and set the session
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
          setSessionReady(true)
          setIsInvite(event === 'SIGNED_IN')
        }
      }
    )
    // Also check if there's already an active session (direct nav)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      setDone(true)
      setTimeout(() => navigate('/'), 2500)
    } catch (err) {
      setError(err.message || 'Ocurrió un error. Intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-md-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-md-primary flex items-center justify-center mb-4">
            <img src="/logo.png" alt="Kollybry" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-xl font-bold text-md-on-surface">Kollybry</h1>
          <p className="text-sm text-md-on-surface-variant mt-1">
            {isInvite ? 'Bienvenido — crea tu contraseña' : 'Establece tu nueva contraseña'}
          </p>
        </div>

        {done ? (
          <div className="card text-center py-10">
            <div className="w-14 h-14 rounded-full bg-md-primary-container flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-md-primary" />
            </div>
            <p className="font-semibold text-md-on-surface text-lg">¡Contraseña establecida!</p>
            <p className="text-sm text-md-on-surface-variant mt-2">
              Redirigiendo al dashboard…
            </p>
          </div>
        ) : !sessionReady ? (
          <div className="card text-center py-10">
            <Loader2 size={28} className="animate-spin text-md-primary mx-auto mb-3" />
            <p className="text-sm text-md-on-surface-variant">Verificando tu invitación…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <div>
              <p className="text-base font-semibold text-md-on-surface mb-1">
                {isInvite ? 'Crear contraseña' : 'Nueva contraseña'}
              </p>
              <p className="text-xs text-md-on-surface-variant">
                Mínimo 8 caracteres. Úsala para acceder a Kollybry.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-2xl">
                <AlertCircle size={15} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="label flex items-center gap-1.5">
                <Lock size={12} className="text-md-on-surface-variant" />
                Contraseña
              </label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-md-on-surface-variant hover:text-md-on-surface transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm */}
            <div>
              <label className="label">Confirmar contraseña</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showCfm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCfm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-md-on-surface-variant hover:text-md-on-surface transition-colors"
                >
                  {showCfm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full text-sm"
              disabled={isLoading}
            >
              {isLoading
                ? <><Loader2 size={14} className="animate-spin" /> Guardando…</>
                : isInvite ? 'Activar cuenta' : 'Guardar contraseña'
              }
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
