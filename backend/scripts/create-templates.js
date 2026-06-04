#!/usr/bin/env node
/**
 * create-templates.js
 * Creates or updates Kollybry WhatsApp message templates via Meta Graph API.
 *
 * Usage:
 *   node scripts/create-templates.js                  # creates ALL templates
 *   node scripts/create-templates.js bienvenida_comunidad  # creates one template by key
 *
 * Requirements:
 *   WABA_ACCESS_TOKEN      — long-lived token from Meta
 *   WABA_BUSINESS_ACCOUNT_ID — WhatsApp Business Account ID (not Business Manager ID)
 *                              Find it: Meta Business Suite → WhatsApp Manager → Información general
 *
 * Run from backend root:
 *   WABA_ACCESS_TOKEN=xxx WABA_BUSINESS_ACCOUNT_ID=yyy node scripts/create-templates.js
 *   OR add vars to .env and run with: node -r dotenv/config scripts/create-templates.js
 */

import 'dotenv/config'
import fetch from 'node-fetch'

const GRAPH_URL = 'https://graph.facebook.com/v20.0'
const TOKEN = process.env.WABA_ACCESS_TOKEN
const WABA_ID = process.env.WABA_BUSINESS_ACCOUNT_ID

if (!TOKEN || !WABA_ID) {
  console.error('❌  Missing env vars: WABA_ACCESS_TOKEN and/or WABA_BUSINESS_ACCOUNT_ID')
  console.error('   Add them to .env or pass them inline:')
  console.error('   WABA_ACCESS_TOKEN=xxx WABA_BUSINESS_ACCOUNT_ID=yyy node scripts/create-templates.js')
  process.exit(1)
}

// ─────────────────────────────────────────────
// TEMPLATE DEFINITIONS
// Add new templates here — no other files need to change.
// ─────────────────────────────────────────────
const TEMPLATES = {

  // ── ADMIN ONBOARDING ─────────────────────────────────────────────
  bienvenida_credenciales: {
    name: 'kollybry_bienvenida_credenciales',
    category: 'UTILITY',
    language: 'es_MX',
    components: [
      {
        type: 'BODY',
        text:
          'Hola {{1}} 👋\n\n' +
          'En {{2}} te damos la bienvenida a este nuevo servicio proporcionado por Kollybry.\n\n' +
          'A partir de ahora recibirás avisos importantes, recordatorios y comunicados de nuestra comunidad por este medio.\n\n' +
          'Confirma que lo recibiste tocando el botón de abajo ✅',
        example: { body_text: [['Carlos Mendoza', 'Colegio San Pablo']] }
      },
      {
        type: 'BUTTONS',
        buttons: [{ type: 'QUICK_REPLY', text: 'Recibido ✅' }]
      }
    ]
  },

  // ── COMMUNITY WELCOME ────────────────────────────────────────────
  bienvenida_comunidad: {
    name: 'kollybry_bienvenida_comunidad',
    category: 'UTILITY',
    language: 'es_MX',
    components: [
      {
        type: 'BODY',
        text:
          'Hola {{1}} 👋\n\n' +
          '{{2}} te da la bienvenida a este nuevo servicio proporcionado por Kollybry.\n\n' +
          'A partir de ahora recibirás avisos importantes, recordatorios y comunicados de nuestra comunidad por este medio.\n\n' +
          'Confirma que lo recibiste tocando el botón de abajo ✅',
        example: { body_text: [['Carlos Mendoza', 'Colegio San Pablo']] }
      },
      {
        type: 'BUTTONS',
        buttons: [{ type: 'QUICK_REPLY', text: 'Recibido ✅' }]
      }
    ]
  },

  // ── PAYMENT REMINDER ─────────────────────────────────────────────
  recordatorio_pago: {
    name: 'kollybry_recordatorio_pago',
    category: 'UTILITY',
    language: 'es_MX',
    components: [
      {
        type: 'BODY',
        text:
          'Hola {{1}} 👋\n\n' +
          '*{{2}}* te recuerda que tienes pendiente tu {{3}} por *{{4}}*.\n\n' +
          '🔗 Paga aquí: {{5}}\n\n' +
          'Para cualquier duda, comunícate con nosotros.',
        example: { body_text: [['Carlos Mendoza', 'Colegio San Pablo', 'Colegiatura Mayo', '$1,500', 'https://pago.ejemplo.com']] }
      }
    ]
  },

  // ── OVERDUE NOTICE ───────────────────────────────────────────────
  aviso_vencido: {
    name: 'kollybry_aviso_vencido',
    category: 'UTILITY',
    language: 'es_MX',
    components: [
      {
        type: 'BODY',
        text:
          'Hola {{1}}, *{{2}}* te informa que tu saldo de *{{3}}* por {{4}} lleva {{5}} días vencido.\n\n' +
          'Por favor regulariza tu situación a la brevedad para evitar inconvenientes.\n\n' +
          'Para cualquier duda, comunícate con nosotros.',
        example: { body_text: [['Carlos Mendoza', 'Colegio San Pablo', '$1,500', 'Colegiatura Abril', '15']] }
      }
    ]
  },

  // ── PAYMENT CONFIRMATION ─────────────────────────────────────────
  confirmacion_pago: {
    name: 'kollybry_confirmacion_pago',
    category: 'UTILITY',
    language: 'es_MX',
    components: [
      {
        type: 'BODY',
        text:
          'Hola {{1}} ✅\n\n' +
          '*{{2}}* confirma la recepción de tu {{3}} por *{{4}}* el día {{5}}.\n\n' +
          '¡Gracias por tu pago puntual!',
        example: { body_text: [['Carlos Mendoza', 'Colegio San Pablo', 'Colegiatura Mayo', '$1,500', '30 de mayo de 2026']] }
      }
    ]
  },

  // ── SPEI PAYMENT REMINDER (add-on) ──────────────────────────────
  recordatorio_spei: {
    name: 'kollybry_recordatorio_spei',
    category: 'UTILITY',
    language: 'es_MX',
    components: [
      {
        type: 'BODY',
        text:
          'Hola {{1}} 👋\n\n' +
          '*{{2}}* te recuerda que tienes pendiente tu {{3}} por *{{4}}*.\n\n' +
          'Paga fácil con transferencia SPEI:\n' +
          '🏦 CLABE: *{{5}}*\n' +
          '📋 Concepto: {{3}}\n\n' +
          'Al realizar la transferencia recibirás confirmación automática ✅\n\n' +
          'Para cualquier duda, comunícate con nosotros.',
        example: { body_text: [['Carlos Mendoza', 'Colegio San Pablo', 'Colegiatura Mayo', '$1,500', '646180000000000001']] }
      }
    ]
  },

  // ── GENERAL ANNOUNCEMENT ─────────────────────────────────────────
  comunicado: {
    name: 'kollybry_comunicado',
    category: 'MARKETING',
    language: 'es_MX',
    components: [
      {
        type: 'BODY',
        text:
          '📢 *{{1}}*\n\n' +
          '*{{2}}* te comparte el siguiente comunicado:\n\n' +
          '{{3}}',
        example: { body_text: [['Aviso importante', 'Colegio San Pablo', 'Este lunes no hay clases por junta de maestros.']] }
      }
    ]
  },

  // ── ANNOUNCEMENT WITH IMAGE ──────────────────────────────────────
  comunicado_imagen: {
    name: 'kollybry_comunicado_imagen',
    category: 'MARKETING',
    language: 'es_MX',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        example: { header_handle: ['https://via.placeholder.com/400x200.png'] }
      },
      {
        type: 'BODY',
        text:
          '📢 *{{1}}*\n\n' +
          '*{{2}}* te comparte el siguiente comunicado:\n\n' +
          '{{3}}',
        example: { body_text: [['Aviso importante', 'Colegio San Pablo', 'Este lunes no hay clases por junta de maestros.']] }
      }
    ]
  }
}

// ─────────────────────────────────────────────
// API CALL
// ─────────────────────────────────────────────
async function createTemplate(key, tpl) {
  console.log(`\n📤 Creating: ${tpl.name} (${tpl.category} / ${tpl.language})`)

  const body = {
    name: tpl.name,
    category: tpl.category,
    language: tpl.language,
    components: tpl.components
  }

  const res = await fetch(`${GRAPH_URL}/${WABA_ID}/message_templates`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  const json = await res.json()

  if (res.ok && json.id) {
    console.log(`   ✅ Created — id: ${json.id}  status: ${json.status}`)
  } else {
    console.error(`   ❌ Failed:`, JSON.stringify(json, null, 2))
  }

  return json
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
  const arg = process.argv[2] // optional: template key to run just one

  const keys = arg
    ? [arg]
    : Object.keys(TEMPLATES)

  const unknown = keys.filter(k => !TEMPLATES[k])
  if (unknown.length) {
    console.error(`❌  Unknown template key(s): ${unknown.join(', ')}`)
    console.error('   Available keys:', Object.keys(TEMPLATES).join(', '))
    process.exit(1)
  }

  console.log(`🚀 Kollybry — creating ${keys.length} template(s) in WABA ${WABA_ID}`)

  for (const key of keys) {
    await createTemplate(key, TEMPLATES[key])
  }

  console.log('\n✅ Done. Check status in Meta WhatsApp Manager → Administrar plantillas')
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
