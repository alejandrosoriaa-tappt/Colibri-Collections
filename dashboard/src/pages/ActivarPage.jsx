import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { activacionAPI } from '../lib/api.js'
import supabase from '../lib/supabase.js'

/**
 * El director define su correo y su contraseña.
 *
 * Solo se pide lo indispensable para entrar. Los datos fiscales y generales se
 * llenan después en Configuración: un formulario largo entre él y su primer
 * acceso hace que la mitad lo abandone a media captura, y ahí ya se gastó la
 * liga.
 */
export default function ActivarPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('t') || ''

  const [cargando, setCargando] = useState(true)
  const [datos, setDatos] = useState(null)      // { nombre_director, colegio }
  const [errorLiga, setErrorLiga] = useState(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [verPass, setVerPass] = useState(false)
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!token) { setErrorLiga('La liga está incompleta.'); setCargando(false); return }
    activacionAPI.verificar(token)
      .then(res => setDatos(res.data))
      .catch(err => setErrorLiga(err.response?.data?.error || 'No se pudo validar la liga.'))
      .finally(() => setCargando(false))
  }, [token])

  const enviar = async (e) => {
    e.preventDefault()
    setError(null)

    if (password.length < 10) {
      setError('La contraseña debe tener al menos 10 caracteres.')
      return
    }
    if (password !== password2) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setGuardando(true)
    try {
      await activacionAPI.activar({ token, email: email.trim(), password })
      // Ya con la cuenta creada, se inicia sesión de una vez: pedirle que
      // vuelva a teclear lo que acaba de escribir sería fricción gratuita.
      const { error: eLogin } = await supabase.auth.signInWithPassword({
        email: email.trim(), password
      })
      if (eLogin) {
        navigate('/login', { replace: true })
        return
      }
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo completar la activación.')
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-md-surface">
        <Loader2 size={28} className="animate-spin text-md-primary" />
      </div>
    )
  }

  if (errorLiga) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-md-surface p-4">
        <div className="bg-white rounded-3xl shadow-md3-2 p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-md-error-container flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={26} className="text-md-error" />
          </div>
          <h1 className="text-lg font-semibold text-md-on-surface">No pudimos abrir tu liga</h1>
          <p className="text-sm text-md-on-surface-variant mt-2">{errorLiga}</p>
          <p className="text-xs text-md-on-surface-variant mt-4">
            Escríbenos y te mandamos una nueva por WhatsApp.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-md-surface p-4">
      <div className="bg-white rounded-3xl shadow-md3-2 p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="Kollybry" className="w-14 h-14 object-contain mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-md-on-surface">
            Hola{datos?.nombre_director ? `, ${datos.nombre_director}` : ''} 👋
          </h1>
          <p className="text-sm text-md-on-surface-variant mt-1">
            Activa la cuenta de <strong>{datos?.colegio}</strong>
          </p>
        </div>

        <form onSubmit={enviar} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-md-error-container rounded-2xl text-sm text-md-on-error-container">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div>
            <label className="label">Tu correo</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="direccion@colegio.mx"
              required
              autoFocus
            />
            <p className="text-xs text-md-on-surface-variant mt-1">
              Con este correo vas a entrar a Kollybry.
            </p>
          </div>

          <div>
            <label className="label">Crea tu contraseña</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={verPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 10 caracteres"
                required
              />
              <button
                type="button"
                onClick={() => setVerPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-md-on-surface-variant"
              >
                {verPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Confírmala</label>
            <input
              className="input"
              type={verPass ? 'text' : 'password'}
              value={password2}
              onChange={e => setPassword2(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {guardando ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {guardando ? 'Activando…' : 'Activar mi cuenta'}
          </button>

          <p className="text-xs text-md-on-surface-variant text-center">
            Solo tú conoces esta contraseña. Kollybry no la guarda ni la puede ver.
          </p>
        </form>
      </div>
    </div>
  )
}
