/**
 * Actualiza el texto de la plantilla de comunicados en Meta.
 *
 *   node scripts/actualizar-plantilla-comunicado.js            # muestra qué haría
 *   node scripts/actualizar-plantilla-comunicado.js --aplicar  # la manda a Meta
 *
 * Requiere en el entorno (NUNCA hardcodeadas):
 *   WABA_BUSINESS_ID   — id de la cuenta de WhatsApp Business
 *   WABA_ACCESS_TOKEN  — token con permiso whatsapp_business_management
 *
 * Nota: para EDITAR una plantilla existente hay que hacer POST al id de la
 * plantilla. El POST a /{WABA_ID}/message_templates solo CREA — es el error
 * del script viejo (update-meta-templates.js), que ante una plantilla ya
 * existente terminaba pidiendo que la editaras a mano.
 *
 * La categoría NO se manda a propósito: editar sin tocarla la deja como está.
 * kollybry_comunicado_util debe seguir siendo UTILITY, porque MARKETING queda
 * sujeta al tope de frecuencia de Meta y algunos papás dejarían de recibirla.
 */
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const GRAPH = 'https://graph.facebook.com/v20.0'
const businessId = process.env.WABA_BUSINESS_ID
const token = process.env.WABA_ACCESS_TOKEN
const aplicar = process.argv.includes('--aplicar')

// ── Lo que va a quedar registrado en Meta ────────────────────────────────────
// {{1}} = nombre del colegio   {{2}} = cuerpo del mensaje
// El orden importa: es el que manda comunicadoComponents() en el backend.
const PLANTILLA = 'kollybry_comunicado_util'

const COMPONENTES = [
  {
    type: 'BODY',
    text: '*{{1}}* te envía un mensaje importante:\n\n{{2}}',
    // Meta exige ejemplos cuando el cuerpo lleva parámetros
    example: {
      body_text: [['Colegio Las Américas', 'La junta de padres es el viernes a las 7pm']]
    }
  },
  {
    type: 'FOOTER',
    text: 'Mensaje enviado con la plataforma Kollybry'
  }
]

function salirCon(msg) {
  console.error(`\n❌ ${msg}\n`)
  process.exit(1)
}

async function main() {
  if (!businessId || !token) {
    salirCon('Faltan WABA_BUSINESS_ID o WABA_ACCESS_TOKEN en el entorno.')
  }

  console.log(`\nPlantilla: ${PLANTILLA}`)
  console.log('\nCuerpo que va a quedar:')
  console.log('─'.repeat(60))
  console.log(COMPONENTES[0].text.replace(/\\n/g, '\n'))
  console.log('─'.repeat(60))
  console.log(`Pie: ${COMPONENTES[1].text}\n`)

  // 1. Buscar la plantilla por nombre para obtener su id
  let plantilla
  try {
    const { data } = await axios.get(`${GRAPH}/${businessId}/message_templates`, {
      params: { name: PLANTILLA, access_token: token }
    })
    plantilla = (data.data || [])[0]
  } catch (err) {
    salirCon(`No se pudo consultar Meta: ${err.response?.data?.error?.message || err.message}`)
  }

  if (!plantilla) {
    salirCon(`No existe una plantilla llamada "${PLANTILLA}" en esta WABA.`)
  }

  console.log(`Encontrada — id ${plantilla.id} · categoría ${plantilla.category} · estado ${plantilla.status}`)

  if (!aplicar) {
    console.log('\n⏸  Simulación. Nada se mandó a Meta.')
    console.log('   Corre otra vez con --aplicar para enviarlo a revisión.\n')
    return
  }

  // 2. Editar. POST al ID de la plantilla, no a la colección.
  try {
    const { data } = await axios.post(
      `${GRAPH}/${plantilla.id}`,
      { components: COMPONENTES },
      { params: { access_token: token }, headers: { 'Content-Type': 'application/json' } }
    )
    if (data?.success === false) throw new Error(JSON.stringify(data))
    console.log('\n✅ Enviada a Meta. Queda en revisión (de minutos a un par de horas).')
    console.log('   Verifica en WhatsApp Manager que la categoría siga en UTILITY.\n')
  } catch (err) {
    const e = err.response?.data?.error
    salirCon(
      `Meta rechazó la edición: ${e?.message || err.message}` +
      (e?.error_user_msg ? `\n   ${e.error_user_msg}` : '') +
      '\n   Si dice que se agotaron las ediciones del mes, hay que hacerlo desde WhatsApp Manager.'
    )
  }
}

main()
