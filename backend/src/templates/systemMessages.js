export const SYSTEM_MESSAGES = {
  upload_reminder_early: (vars) =>
    `📋 Recordatorio de carga - ${vars.nombre_org}\n\nHola, te recordamos que el ciclo ${vars.campaign_name} inicia en ${vars.days_until} días (${vars.start_date}).\n\nAún no has subido el archivo de cobros de este mes. Por favor sube tu Excel o CSV antes de que inicie el ciclo para que los mensajes se envíen a tiempo.\n\nSube tu archivo aquí: ${vars.upload_url || 'Accede al panel de Colibrí'}`,

  upload_reminder_urgent: (vars) =>
    `🚨 URGENTE - Archivo pendiente - ${vars.nombre_org}\n\nEl ciclo ${vars.campaign_name} inicia MAÑANA y aún no has subido el archivo de cobros.\n\nSi no subes el archivo hoy, los mensajes del día 1 no se enviarán automáticamente.\n\nSube tu archivo ahora: ${vars.upload_url || 'Accede al panel de Colibrí'}`,

  file_processed_ok: (vars) =>
    `✅ Archivo procesado exitosamente - ${vars.nombre_org}\n\nTu archivo para ${vars.campaign_name} fue procesado correctamente:\n\n• Total de registros: ${vars.total}\n• Registros válidos: ${vars.valid}\n• Con errores: ${vars.errors || 0}\n\nLos ${vars.valid} contactos están listos para recibir mensajes en el ciclo.`,

  file_processed_errors: (vars) =>
    `⚠️ Archivo procesado con errores - ${vars.nombre_org}\n\nTu archivo para ${vars.campaign_name} fue procesado pero tuvo errores:\n\n• Total de registros: ${vars.total}\n• Registros válidos: ${vars.valid}\n• Con errores: ${vars.errors}\n\nRevisa los errores en el panel y vuelve a subir las filas corregidas si es necesario.`,

  message_sent: (vars) =>
    `📨 Mensajes enviados - ${vars.nombre_org}\n\nSe enviaron los mensajes del ${vars.message_label} del ciclo ${vars.campaign_name}:\n\n• Enviados exitosamente: ${vars.sent}\n• Fallidos: ${vars.failed || 0}\n• Tipo: ${vars.send_to === 'all' ? 'Todos los contactos' : 'Contactos pendientes de pago'}\n\nPuedes ver el detalle en tu panel de Colibrí.`,

  subscription_due: (vars) =>
    `💳 Recordatorio de pago - Colibrí Communications\n\nHola ${vars.nombre_org}, tu suscripción mensual de Colibrí Communications por $${vars.amount} MXN vence el ${vars.due_date}.\n\nPara continuar usando el servicio sin interrupciones, realiza tu pago antes de la fecha límite.\n\nPaga aquí: ${vars.payment_link}`,

  trial_ending: (vars) =>
    `⏰ Tu período de prueba termina pronto - Colibrí Communications\n\nHola ${vars.nombre_org}, tu período de prueba gratuito termina en ${vars.days_remaining} días (${vars.end_date}).\n\nPara continuar automatizando tus cobros, activa tu suscripción.\n\nPlan mensual: $${vars.plan_price} MXN/mes\n\nContáctanos para activar: ${vars.contact_link || 'hola@colibricollections.mx'}`
}
