/**
 * Actualiza el texto de la plantilla de comunicados en Meta.
 *
 * Lo más simple es correrlo DESDE RAILWAY (servicio kollybry-api), donde
 * WABA_ACCESS_TOKEN ya está configurado y hay salida a graph.facebook.com:
 *
 *   node scripts/actualizar-plantilla-comunicado.js            # muestra qué haría
 *   node scripts/actualizar-plantilla-comunicado.js --aplicar  # la manda a Meta
 *
 * Requiere en el entorno (NUNCA hardcodeadas):
 *   WABA_ACCESS_TOKEN  — token con permiso whatsapp_business_management
 *   WABA_BUSINESS_ID   — opcional; si falta se usa la WABA documentada
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
const token = process.env.WABA_ACCESS_TOKEN
const aplicar = process.argv.includes('--aplicar')

// WABA_BUSINESS_ID no está en .env.example ni la usa el código de envío, así
// que puede no existir en Railway. Se acepta por env, por argumento
// (--waba=123) o se cae al id documentado en whatsappTemplates.js, verificado
// contra Meta el 2026-06-09.
const WABA_CONOCIDA = '948092824711194'
const argWaba = process.argv.find(a => a.startsWith('--waba='))?.split('=')[1]
const businessId = process.env.WABA_BUSINESS_ID || argWaba || WABA_CONOCIDA

// ── Lo que va a quedar registrado en Meta ────────────────────────────────────
// {{1}} = nombre del colegio   {{2}} = cuerpo del mensaje
// El orden importa: es el que manda comunicadoComponents() en el backend.
const PLANTILLA = 'kollybry_comunicado_util'

const COMPONENTES = [
  {
    type: 'BODY',
    // Meta rechaza cuerpos que empiecen o terminen con variable, por eso el
    // 'Buen día,' al inicio y el cierre después de {{2}}.
    //
    // El cierre no es cortesía: es lo que evita que un papá conteste una
    // urgencia a un buzón que nadie lee. Va en TODOS los comunicados, no solo
    // en el de bienvenida, porque el papá que se equivoca es justamente el que
    // no leyó el primero.
    text:
      'Buen día, *{{1}}* te informa:\n\n' +
      '{{2}}\n\n' +
      'Para cualquier aclaración o comentario favor de comunicarse a oficinas. ' +
      'Este chat no es atendido: los mensajes que llegan aquí no se leen.',
    // Meta exige ejemplos cuando el cuerpo lleva parámetros
    example: {
      body_text: [['Puerto Alto Montessori', 'La junta de padres es el viernes a las 7pm']]
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
  if (!token) {
    salirCon(
      'Falta WABA_ACCESS_TOKEN en el entorno.\n' +
      '   Si lo corres desde Railway (servicio kollybry-api) ya debería estar puesto.'
    )
  }
  if (!process.env.WABA_BUSINESS_ID && !argWaba) {
    console.log(`ℹ  WABA_BUSINESS_ID no está en el entorno; usando ${WABA_CONOCIDA} (la documentada en el código).`)
    console.log('   Si no es la correcta, pásala con --waba=<id>.')
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
