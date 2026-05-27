/**
 * Genera un Excel de demo con 300 contactos (padres de familia)
 * distribuidos en 12 salones: 1ro A/B, 2do A/B, ... 6to A/B
 *
 * Uso:    node scripts/generate-school-excel.js
 * Output: scripts/colegio-demo-300alumnos.xlsx
 */

import * as XLSX from 'xlsx'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Datos dummy mexicanos ──────────────────────────────────
const apellidosP = [
  'García','Martínez','López','Hernández','González','Pérez','Sánchez',
  'Ramírez','Torres','Flores','Rivera','Gómez','Díaz','Cruz','Reyes',
  'Morales','Jiménez','Ruiz','Vargas','Castillo','Ortega','Mendoza',
  'Ramos','Chávez','Vázquez','Núñez','Ávila','Fuentes','Rojas','Aguilar'
]
const apellidosM = [
  'Soria','Luna','Medina','Herrera','Gutiérrez','Silva','Guerrero',
  'Sandoval','Delgado','Espinoza','Carrillo','Ríos','Peña','Contreras',
  'Alvarado','Cabrera','Villanueva','Navarro','Estrada','Pacheco',
  'Valencia','Salinas','Cervantes','Mercado','Bravo','Acosta','Padilla',
  'Lara','Campos','Montoya'
]
const nombresMadre = [
  'María','Patricia','Guadalupe','Ana','Rosa','Claudia','Adriana','Laura',
  'Alejandra','Leticia','Silvia','Mónica','Sandra','Verónica','Carmen',
  'Lucía','Esperanza','Norma','Beatriz','Elena','Yolanda','Teresa','Diana',
  'Marcela','Isabel','Rebeca','Angélica','Gabriela','Martha','Lorena'
]
const nombresPadre = [
  'José','Juan','Miguel','Carlos','Luis','Jorge','Roberto','Ricardo',
  'Fernando','Eduardo','David','Alejandro','Marco','Sergio','Arturo',
  'Manuel','Francisco','Daniel','Rafael','Antonio','Pablo','Héctor',
  'Gerardo','Raúl','Óscar','Enrique','Javier','Salvador','Alfredo','Diego'
]
const nombresAlumno = [
  'Sofía','Valentina','Camila','Lucía','Isabella','Regina','Fernanda','Daniela',
  'Andrea','Mariana','Renata','Natalia','Emilia','Paula','Valeria',
  'Santiago','Sebastián','Mateo','Diego','Emiliano','Rodrigo','Andrés',
  'Nicolás','Alejandro','Leonardo','Joaquín','Gabriel','Samuel','Daniel','Maximiliano'
]

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function phone() {
  const prefixes = ['55','56','33','81','222','442','477','664','667','686']
  const p = pick(prefixes)
  const remaining = 10 - p.length
  const rest = String(Math.floor(Math.random() * Math.pow(10, remaining))).padStart(remaining, '0')
  return p + rest
}

const salones = [
  '1ro A','1ro B',
  '2do A','2do B',
  '3ro A','3ro B',
  '4to A','4to B',
  '5to A','5to B',
  '6to A','6to B'
]

const POR_SALON = 25

const rows = [
  ['FAMILIA', 'TELÉFONO', 'ALUMNO', 'Seccion o Salon', 'MENSAJE O RECORDATORIO', 'Liga_Pago']
]

const usedPhones = new Set()
let total = 0

salones.forEach(salon => {
  for (let i = 0; i < POR_SALON; i++) {
    const ap1 = pick(apellidosP)
    const ap2 = pick(apellidosM)
    const familia = `${ap1} ${ap2}`

    const esMama = Math.random() > 0.5
    const tutor = esMama
      ? `${pick(nombresMadre)} ${ap1} ${ap2}`
      : `${pick(nombresPadre)} ${ap1} ${ap2}`

    const alumno = `${pick(nombresAlumno)} ${ap1} ${ap2}`

    let tel
    do { tel = phone() } while (usedPhones.has(tel))
    usedPhones.add(tel)

    const mensaje = `Estimado padre/madre de familia, le recordamos que la colegiatura del alumno ${alumno} (${salon}) está pendiente. Por favor realice su pago antes del día 10 del mes en curso. Gracias.`
    const liga = `https://pago.colegiolasamericas.mx/${tel.slice(-6)}`

    rows.push([familia, tel, alumno, salon, mensaje, liga])
    total++
  }
})

const wb = XLSX.utils.book_new()

// ── Hoja principal ──
const ws = XLSX.utils.aoa_to_sheet(rows)
ws['!cols'] = [
  { wch: 22 },  // FAMILIA
  { wch: 13 },  // TELÉFONO
  { wch: 32 },  // ALUMNO
  { wch: 12 },  // Salon
  { wch: 72 },  // MENSAJE
  { wch: 45 }   // Liga_Pago
]
XLSX.utils.book_append_sheet(wb, ws, 'Contactos')

// ── Hoja resumen ──
const resumenRows = [
  ['Grado','Sección','Contactos'],
  ...salones.map(s => {
    const parts = s.split(' ')
    return [parts[0], parts[1], POR_SALON]
  }),
  ['', '', ''],
  ['TOTAL', '', total]
]
const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows)
wsResumen['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 12 }]
XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen por salón')

const outPath = join(__dirname, 'colegio-demo-300alumnos.xlsx')
XLSX.writeFile(wb, outPath)

console.log(`\n✅  Excel generado: ${outPath}`)
console.log(`   ${total} contactos · ${salones.length} salones · ${POR_SALON} alumnos c/u\n`)
salones.forEach(s => console.log(`   • ${s.padEnd(6)}: ${POR_SALON} contactos`))
console.log()
