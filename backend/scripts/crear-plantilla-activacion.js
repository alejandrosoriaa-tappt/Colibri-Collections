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
 *   node scripts/crear-plantilla-activacion.js
 *
 * Cuando Meta la apruebe (suele ser rápido en UTILITY), agregar en Railway:
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

// UTILITY y no MARKETING: es transaccional —la persona no puede entrar sin
// esto—, se aprueba más fácil y no cuenta como promocional.
const PLANTILLA = {
  name: NOMBRE,
  language: 'es_MX',
  category: 'UTILITY',
  components: [
    {
      type: 'BODY',
      // Meta rechaza cuerpos que empiecen o terminen con variable, por eso el
      // "Hola" al principio y la advertencia al final.
      text:
        'Hola {{1}}, ya está lista la cuenta de {{2}} en Kollybry.\n\n' +
        'Entra aquí para crear tu acceso: {{3}}\n\n' +
        'La liga es personal y vence en 48 horas. Si no la pediste, ignora este mensaje.',
      example: {
        body_text: [['Marcela', 'Colegio Puerto Alto', 'https://app.kollybry.com/activar?t=abc123']]
      }
    }
  ]
}

function explicar(err) {
  const e = err.response?.data?.error
  if (!e) return err.message
  return [e.error_user_title, e.error_user_msg, e.message].filter(Boolean).join(' — ')
}

async function main() {
  if (!TOKEN || !WABA) {
    console.error('\n❌ Faltan WABA_ACCESS_TOKEN o WABA_BUSINESS_ACCOUNT_ID.')
    console.error('   Corre esto desde la consola de Railway, no en local.\n')
    process.exit(1)
  }

  try {
    const { data } = await axios.post(`${GRAPH}/${WABA}/message_templates`, PLANTILLA, {
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
    })

    console.log(`\n✅ Plantilla "${NOMBRE}" enviada a revisión.`)
    console.log(`   id: ${data.id}   ·   estado: ${data.status || 'PENDING'}`)
    console.log('\n   Cuando aparezca como aprobada, agrega en Railway:')
    console.log(`   KOLLYBRY_ACTIVACION_TEMPLATE=${NOMBRE}\n`)
  } catch (err) {
    const msg = explicar(err)
    if (/already exists/i.test(msg)) {
      console.log(`\nℹ  Ya existe una plantilla llamada "${NOMBRE}".`)
      console.log('   Revisa su estado en WhatsApp Manager. Si ya está aprobada,')
      console.log(`   solo agrega KOLLYBRY_ACTIVACION_TEMPLATE=${NOMBRE} en Railway.\n`)
      return
    }
    console.error(`\n❌ Meta la rechazó: ${msg}\n`)
    process.exit(1)
  }
}

main()
