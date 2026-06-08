import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const GRAPH_URL = 'https://graph.facebook.com/v20.0'
const businessId = process.env.WABA_BUSINESS_ID
const accessToken = process.env.WABA_ACCESS_TOKEN

if (!businessId || !accessToken) {
  console.error('❌ Missing WABA_BUSINESS_ID or WABA_ACCESS_TOKEN')
  process.exit(1)
}

async function updateTemplate() {
  try {
    console.log('📤 Updating Meta template: kollybry_comunicado...\n')

    const templatePayload = {
      name: 'kollybry_comunicado',
      language: 'es',
      category: 'MARKETING',
      components: [
        {
          type: 'BODY',
          text: 'Comunicado de {{1}}\n\nEstimado miembro de la comunidad {{2}}:\n\n{{3}}\n\nAgradecemos tu atención a este comunicado. Para cualquier duda, comunícate directamente con tu organización.\n\nEnviado con {{2}}'
        }
      ]
    }

    const response = await axios.post(
      `${GRAPH_URL}/${businessId}/message_templates`,
      templatePayload,
      {
        params: { access_token: accessToken },
        headers: { 'Content-Type': 'application/json' }
      }
    )

    if (response.data?.id) {
      console.log('✅ Template created successfully!')
      console.log(`   ID: ${response.data.id}`)
      console.log(`   Name: ${response.data.name}`)
      console.log(`   Status: ${response.data.status}`)
      console.log('\n📝 Template structure:')
      console.log('   {{1}} = titulo (announcement title)')
      console.log('   {{2}} = orgName (organization name)')
      console.log('   {{3}} = cuerpo (message body)')
    } else if (response.data?.error) {
      console.error('❌ Template creation failed:')
      console.error(`   Code: ${response.data.error.code}`)
      console.error(`   Message: ${response.data.error.message}`)

      // If template already exists, try updating it
      if (response.data.error.code === 1200) {
        console.log('\n🔄 Template already exists. Attempting to update...')
        // Note: Meta doesn't allow updating templates directly
        // You must edit them through the UI or delete and recreate
        console.log('\n⚠️  Please edit the template manually in Meta:')
        console.log('1. Go to Meta WhatsApp Manager')
        console.log('2. Find "kollybry_comunicado"')
        console.log('3. Click "Edit template"')
        console.log('4. Replace the body with:')
        console.log('\nComunicado de {{1}}\n')
        console.log('Estimado miembro de la comunidad {{2}}:\n')
        console.log('{{3}}\n')
        console.log('Agradecemos tu atención a este comunicado. Para cualquier duda, comunícate directamente con tu organización.\n')
        console.log('Enviado con {{2}}')
      }
    }
  } catch (error) {
    if (error.response?.data) {
      console.error('❌ API Error:', JSON.stringify(error.response.data, null, 2))
    } else {
      console.error('❌ Error:', error.message)
    }
    process.exit(1)
  }
}

updateTemplate()
