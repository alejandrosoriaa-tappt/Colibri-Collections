import { useState } from 'react'
import { Loader2, AlertCircle, CheckCircle2, Copy, Check, Phone, PhoneCall, KeyRound } from 'lucide-react'
import { adminAPI } from '../../lib/api.js'

/**
 * Un paso del asistente.
 *
 * VA AFUERA del componente a propósito. Definido adentro, cada tecleo creaba
 * un tipo de componente nuevo: React desmontaba el bloque entero y lo volvía a
 * montar, así que el campo perdía el foco letra por letra y había que volver a
 * hacer click para escribir la siguiente.
 */
function Paso({ n, titulo, children, activo, pasoActual }) {
  return (
    <div className={activo ? '' : 'opacity-40 pointer-events-none'}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-5 h-5 rounded-full text-[11px] font-semibold flex items-center justify-center ${
          pasoActual > n ? 'bg-green-600 text-white'
                         : activo ? 'bg-md-primary text-white'
                                  : 'bg-md-outline-variant text-md-on-surface-variant'
        }`}>
          {pasoActual > n ? '✓' : n}
        </span>
        <p className="text-sm font-medium text-md-on-surface">{titulo}</p>
      </div>
      {activo && <div className="pl-7 space-y-2">{children}</div>}
    </div>
  )
}

/**
 * Da de alta el número de WhatsApp del colegio contra Meta, desde el panel.
 *
 * Son cuatro pasos y se muestran uno a la vez, porque entre el 2 y el 3 hay una
 * espera humana: el código llega al chip del colegio y el director lo dicta. Ese
 * es el único paso que no se automatiza.
 *
 * Al terminar avisa el phone_number_id hacia arriba, que es lo que se guarda en
 * el colegio como remitente.
 */
export default function AltaNumeroWhatsApp({ nombreSugerido = '', onListo }) {
  const [paso, setPaso] = useState(1)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const [cc, setCc] = useState('52')
  const [telefono, setTelefono] = useState('')
  const [nombreVisible, setNombreVisible] = useState(nombreSugerido)
  const [phoneId, setPhoneId] = useState('')
  const [codigo, setCodigo] = useState('')
  const [pin, setPin] = useState('')
  const [pinCopiado, setPinCopiado] = useState(false)
  const [ultimoMetodo, setUltimoMetodo] = useState('SMS')

  // Cada paso pide algo distinto a Meta, pero todos fallan igual: se muestra el
  // mensaje de Meta tal cual, que suele decir exactamente qué está mal.
  const correr = async (fn) => {
    setError(null)
    setCargando(true)
    try {
      return await fn()
    } catch (err) {
      setError(err.response?.data?.error || err.message)
      return null
    } finally {
      setCargando(false)
    }
  }

  const agregar = () => correr(async () => {
    const res = await adminAPI.numeros.agregar({
      cc,
      telefono,
      nombre_visible: nombreVisible.trim()
    })
    setPhoneId(res.data.phone_number_id)
    if (res.data.aviso) setError(res.data.aviso)
    setPaso(2)
  })

  // Meta manda el código por SMS o dictándolo en una llamada. La llamada es la
  // salida cuando el SMS no llega —pasa seguido con chips recién activados—.
  const pedirCodigo = (metodo = 'SMS') => correr(async () => {
    await adminAPI.numeros.codigo(phoneId, metodo)
    setUltimoMetodo(metodo)
    setPaso(3)
  })

  const verificar = () => correr(async () => {
    await adminAPI.numeros.verificar(phoneId, codigo)
    setPaso(4)
  })

  const registrar = () => correr(async () => {
    const res = await adminAPI.numeros.registrar(phoneId)
    setPin(res.data.pin)
    setPaso(5)
    onListo?.(phoneId)
  })

  return (
    <div className="rounded-2xl border border-md-outline-variant p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Phone size={15} className="text-md-primary" />
        <p className="text-sm font-semibold text-md-on-surface">Número propio del colegio</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-md-error-container rounded-2xl">
          <AlertCircle size={14} className="text-md-on-error-container flex-shrink-0 mt-0.5" />
          <p className="text-xs text-md-on-error-container">{error}</p>
        </div>
      )}

      <Paso n={1} titulo="Dar de alta el número en Meta" activo={paso === 1} pasoActual={paso}>
        <div className="flex gap-2">
          <input
            className="input w-16 text-center"
            value={cc}
            onChange={e => setCc(e.target.value.replace(/\D/g, ''))}
            placeholder="52"
          />
          <input
            className="input flex-1"
            value={telefono}
            onChange={e => setTelefono(e.target.value.replace(/\D/g, ''))}
            placeholder="4421234567"
          />
        </div>
        <input
          className="input"
          value={nombreVisible}
          onChange={e => setNombreVisible(e.target.value)}
          placeholder="Nombre que verán los papás"
        />
        <p className="text-xs text-md-on-surface-variant">
          Ese nombre aparece como remitente. Meta lo revisa después: si lo rechaza,
          se puede volver a proponer sin dar de alta el número otra vez.
        </p>
        <button
          type="button"
          onClick={agregar}
          disabled={cargando || !telefono || !nombreVisible.trim()}
          className="btn-tonal text-sm disabled:opacity-50 flex items-center gap-2"
        >
          {cargando && <Loader2 size={13} className="animate-spin" />} Dar de alta
        </button>
      </Paso>

      <Paso n={2} titulo="Pedir el código de verificación" activo={paso === 2} pasoActual={paso}>
        <p className="text-xs text-md-on-surface-variant">
          El código llega al chip del colegio. Ten al director en la línea antes de pedirlo,
          con el chip en un teléfono y a la mano: el código caduca en unos minutos.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => pedirCodigo('SMS')} disabled={cargando}
            className="btn-tonal text-sm disabled:opacity-50 flex items-center gap-2">
            {cargando && <Loader2 size={13} className="animate-spin" />} Enviar SMS
          </button>
          <button type="button" onClick={() => pedirCodigo('VOICE')} disabled={cargando}
            className="btn-outline text-sm disabled:opacity-50 flex items-center gap-2">
            <PhoneCall size={13} /> Por llamada
          </button>
        </div>
        <p className="text-xs text-md-on-surface-variant">
          Si el chip es nuevo, el SMS a veces no llega. La llamada sirve igual: Meta marca
          y dicta el código.
        </p>
      </Paso>

      <Paso n={3} titulo="Capturar el código que dicta el director" activo={paso === 3} pasoActual={paso}>
        <p className="text-xs text-md-on-surface-variant">
          {ultimoMetodo === 'VOICE'
            ? 'Meta va a marcar al número y dictar el código.'
            : 'El código llegó por SMS al chip del colegio.'}
        </p>
        <div className="flex gap-2">
          <input
            className="input flex-1 font-mono tracking-widest"
            value={codigo}
            onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 8))}
            placeholder="123456"
          />
          <button type="button" onClick={verificar} disabled={cargando || !codigo}
            className="btn-tonal text-sm disabled:opacity-50 flex items-center gap-2">
            {cargando && <Loader2 size={13} className="animate-spin" />} Verificar
          </button>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => pedirCodigo('SMS')} disabled={cargando}
            className="text-xs text-md-primary underline">
            No llegó — reenviar SMS
          </button>
          <button type="button" onClick={() => pedirCodigo('VOICE')} disabled={cargando}
            className="text-xs text-md-primary underline">
            Mejor por llamada
          </button>
        </div>
        <p className="text-xs text-md-on-surface-variant">
          Espera un minuto entre intentos: pedirlo muchas veces seguidas hace que Meta
          bloquee el número un rato.
        </p>
      </Paso>

      <Paso n={4} titulo="Dejarlo listo para enviar" activo={paso === 4} pasoActual={paso}>
        <p className="text-xs text-md-on-surface-variant">
          Se genera un PIN de seguridad del número. Te lo voy a mostrar una sola vez.
        </p>
        <button type="button" onClick={registrar} disabled={cargando}
          className="btn-primary text-sm disabled:opacity-50 flex items-center gap-2">
          {cargando && <Loader2 size={13} className="animate-spin" />} Registrar
        </button>
      </Paso>

      {paso === 5 && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 p-3 bg-md-primary-container rounded-2xl">
            <CheckCircle2 size={15} className="text-md-on-primary-container flex-shrink-0 mt-0.5" />
            <div className="text-xs text-md-on-primary-container">
              <p className="font-medium">El número ya puede enviar.</p>
              <p className="font-mono mt-1">{phoneId}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl border border-amber-300 bg-amber-50 space-y-2">
            <div className="flex items-center gap-2 text-amber-900">
              <KeyRound size={14} />
              <p className="text-xs font-semibold">Guarda este PIN en tu gestor de contraseñas</p>
            </div>
            <div className="flex gap-2">
              <input readOnly className="input flex-1 font-mono tracking-widest text-sm" value={pin} />
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(pin); setPinCopiado(true) }}
                className="btn-tonal text-xs px-3 flex items-center gap-1"
              >
                {pinCopiado ? <Check size={13} /> : <Copy size={13} />}
                {pinCopiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <p className="text-xs text-amber-900">
              No se guarda en Kollybry a propósito. Lo vas a necesitar si Meta pide
              reverificar el número, y si se pierde hay que reiniciar el proceso.
            </p>
          </div>

          <p className="text-xs text-md-on-surface-variant">
            Recuérdale al colegio: ese chip nunca se pone en un teléfono con WhatsApp
            instalado, y si se vence la recarga la compañía recicla el número.
          </p>
        </div>
      )}
    </div>
  )
}
