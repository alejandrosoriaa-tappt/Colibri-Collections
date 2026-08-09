/**
 * Alta de un número de colegio en la WABA de Kollybry, por API.
 *
 * Todo el flujo se puede hacer por la Graph API MENOS recibir el SMS de
 * verificación, que llega al chip físico del colegio. Ese es el único paso
 * manual: el director dicta el código por teléfono.
 *
 * Se corre DESDE RAILWAY (servicio del backend), donde WABA_ACCESS_TOKEN ya
 * está configurado y hay salida a graph.facebook.com.
 *
 *   # 1. Agregar el número a la WABA (aquí se pide el nombre visible)
 *   node scripts/alta-numero-colegio.js agregar --cc 52 --tel 4421234567 \
 *        --nombre "Colegio Las Américas"
 *
 *   # 2. Pedir el código (llega por SMS al chip del colegio)
 *   node scripts/alta-numero-colegio.js codigo --id <PHONE_NUMBER_ID>
 *
 *   # 3. Verificar con el código que dicta el director
 *   node scripts/alta-numero-colegio.js verificar --id <PHONE_NUMBER_ID> --codigo 123456
 *
 *   # 4. Registrar en Cloud API (el PIN lo eliges tú: guárdalo)
 *   node scripts/alta-numero-colegio.js registrar --id <PHONE_NUMBER_ID> --pin 123456
 *
 *   # Ver el estado de todos los números de la WABA
 *   node scripts/alta-numero-colegio.js listar
 *
 * Después, el PHONE_NUMBER_ID se pega en el alta del colegio en el panel de
 * Admin, y ese colegio ya envía desde su propio número.
 */
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const GRAPH = 'https://graph.facebook.com/v20.0'
const TOKEN = process.env.WABA_ACCESS_TOKEN
// Misma WABA documentada en whatsappTemplates.js
// Los scripts del repo usan indistintamente los dos nombres; se aceptan ambos
// para no obligar a duplicar la variable en Railway.
const WABA = process.env.WABA_BUSINESS_ID || process.env.WABA_BUSINESS_ACCOUNT_ID || '948092824711194'

const args = process.argv.slice(2)
const accion = args[0]
const opt = (nombre) => {
  const i = args.indexOf(`--${nombre}`)
  return i === -1 ? null : args[i + 1]
}

const auth = { headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' } }

function salir(msg, codigo = 1) {
  console.error(`\n❌ ${msg}\n`)
  process.exit(codigo)
}

function explicar(err) {
  const e = err.response?.data?.error
  if (!e) return err.message
  // El mensaje de usuario de Meta suele ser el útil; el técnico es genérico.
  return [e.error_user_title, e.error_user_msg, e.message].filter(Boolean).join(' — ')
}

async function agregar() {
  const cc = opt('cc') || '52'
  const tel = opt('tel')
  const nombre = opt('nombre')
  if (!tel || !nombre) salir('Faltan --tel y --nombre. Ej: --cc 52 --tel 4421234567 --nombre "Colegio Las Américas"')

  console.log(`\nAgregando +${cc} ${tel} como "${nombre}"…`)
  try {
    const { data } = await axios.post(
      `${GRAPH}/${WABA}/phone_numbers`,
      { cc, phone_number: tel, verified_name: nombre },
      auth
    )
    console.log(`\n✅ Número agregado.`)
    console.log(`   PHONE_NUMBER_ID: ${data.id}`)
    console.log(`\n   Guarda ese id: es el que se pega en el alta del colegio.`)
    console.log(`   Siguiente paso:\n   node scripts/alta-numero-colegio.js codigo --id ${data.id}\n`)
  } catch (err) {
    salir(`Meta rechazó el alta: ${explicar(err)}`)
  }
}

async function pedirCodigo() {
  const id = opt('id')
  const metodo = (opt('metodo') || 'SMS').toUpperCase()
  if (!id) salir('Falta --id (el PHONE_NUMBER_ID)')

  try {
    await axios.post(`${GRAPH}/${id}/request_code`, { code_method: metodo, language: 'es_MX' }, auth)
    console.log(`\n✅ Código enviado por ${metodo} al chip del colegio.`)
    console.log(`   Pídeselo al director y verifica:\n   node scripts/alta-numero-colegio.js verificar --id ${id} --codigo XXXXXX\n`)
  } catch (err) {
    salir(`No se pudo pedir el código: ${explicar(err)}`)
  }
}

async function verificar() {
  const id = opt('id')
  const codigo = opt('codigo')
  if (!id || !codigo) salir('Faltan --id y --codigo')

  try {
    await axios.post(`${GRAPH}/${id}/verify_code`, { code: String(codigo) }, auth)
    console.log(`\n✅ Número verificado.`)
    console.log(`   Último paso — elige un PIN de 6 dígitos y GUÁRDALO en tu gestor de contraseñas:`)
    console.log(`   node scripts/alta-numero-colegio.js registrar --id ${id} --pin 123456\n`)
  } catch (err) {
    salir(`Código incorrecto o vencido: ${explicar(err)}`)
  }
}

async function registrar() {
  const id = opt('id')
  const pin = opt('pin')
  if (!id || !/^\d{6}$/.test(pin || '')) salir('Faltan --id y --pin (6 dígitos)')

  try {
    await axios.post(`${GRAPH}/${id}/register`, { messaging_product: 'whatsapp', pin }, auth)
    console.log(`\n✅ Número registrado en Cloud API. Ya puede enviar.`)
    console.log(`\n   1. Guarda el PIN ${pin} en tu gestor de contraseñas: lo vas a necesitar si hay que reverificar.`)
    console.log(`   2. Pega este PHONE_NUMBER_ID en el alta del colegio: ${id}`)
    console.log(`   3. Recuérdale al colegio: ese chip NUNCA se pone en un teléfono con WhatsApp,`)
    console.log(`      y si se vence la recarga el número se pierde para siempre.\n`)
  } catch (err) {
    salir(`No se pudo registrar: ${explicar(err)}`)
  }
}

async function listar() {
  try {
    const { data } = await axios.get(
      `${GRAPH}/${WABA}/phone_numbers`,
      { params: { fields: 'id,display_phone_number,verified_name,name_status,quality_rating,platform_type', access_token: TOKEN } }
    )
    const nums = data.data || []
    if (!nums.length) return console.log('\nNo hay números en esta WABA.\n')

    console.log(`\nNúmeros en la WABA ${WABA}:\n`)
    for (const n of nums) {
      console.log(`  ${n.display_phone_number}  —  ${n.verified_name || '(sin nombre)'}`)
      console.log(`     id: ${n.id}`)
      console.log(`     nombre: ${n.name_status || '?'} · calidad: ${n.quality_rating || 'sin datos'}\n`)
    }
  } catch (err) {
    salir(`No se pudo consultar: ${explicar(err)}`)
  }
}

if (!TOKEN) {
  salir('Falta WABA_ACCESS_TOKEN.\n   Si lo corres desde Railway ya debería estar puesto.')
}

const acciones = { agregar, codigo: pedirCodigo, verificar, registrar, listar }
if (!acciones[accion]) {
  console.log('\nAcciones: agregar · codigo · verificar · registrar · listar')
  console.log('Lee el encabezado del archivo para los ejemplos completos.\n')
  process.exit(2)
}
acciones[accion]()
