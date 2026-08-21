/**
 * Manda a aprobación la plantilla de bienvenida de inicio de ciclo.
 *
 * Es el primer WhatsApp que recibe una familia desde el número de su colegio.
 *
 * A diferencia de la de comunicados, esta lleva el texto CERRADO: lo único
 * variable es el nombre del colegio. Eso importa para la clasificación —
 * kollybry_comunicado_util tiene un {{2}} donde cabe cualquier cosa, y Meta lo
 * leyó como promocional y la sacó de Utilidad. Un texto fijo y operativo no
 * tiene ese problema.
 *
 * Y aunque Meta la ponga en marketing, se manda UNA sola vez por familia, así
 * que el tope de frecuencia no le pega.
 *
 * SE CORRE DESDE LA CONSOLA DE RAILWAY (servicio kollybry-api):
 *
 *   node scripts/crear-plantilla-bienvenida.js            # crear
 *   node scripts/crear-plantilla-bienvenida.js estado     # ver cómo va
 */
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const GRAPH = 'https://graph.facebook.com/v20.0'
const TOKEN = process.env.WABA_ACCESS_TOKEN
const WABA = process.env.WABA_BUSINESS_ID || process.env.WABA_BUSINESS_ACCOUNT_ID || '948092824711194'

const NOMBRE = 'kollybry_bienvenida_ciclo'
const IDIOMA = 'es_MX'

// {{1}} = nombre del colegio. No hay más variables a propósito.
const PLANTILLA = {
  name: NOMBRE,
  language: IDIOMA,
  category: 'UTILITY',
  components: [
    {
      type: 'BODY',
      text:
        'Buen día, te informa *{{1}}*.\n\n' +
        'A partir de hoy este número es el canal oficial de comunicación del colegio ' +
        'con las familias. Por este medio recibirás avisos, comunicados y recordatorios.\n\n' +
        'Te pedimos guardarlo en tus contactos para asegurar la recepción de los mensajes.\n\n' +
        'Este mensaje ha sido enviado desde un servidor automático, por lo que no admite respuestas. ' +
        'Para cualquier consulta o aclaración, favor de comunicarse directamente con las oficinas del colegio.',
      example: { body_text: [['Puerto Alto Montessori']] }
    },
    {
      type: 'FOOTER',
      text: 'Mensaje enviado con la plataforma Kollybry'
    }
  ]
}

const auth = { headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' } }

function explicar(err) {
  const e = err.response?.data?.error
  if (!e) return err.message
  return [e.error_user_title, e.error_user_msg, e.message].filter(Boolean).join(' — ')
}

async function consultar() {
  const { data } = await axios.get(`${GRAPH}/${WABA}/message_templates`, {
    params: { name: NOMBRE, fields: 'id,name,status,category,rejected_reason', access_token: TOKEN }
  })
  return data.data || []
}

async function estado() {
  const encontradas = await consultar()
  if (!encontradas.length) return console.log(`\nNo existe "${NOMBRE}".\n`)
  for (const p of encontradas) {
    console.log(`\n  ${p.name} (${p.id})`)
    console.log(`  estado: ${p.status} · categoría: ${p.category}`)
    if (p.rejected_reason && p.rejected_reason !== 'NONE') {
      console.log(`  motivo del rechazo: ${p.rejected_reason}`)
    }
  }
  console.log('')
}

async function crear() {
  const previas = await consultar()
  const aprobada = previas.find(p => p.status === 'APPROVED')
  if (aprobada) {
    console.log(`\n✅ "${NOMBRE}" ya está APROBADA (categoría ${aprobada.category}).`)
    console.log(`   Agrega en Railway: KOLLYBRY_BIENVENIDA_TEMPLATE=${NOMBRE}\n`)
    return
  }
  if (previas.some(p => p.status === 'REJECTED')) {
    console.log('\nBorrando la versión rechazada para reintentar…')
    await axios.delete(`${GRAPH}/${WABA}/message_templates`, { params: { name: NOMBRE, access_token: TOKEN } })
  }

  console.log('\nTexto que va a quedar:')
  console.log('─'.repeat(60))
  console.log(PLANTILLA.components[0].text)
  console.log('─'.repeat(60))

  const { data } = await axios.post(`${GRAPH}/${WABA}/message_templates`, PLANTILLA, auth)

  // Meta puede rechazarla en el mismo instante de crearla; leer el status y no
  // el id es lo que distingue "enviada" de "rechazada".
  const estadoReal = data.status || 'PENDING'
  if (estadoReal === 'REJECTED') {
    console.error(`\n❌ Meta la rechazó de inmediato (id ${data.id}).`)
    console.error('   Corre: node scripts/crear-plantilla-bienvenida.js estado\n')
    process.exit(1)
  }

  console.log(`\n✅ Enviada a revisión. id ${data.id} · estado ${estadoReal} · categoría pedida UTILITY`)
  console.log('\n   Revisa con: node scripts/crear-plantilla-bienvenida.js estado')
  console.log(`   Cuando diga APPROVED, agrega en Railway:`)
  console.log(`   KOLLYBRY_BIENVENIDA_TEMPLATE=${NOMBRE}\n`)
}

async function main() {
  if (!TOKEN || !WABA) {
    console.error('\n❌ Faltan WABA_ACCESS_TOKEN o WABA_BUSINESS_ACCOUNT_ID.')
    console.error('   Corre esto desde la consola de Railway.\n')
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
