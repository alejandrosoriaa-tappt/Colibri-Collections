/**
 * Auditoría de dependencias con excepciones que caducan.
 *
 *   node scripts/auditoria.mjs backend
 *   node scripts/auditoria.mjs dashboard
 *
 * Falla si hay vulnerabilidades de severidad alta o crítica que NO estén en
 * .github/auditoria-excepciones.json.
 *
 * Por qué no basta `npm audit --audit-level=high`: xlsx tiene un fallo alto
 * sin corrección publicada en npm, así que el comando falla en cada corrida.
 * Un check permanentemente en rojo deja de leerse, y además bloquea los PRs
 * de Dependabot —que son justo los que traen las correcciones de seguridad—.
 *
 * Las excepciones llevan fecha: pasada esa fecha vuelven a fallar, para que
 * "lo aceptamos por ahora" no se convierta en "nadie lo volvió a mirar".
 */
import { execFileSync } from 'child_process'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const GRAVES = new Set(['high', 'critical'])

const proyecto = process.argv[2]
if (!proyecto) {
  console.error('Uso: node scripts/auditoria.mjs <backend|dashboard>')
  process.exit(2)
}

function cargarExcepciones() {
  try {
    const raw = readFileSync(join(RAIZ, '.github/auditoria-excepciones.json'), 'utf8')
    return JSON.parse(raw).excepciones || []
  } catch {
    return []
  }
}

// npm audit sale con código 1 cuando encuentra algo: eso no es un fallo de
// ejecución, así que se captura la salida igual.
function correrAudit(dir) {
  try {
    return JSON.parse(execFileSync('npm', ['audit', '--json', '--omit=dev'], {
      cwd: join(RAIZ, dir), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
    }))
  } catch (err) {
    if (err.stdout) return JSON.parse(err.stdout)
    throw err
  }
}

const hoy = new Date().toISOString().slice(0, 10)
const excepciones = cargarExcepciones().filter(e => !e.proyecto || e.proyecto === proyecto)

// Una excepción vencida deja de proteger: vuelve a contar como hallazgo.
const vigentes = new Map()
const vencidas = []
for (const e of excepciones) {
  if (e.revisar_antes_de && e.revisar_antes_de < hoy) vencidas.push(e)
  else vigentes.set(e.advisory, e)
}

const reporte = correrAudit(proyecto)
const vulns = Object.values(reporte.vulnerabilities || {})

const bloqueantes = []
const aceptadas = []

for (const v of vulns) {
  if (!GRAVES.has(v.severity)) continue
  const avisos = (v.via || [])
    .filter(x => typeof x === 'object')
    .map(x => (x.url || '').split('/').pop())
    .filter(Boolean)

  const cubierta = avisos.length > 0 && avisos.every(a => vigentes.has(a))
  ;(cubierta ? aceptadas : bloqueantes).push({ nombre: v.name, severity: v.severity, avisos })
}

console.log(`\nAuditoría de ${proyecto}`)
console.log('─'.repeat(52))

const m = reporte.metadata?.vulnerabilities || {}
console.log(`Total: ${m.total ?? 0}  (críticas ${m.critical ?? 0} · altas ${m.high ?? 0} · moderadas ${m.moderate ?? 0} · bajas ${m.low ?? 0})`)

if (aceptadas.length) {
  console.log('\nAceptadas a conciencia:')
  for (const a of aceptadas) {
    const e = vigentes.get(a.avisos[0])
    console.log(`  • ${a.nombre} (${a.severity}) — revisar antes de ${e?.revisar_antes_de || 'sin fecha'}`)
  }
}

if (vencidas.length) {
  console.error('\n⏰ Excepciones VENCIDAS — hay que reevaluarlas:')
  for (const e of vencidas) console.error(`  • ${e.paquete} ${e.advisory} venció el ${e.revisar_antes_de}`)
}

if (bloqueantes.length) {
  console.error('\n❌ Vulnerabilidades altas o críticas sin justificar:')
  for (const b of bloqueantes) console.error(`  • ${b.nombre} (${b.severity}) — ${b.avisos.join(', ')}`)
  console.error('\n   Corrige con `npm audit fix`, o documéntala en')
  console.error('   .github/auditoria-excepciones.json con motivo y fecha de revisión.\n')
}

if (bloqueantes.length || vencidas.length) process.exit(1)

console.log('\n✅ Sin vulnerabilidades altas o críticas pendientes.\n')
