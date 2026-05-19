export function buildMessage(template, vars = {}) {
  let message = template

  const replacements = {
    '{nombre}': vars.nombre || '',
    '{monto}': vars.monto ? formatCurrency(vars.monto) : '',
    '{monto_con_recargo}': vars.monto_con_recargo ? formatCurrency(vars.monto_con_recargo) : '',
    '{liga_pago}': vars.liga_pago || '',
    '{fecha_limite}': vars.fecha_limite ? formatDate(vars.fecha_limite) : '',
    '{nombre_escuela}': vars.nombre_escuela || '',
    '{concept}': vars.concept || '',
    '{late_fee_pct}': vars.late_fee_pct !== undefined ? String(vars.late_fee_pct) : ''
  }

  for (const [key, value] of Object.entries(replacements)) {
    message = message.split(key).join(value)
  }

  return message
}

export function formatCurrency(amount) {
  const num = Number(amount)
  if (isNaN(num)) return '$0.00'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  }).format(num).replace('MX$', '$')
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T12:00:00Z')
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ]
  const day = date.getUTCDate()
  const month = months[date.getUTCMonth()]
  return `${day} de ${month}`
}

export function calculateAmountWithLateFee(monto, lateFee_pct) {
  const amount = Number(monto)
  const pct = Number(lateFee_pct) || 0
  return amount + (amount * pct / 100)
}
