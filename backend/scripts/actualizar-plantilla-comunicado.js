/**
 * Actualiza el texto de la plantilla de comunicados en Meta.
 *
 * Lo más simple es correrlo DESDE RAILWAY (servicio kollybry-api), donde
 * WABA_ACCESS_TOKEN ya está configurado y hay salida a graph.facebook.com:
 *
 *   node scripts/actualizar-plantilla-comunicado.js                     # simula (texto)
 *   node scripts/actualizar-plantilla-comunicado.js --aplicar           # aplica (texto)
 *   node scripts/actualizar-plantilla-comunicado.js --imagen --aplicar  # aplica (con imagen)
 *
 * Son DOS plantillas distintas en Meta y las dos tienen que llevar el mismo
 * cierre: si solo se actualiza una, los comunicados con foto salen sin el aviso
 * de que nadie lee las respuestas.
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
 * La categoría SÍ se manda, y es lo más importante de este script.
 *
 * Se creía que omitirla la dejaba como estaba. No es así: al editar, Meta
 * vuelve a clasificar el contenido por su cuenta, y en una edición real pasó
 * de UTILITY a MARKETING sin avisar. Eso no es cosmético — MARKETING queda
 * sujeta al tope de frecuencia de Meta, así que algunos papás dejan de recibir
 * los avisos del colegio y nadie se entera.
 *
 * Mandarla explícita no garantiza que Meta la respete —él tiene la última
 * palabra—, pero al menos declara la intención. Hay que verificar el resultado
 * SIEMPRE, y por eso el script lo consulta después de editar.
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

// ── El cierre, idéntico en todas las plantillas ──────────────────────────────
//
// No es cortesía: es lo que evita que un papá conteste una urgencia a un buzón
// que nadie lee. Tiene que estar en TODOS los mensajes, no solo en el de
// bienvenida, porque el papá que se equivoca es justamente el que no leyó el
// primero. Se define una sola vez para que no se desincronicen entre plantillas.
const CIERRE =
  'Este mensaje ha sido enviado desde un servidor automático, por lo que no admite respuestas. ' +
  'Para cualquier consulta o aclaración, favor de comunicarse directamente con las oficinas del colegio.'

const PIE = { type: 'FOOTER', text: 'Mensaje enviado con la plataforma Kollybry' }

// ── Lo que va a quedar registrado en Meta ────────────────────────────────────
// El orden de los parámetros importa: es el que mandan comunicadoComponents()
// y comunicadoImagenComponents() en el backend.
const conImagen = process.argv.includes('--imagen')

// Texto: {{1}} colegio · {{2}} cuerpo
const PLANTILLA_TEXTO = 'kollybry_comunicado_util'
// Imagen: {{1}} título · {{2}} colegio · {{3}} cuerpo  (encabezado de imagen)
const PLANTILLA_IMAGEN = 'kollybry_comunicado_imagen'

const PLANTILLA = conImagen ? PLANTILLA_IMAGEN : PLANTILLA_TEXTO

const COMPONENTES_IMAGEN = [
  { type: 'HEADER', format: 'IMAGE', example: { header_handle: ['https://app.kollybry.com/logo.png'] } },
  {
    type: 'BODY',
    text:
      '*{{1}}*\n\n' +
      'Buen día, *{{2}}* te informa:\n\n' +
      '{{3}}\n\n' +
      CIERRE,
    example: {
      body_text: [['Junta de padres', 'Puerto Alto Montessori', 'La junta es el viernes a las 7pm']]
    }
  },
  PIE
]

const COMPONENTES_TEXTO = [
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
      CIERRE,
    // Meta exige ejemplos cuando el cuerpo lleva parámetros
    example: {
      body_text: [['Puerto Alto Montessori', 'La junta de padres es el viernes a las 7pm']]
    }
  },
  PIE
]

const COMPONENTES = conImagen ? COMPONENTES_IMAGEN : COMPONENTES_TEXTO

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
  console.log((conImagen ? COMPONENTES[1] : COMPONENTES[0]).text)
  console.log('─'.repeat(60))
  console.log(`Pie: ${COMPONENTES[COMPONENTES.length - 1].text}\n`)

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
      { category: 'UTILITY', components: COMPONENTES },
      { params: { access_token: token }, headers: { 'Content-Type': 'application/json' } }
    )
    if (data?.success === false) throw new Error(JSON.stringify(data))
    console.log('\n✅ Enviada a Meta. Queda en revisión (de minutos a un par de horas).')

    // Se vuelve a consultar en vez de confiar: la vez que se dio por hecho que
    // la categoría no cambiaba, cambió, y el colegio quedó en MARKETING días.
    try {
      const { data: despues } = await axios.get(`${GRAPH}/${businessId}/message_templates`, {
        params: { name: PLANTILLA, access_token: token }
      })
      const actual = despues?.data?.[0]
      if (actual) {
        console.log(`   Categoría ahora: ${actual.category} · estado ${actual.status}`)
        if (actual.category !== 'UTILITY') {
          console.log('\n⚠️  QUEDÓ EN ' + actual.category + ', no en UTILITY.')
          console.log('   Eso la sujeta al tope de frecuencia de Meta: algunos papás')
          console.log('   dejarán de recibir los avisos. Pide la reclasificación desde')
          console.log('   WhatsApp Manager → Plantillas → esa plantilla → categoría.\n')
        }
      }
    } catch {
      console.log('   (No se pudo confirmar la categoría; revísala en WhatsApp Manager.)')
    }
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
