import nodemailer from 'nodemailer'

// ── Transport ──────────────────────────────────────────────────────────────────

function createTransport() {
  return nodemailer.createTransport({
    host: 'smtp.titan.email',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  })
}

export function emailEnabled() {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD)
}

export async function sendCrmEmail(to, subject, html) {
  if (!emailEnabled()) {
    throw new Error('Email not configured')
  }
  const transporter = createTransport()
  const info = await transporter.sendMail({
    from: `"Alejandro Soria | NKUVO" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  })
  return info
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function saludo(client) {
  const nombre = client.nombre_contacto?.trim() || client.razon_social?.trim() || 'Estimado/a'
  // Use first name only if we have a full name
  const firstName = nombre.includes(' ') ? nombre.split(' ')[0] : nombre
  return firstName
}

function baseStyle() {
  return `
    <style>
      body { margin: 0; padding: 0; background: #f5f5f5; font-family: 'Helvetica Neue', Arial, sans-serif; }
      .wrapper { max-width: 560px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
      .header { background: #1a3a5c; padding: 28px 32px 24px; }
      .header h1 { color: #ffffff; font-size: 20px; font-weight: 600; margin: 0; letter-spacing: -0.3px; }
      .header p { color: rgba(255,255,255,0.7); font-size: 13px; margin: 4px 0 0; }
      .body { padding: 28px 32px; color: #1a1a1a; }
      .body p { font-size: 15px; line-height: 1.6; margin: 0 0 16px; color: #333; }
      .body p:last-child { margin-bottom: 0; }
      .highlight { background: #f0f4ff; border-left: 3px solid #3b6fd4; border-radius: 0 8px 8px 0; padding: 14px 16px; margin: 20px 0; }
      .highlight p { margin: 0; color: #1a3a5c; font-size: 14px; }
      .cta { text-align: center; margin: 24px 0 8px; }
      .cta a { background: #1a3a5c; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block; }
      .footer { border-top: 1px solid #eeeeee; padding: 20px 32px; }
      .footer p { font-size: 13px; color: #888; margin: 0; line-height: 1.5; }
      .footer strong { color: #333; }
      .signature { margin-top: 8px; }
      .signature p { font-size: 14px; color: #555; margin: 2px 0; }
    </style>
  `
}

function wrapHtml(headerTitle, headerSub, bodyContent) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${baseStyle()}
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${headerTitle}</h1>
      <p>${headerSub}</p>
    </div>
    <div class="body">
      ${bodyContent}
    </div>
    <div class="footer">
      <div class="signature">
        <p><strong>Alejandro Soria</strong></p>
        <p>NKUVO — Software para colegios y condominios</p>
      </div>
    </div>
  </div>
</body>
</html>`
}

// ── Templates ──────────────────────────────────────────────────────────────────

export function templateFrio(client) {
  const nombre = saludo(client)
  const empresa = client.razon_social?.trim() || 'su organización'
  const subject = `NKUVO — Soluciones digitales para ${empresa}`
  const html = wrapHtml(
    'Hola, somos NKUVO',
    'Software para colegios y condominios',
    `
    <p>Buen día, ${nombre}.</p>
    <p>Le escribo de parte de <strong>NKUVO</strong>, una plataforma diseñada para modernizar la gestión de ${empresa.toLowerCase().includes('colegio') || empresa.toLowerCase().includes('escuela') ? 'colegios e instituciones educativas' : 'condominios y comunidades residenciales'}.</p>
    <div class="highlight">
      <p>Con NKUVO, su equipo puede administrar pagos, comunicados, seguimiento de incidencias y reportes — todo desde un solo lugar, sin papeleos ni hojas de cálculo.</p>
    </div>
    <p>Me gustaría mostrarle cómo otras organizaciones similares a la suya ya están ahorrando tiempo y mejorando la experiencia de sus usuarios con nuestra plataforma.</p>
    <p>¿Tendría 20 minutos esta semana para una llamada rápida?</p>
    <p>Quedo a sus órdenes.</p>
    `
  )
  return { subject, html }
}

export function templateFollowup(client) {
  const nombre = saludo(client)
  const subject = `Seguimiento — NKUVO`
  const html = wrapHtml(
    'Seguimiento de nuestra conversación',
    'NKUVO — Software para colegios y condominios',
    `
    <p>Hola, ${nombre}.</p>
    <p>Le escribo para dar seguimiento a nuestra conversación anterior sobre NKUVO.</p>
    <p>Entiendo que el día a día de su organización está lleno de prioridades, por lo que quería retomar el contacto y ver si surge la oportunidad de platicar con más calma sobre cómo podríamos apoyarles.</p>
    <div class="highlight">
      <p>Si tiene alguna pregunta concreta o le gustaría ver una demostración de la plataforma, con gusto lo agendamos a la brevedad.</p>
    </div>
    <p>¿Qué días y horarios le vendrían mejor?</p>
    <p>Muchas gracias por su tiempo.</p>
    `
  )
  return { subject, html }
}

export function templatePropuesta(client) {
  const nombre = saludo(client)
  const empresa = client.razon_social?.trim() || 'su organización'
  const subject = `Propuesta NKUVO para ${empresa}`
  const html = wrapHtml(
    `Propuesta para ${empresa}`,
    'NKUVO — Software para colegios y condominios',
    `
    <p>Hola, ${nombre}.</p>
    <p>Conforme a lo conversado, me complace enviarle la propuesta de NKUVO para <strong>${empresa}</strong>.</p>
    <div class="highlight">
      <p>Adjunto encontrarás nuestra presentación. <!-- [enlace por agregar] --></p>
    </div>
    <p>En resumen, la propuesta incluye:</p>
    <ul style="margin: 0 0 16px; padding-left: 20px; color: #333; font-size: 15px; line-height: 1.8;">
      <li>Acceso completo a la plataforma NKUVO</li>
      <li>Onboarding y capacitación inicial para su equipo</li>
      <li>Soporte técnico incluido durante el primer año</li>
      <li>Configuración personalizada según sus procesos</li>
    </ul>
    <p>Con gusto resuelvo cualquier duda que tenga sobre los alcances o condiciones. ¿Le parece si agendamos una llamada de revisión esta semana?</p>
    <p>Quedo en espera de sus comentarios.</p>
    `
  )
  return { subject, html }
}

export function templateCierre(client) {
  const nombre = saludo(client)
  const empresa = client.razon_social?.trim() || 'su organización'
  const subject = `Próximos pasos — NKUVO para ${empresa}`
  const html = wrapHtml(
    'Próximos pasos para comenzar',
    'NKUVO — Software para colegios y condominios',
    `
    <p>Hola, ${nombre}.</p>
    <p>Ha sido un placer platicar con usted sobre las necesidades de <strong>${empresa}</strong>. Creo que NKUVO puede ser una solución muy valiosa para su equipo.</p>
    <div class="highlight">
      <p>Para avanzar, el siguiente paso sería confirmar el plan seleccionado y firmar el acuerdo de servicio. El proceso de alta toma menos de 48 horas hábiles.</p>
    </div>
    <p>Envíeme su confirmación y de inmediato coordinamos los detalles con nuestro equipo de implementación.</p>
    <p>Estamos listos para comenzar cuando usted lo indique.</p>
    `
  )
  return { subject, html }
}
