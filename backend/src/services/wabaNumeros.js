/**
 * Alta de números de colegio en la WABA de Kollybry, por la Graph API.
 *
 * Todo el flujo de Meta es API menos una cosa: el SMS de verificación llega al
 * chip físico del colegio. Ese código lo teclea el admin en el panel cuando el
 * director se lo dicta.
 *
 * Estas funciones NO hablan con la base: solo con Meta. Quien las llama
 * (routes/admin.js) es el que decide qué guardar en `waba_numeros`.
 */
import axios from 'axios'

const GRAPH = 'https://graph.facebook.com/v20.0'

const token = () => process.env.WABA_ACCESS_TOKEN
// El repo usa los dos nombres según el script; se aceptan ambos para no tener
// que duplicar la variable en Railway.
const waba = () =>
  process.env.WABA_BUSINESS_ID || process.env.WABA_BUSINESS_ACCOUNT_ID

function auth() {
  return { headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' } }
}

/**
 * Meta manda dos mensajes de error: uno técnico y uno para el usuario. El de
 * usuario es el que sirve ("este número ya está en otra cuenta"), así que se
 * arma la explicación con lo que haya, en ese orden.
 */
function explicar(err) {
  const e = err.response?.data?.error
  if (!e) return err.message || 'Error desconocido'

  // "(#200) Permissions error" es de los mensajes más inútiles de Meta: no dice
  // qué permiso falta. En la práctica siempre es lo mismo — el token sirve para
  // ENVIAR mensajes pero no para ADMINISTRAR la cuenta, que es otro permiso.
  if (e.code === 200) {
    return 'Meta rechazó la operación por permisos (#200). El WABA_ACCESS_TOKEN ' +
           'probablemente solo tiene "whatsapp_business_messaging" (enviar mensajes) ' +
           'y para dar de alta números hace falta también "whatsapp_business_management". ' +
           'Genera un token con los dos permisos y reemplázalo en Railway.'
  }

  return [e.error_user_title, e.error_user_msg, e.message].filter(Boolean).join(' — ')
}

class ErrorMeta extends Error {
  constructor(err) {
    super(explicar(err))
    this.name = 'ErrorMeta'
    // 400 y no 500: casi siempre es un dato mal capturado, no una falla nuestra.
    this.status = 400
  }
}

export function credencialesListas() {
  return !!(token() && waba())
}

/**
 * Paso 1 — agrega el número a la WABA con el nombre que verán los papás.
 * Meta acepta el nombre de entrada y lo revisa después: `name_status` queda en
 * PENDING_REVIEW hasta que resuelvan.
 */
export async function agregarNumero({ cc = '52', telefono, nombreVisible }) {
  try {
    const { data } = await axios.post(
      `${GRAPH}/${waba()}/phone_numbers`,
      { cc: String(cc), phone_number: String(telefono), verified_name: nombreVisible },
      auth()
    )
    return { phone_number_id: data.id }
  } catch (err) {
    throw new ErrorMeta(err)
  }
}

/** Paso 2 — el código sale al chip del colegio. */
export async function pedirCodigo({ phoneNumberId, metodo = 'SMS' }) {
  try {
    await axios.post(
      `${GRAPH}/${phoneNumberId}/request_code`,
      { code_method: String(metodo).toUpperCase(), language: 'es_MX' },
      auth()
    )
    return { enviado: true }
  } catch (err) {
    throw new ErrorMeta(err)
  }
}

/** Paso 3 — el director dicta el código y aquí se confirma. */
export async function verificarCodigo({ phoneNumberId, codigo }) {
  try {
    await axios.post(`${GRAPH}/${phoneNumberId}/verify_code`, { code: String(codigo) }, auth())
    return { verificado: true }
  } catch (err) {
    throw new ErrorMeta(err)
  }
}

/**
 * Paso 4 — registra el número en Cloud API. A partir de aquí ya puede enviar.
 *
 * El PIN es de dos factores del número: Meta lo pide si algún día hay que
 * reverificar. Se genera aquí al azar y se devuelve UNA sola vez para que el
 * admin lo guarde en su gestor de contraseñas; a propósito no se guarda en la
 * base, porque quien lea la base no debe poder mover el número.
 */
export async function registrarNumero({ phoneNumberId, pin }) {
  try {
    await axios.post(
      `${GRAPH}/${phoneNumberId}/register`,
      { messaging_product: 'whatsapp', pin: String(pin) },
      auth()
    )
    return { registrado: true }
  } catch (err) {
    throw new ErrorMeta(err)
  }
}

/** Estado de un número: nombre aprobado o no, calidad, si ya está registrado. */
export async function estadoNumero(phoneNumberId) {
  try {
    const { data } = await axios.get(`${GRAPH}/${phoneNumberId}`, {
      params: {
        fields: 'id,display_phone_number,verified_name,name_status,quality_rating,code_verification_status,platform_type',
        access_token: token()
      }
    })
    return data
  } catch (err) {
    throw new ErrorMeta(err)
  }
}

/** Todos los números de la WABA, para cotejar contra lo que tenemos en base. */
export async function listarNumeros() {
  try {
    const { data } = await axios.get(`${GRAPH}/${waba()}/phone_numbers`, {
      params: {
        fields: 'id,display_phone_number,verified_name,name_status,quality_rating,code_verification_status',
        access_token: token()
      }
    })
    return data.data || []
  } catch (err) {
    throw new ErrorMeta(err)
  }
}
