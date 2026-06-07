// Ponderación IA — score 0-100 based on rentabilidad, status jurídico, PJV
export function calcScore(e) {
  let s = 0;

  const rent = Number(e.rentabilidad) || 0;
  if      (rent >= 100) s += 50;
  else if (rent >= 50)  s += 38;
  else if (rent >= 30)  s += 25;
  else if (rent >= 10)  s += 12;

  const sj = (e.status_juridico || '').toLowerCase();
  if      (sj.includes('favorable') || sj.includes('adjudic') || sj.includes('posesion') || sj.includes('venta')) s += 30;
  else if (sj.includes('convenio')  || sj.includes('dacion')  || sj.includes('dación'))  s += 22;
  else if (sj.includes('proceso')   || sj.includes('curso')   || sj.includes('audiencia'))s += 14;
  else if (sj.includes('remate')    || sj.includes('embargo')) s += 10;
  else if (sj.includes('amparo')    || sj.includes('suspen'))  s +=  5;
  else if (sj) s += 10;

  const pjv = (e.status_pjv || '').toLowerCase();
  if (pjv === 'si' || pjv === 'sí') s += 20;

  return Math.min(s, 100);
}

export function scoreMeta(score) {
  if (score >= 80) return { label: 'Excelente', color: '#1b5e20', bg: '#e8f5e9', bar: '#2e7d32', border: '#a5d6a7' };
  if (score >= 60) return { label: 'Alta',      color: '#2e7d32', bg: '#f1f8e9', bar: '#66bb6a', border: '#c5e1a5' };
  if (score >= 40) return { label: 'Media',     color: '#e65100', bg: '#fff3e0', bar: '#ffa726', border: '#ffcc80' };
  return               { label: 'Baja',         color: '#757575', bg: '#f5f5f5', bar: '#bdbdbd', border: '#e0e0e0' };
}
