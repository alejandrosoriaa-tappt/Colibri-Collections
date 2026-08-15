/**
 * Manda a aprobación la plantilla de activación de cuenta.
 *
 * Es la que lleva la liga con la que el director —y luego su equipo— crea su
 * contraseña. Sin ella el alta funciona igual, pero la liga hay que copiarla
 * del panel y mandarla a mano.
 *
 * SE CORRE DESDE LA CONSOLA DE RAILWAY (servicio kollybry-api), que es donde
 * viven WABA_ACCESS_TOKEN y la salida a graph.facebook.com:
 *
 *   node scripts/crear-plantilla-activacion.js            # crear / recrear
 *   node scripts/crear-plantilla-activacion.js estado     # ver por qué la rechazaron
 *
 * Cuando Meta la apruebe, agregar en Railway:
 *   KOLLYBRY_ACTIVACION_TEMPLATE=kollybry_activacion
 */
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const GRAPH = 'https://graph.facebook.com/v20.0'
const TOKEN = process.env.WABA_ACCESS_TOKEN
// En Railway la variable se llama WABA_BUSINESS_ACCOUNT_ID; se aceptan ambos
// nombres porque los scripts del repo no se pusieron de acuerdo.
const WABA = process.env.WABA_BUSINESS_ID || process.env.WABA_BUSINESS_ACCOUNT_ID

const NOMBRE = 'kollybry_activacion'
const IDIOMA = 'es_MX'

// La liga va en un BOTÓN, no en el texto.
//
// El primer intento la puso como variable dentro del cuerpo ({{3}} = la URL
// completa) y Meta la rechazó al instante. Su revisión automática castiga las
// plantillas que arman ligas con variables en el texto: es el patrón del
// phishing. La forma sancionada es un botón de URL con parte dinámica, donde
// el dominio es fijo y lo único variable es el token que se le pega al final.
//
// OJO: el dominio del botón queda CONGELADO en la plantilla aprobada. Si algún
// día cambia FRONTEND_URL, hay que crear la plantilla otra vez.
const BASE = 'https://app.kollybry.com/activar'

const PLANTILLA = {
  name: NOMBRE,
  language: IDIOMA,
  // UTILITY y no MARKETING: es transaccional —la persona no puede entrar sin
  // esto—, se aprueba más fácil y no cuenta como promocional.
  category: 'UTILITY',
  components: [
    {
      type: 'BODY',
      // Meta rechaza cuerpos que empiecen o terminen con variable, por eso el
      // "Hola" al principio y la frase de cierre al final.
      text:
        'Hola {{1}}, ya está lista la cuenta de {{2}} en Kollybry.\n\n' +
        'Toca el botón para crear tu usuario y tu contraseña.\n\n' +
        'Es personal y vence en 48 horas. Si no la pediste, ignora este mensaje.',
      example: { body_text: [['Marcela', 'Colegio Puerto Alto']] }
    },
    {
      type: 'BUTTONS',
      buttons: [
        {
          type: 'URL',
          text: 'Crear mi acceso',
          url: `${BASE}?t={{1}}`,
          example: [`${BASE}?t=abc123def456`]
        }
      ]
    }
  ]
}

const auth = { headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' } }

function explicar(err) {
  const e = err.response?.data?.error
  if (!e) return err.message
  return [e.error_user_title, e.error_user_msg, e.message].filter(Boolean).join(' — ')
}

/** Lo que Meta reporta de la plantilla: estado y, si la rechazó, el motivo. */
async function consultar() {
  const { data } = await axios.get(`${GRAPH}/${WABA}/message_templates`, {
    params: { name: NOMBRE, fields: 'id,name,status,category,rejected_reason,quality_score', access_token: TOKEN }
  })
  return data.data || []
}

async function estado() {
  const encontradas = await consultar()
  if (!encontradas.length) {
    console.log(`\nNo existe ninguna plantilla llamada "${NOMBRE}".\n`)
    return
  }
  for (const p of encontradas) {
    console.log(`\n  ${p.name} (${p.id})`)
    console.log(`  estado: ${p.status}   ·   categoría: ${p.category}`)
    if (p.rejected_reason && p.rejected_reason !== 'NONE') {
      console.log(`  motivo del rechazo: ${p.rejected_reason}`)
    }
  }
  console.log('')
}

async function crear() {
  // Una plantilla rechazada ocupa el nombre. Se borra antes de recrear, si no
  // Meta responde "already exists" y no hay forma de reintentar.
  const previas = await consultar()
  if (previas.length) {
    const rechazadas = previas.filter(p => p.status === 'REJECTED')
    const aprobada = previas.find(p => p.status === 'APPROVED')

    if (aprobada) {
      console.log(`\n✅ "${NOMBRE}" ya está APROBADA. No hay nada que mandar.`)
      console.log(`   Agrega en Railway: KOLLYBRY_ACTIVACION_TEMPLATE=${NOMBRE}\n`)
      return
    }
    if (rechazadas.length) {
      console.log(`\nBorrando la versión rechazada para poder reintentar…`)
      await axios.delete(`${GRAPH}/${WABA}/message_templates`, {
        params: { name: NOMBRE, access_token: TOKEN }
      })
    }
  }

  const { data } = await axios.post(`${GRAPH}/${WABA}/message_templates`, PLANTILLA, auth)

  // Meta puede rechazarla en el mismo instante de crearla. Antes este script
  // imprimía "enviada a revisión" solo porque le devolvieron un id, y eso es
  // reportar un éxito que no pasó.
  const estadoReal = data.status || 'PENDING'
  if (estadoReal === 'REJECTED') {
    console.error(`\n❌ Meta la rechazó de inmediato (id ${data.id}).`)
    console.error(`   Corre esto para ver el motivo:\n   node scripts/crear-plantilla-activacion.js estado\n`)
    process.exit(1)
  }

  console.log(`\n✅ Plantilla "${NOMBRE}" enviada a revisión.`)
  console.log(`   id: ${data.id}   ·   estado: ${estadoReal}`)
  console.log('\n   Revisa en un rato con:')
  console.log('   node scripts/crear-plantilla-activacion.js estado')
  console.log('\n   Cuando diga APPROVED, agrega en Railway:')
  console.log(`   KOLLYBRY_ACTIVACION_TEMPLATE=${NOMBRE}\n`)
}

async function main() {
  if (!TOKEN || !WABA) {
    console.error('\n❌ Faltan WABA_ACCESS_TOKEN o WABA_BUSINESS_ACCOUNT_ID.')
    console.error('   Corre esto desde la consola de Railway, no en local.\n')
    process.exit(1)
  }

  try {
    if (process.argv[2] === 'estado') await estado()
    else await crear()
  } catch (err) {
    console.error(`\n❌ ${explicar(err)}\n`)
    process.exit(1)
  }
}

main()
