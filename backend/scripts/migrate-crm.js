#!/usr/bin/env node
// Run: npm run migrate:crm
// Requires DATABASE_URL in environment

import 'dotenv/config'
import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Client } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))

const sql = readFileSync(
  join(__dirname, '../src/db/migrations/crm_schema.sql'),
  'utf8'
)

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL no está definida.')
  console.error('En Railway: agrega un servicio PostgreSQL y conecta la variable automáticamente.')
  process.exit(1)
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

console.log('Conectando a Railway PostgreSQL…')
await client.connect()

console.log('Ejecutando migración CRM…')
await client.query(sql)

console.log('✓ Tablas CRM creadas: crm_clients, crm_activities, crm_followups')
await client.end()
