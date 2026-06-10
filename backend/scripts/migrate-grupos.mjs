// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-grupos.mjs [--apply]
// Normaliza seccion/grado/salon y reconstruye grupo='Seccion Grado Salon' para
// tenants colegio/academia. Sin --apply hace DRY RUN. Nunca acorta un grupo.
import { buildEscolarGrupo, SALONES } from '../src/utils/schoolCatalog.js'

const URL = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('Faltan env vars: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const APPLY = process.argv.includes('--apply')
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

async function rest(path, opts = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { headers: H, ...opts })
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${text}`)
  return text ? JSON.parse(text) : null
}

function parseGrupo(g) {
  const s = String(g || '').trim()
  if (!s) return { seccion: null, grado: null, salon: null }
  const parts = s.split(/\s+/)
  let salon = null, grado = null
  if (parts.length && SALONES.includes(parts[parts.length - 1].toUpperCase())) salon = parts.pop()
  if (parts.length && /^\d/.test(parts[parts.length - 1])) grado = parts.pop()
  return { seccion: parts.join(' ') || null, grado, salon }
}

// Parse grupo first, then let explicit columns override when present.
// This avoids losing data (e.g. grupo "2do A" with only salon column set).
function deriveParts(c) {
  const p = parseGrupo(c.grupo)
  return {
    seccion: c.seccion || p.seccion,
    grado:   c.grado   || p.grado,
    salon:   c.salon   || p.salon,
  }
}

async function main() {
  const tenants = await rest('tenants?select=id,display_name,org_type&org_type=in.(colegio,academia)')
  console.log(`\nTenants colegio/academia: ${tenants.length}`)
  tenants.forEach(t => console.log(`  - ${t.display_name} (${t.org_type})`))
  const ids = tenants.map(t => t.id)
  if (!ids.length) { console.log('Nada que migrar.'); return }

  const inList = `(${ids.join(',')})`
  const contacts = await rest(`contacts?select=id,nombre,apellido,grupo,seccion,grado,salon,relationship_type&tenant_id=in.${inList}`)
  console.log(`\nContactos totales: ${contacts.length}\n`)
  console.log('CAMBIOS PROPUESTOS (grupo viejo -> grupo nuevo):')
  console.log('─'.repeat(82))

  let changes = 0, unchanged = 0, cleared = 0
  const updates = []
  for (const c of contacts) {
    const esc = buildEscolarGrupo(deriveParts(c))
    const changed = (c.grupo || null) !== (esc.grupo || null) ||
                    (c.seccion || null) !== (esc.seccion || null) ||
                    (c.grado || null) !== (esc.grado || null) ||
                    (c.salon || null) !== (esc.salon || null)
    if (changed) {
      const name = `${c.nombre} ${c.apellido || ''}`.trim()
      const flag = !esc.grupo && c.grupo ? '  ⚠️ no normalizable (se conserva)' : ''
      console.log(`  ${name.padEnd(26)} "${c.grupo || '(null)'}" -> "${esc.grupo || '(null)'}"${flag}`)
      if (!esc.grupo && c.grupo) cleared++
      updates.push({ id: c.id, ...esc })
      changes++
    } else unchanged++
  }
  console.log('─'.repeat(82))
  console.log(`\nResumen: ${changes} cambios · ${unchanged} sin cambio · ${cleared} no normalizables (se conservan)`)

  if (!APPLY) { console.log('\n👉 DRY RUN. Para aplicar: node /tmp/migrate-grupos.mjs --apply\n'); return }

  console.log('\n🚀 APLICANDO (saltando no normalizables)...')
  let applied = 0
  for (const u of updates) {
    if (!u.grupo) continue
    await rest(`contacts?id=eq.${u.id}`, {
      method: 'PATCH',
      headers: { ...H, Prefer: 'return=minimal' },
      body: JSON.stringify({ seccion: u.seccion, grado: u.grado, salon: u.salon, grupo: u.grupo })
    })
    applied++
  }
  console.log(`✅ ${applied} contactos actualizados.\n`)
}
main().catch(e => { console.error(e); process.exit(1) })
