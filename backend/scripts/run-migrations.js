#!/usr/bin/env node
/**
 * run-migrations.js
 * Runs all pending SQL migrations against the Supabase database.
 *
 * Usage (from backend root):
 *   node -r dotenv/config scripts/run-migrations.js
 *
 * Each migration runs only once — a migrations_log table keeps track.
 * Safe to run multiple times.
 */

import 'dotenv/config'
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const MIGRATIONS_DIR = join(__dirname, '../src/db/migrations')

async function ensureLogTable() {
  // Create migrations log table if it doesn't exist
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS migrations_log (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  })

  // If rpc not available, try direct (will fail silently if already exists)
  if (error) {
    await supabase.from('migrations_log').select('id').limit(1).maybeSingle()
  }
}

async function getApplied() {
  const { data, error } = await supabase
    .from('migrations_log')
    .select('filename')

  if (error) {
    // Table might not exist yet — return empty
    return []
  }
  return (data || []).map(r => r.filename)
}

async function markApplied(filename) {
  await supabase
    .from('migrations_log')
    .insert({ filename })
}

async function runSQL(sql) {
  // Split by semicolons and run each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const stmt of statements) {
    const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' })
    if (error) throw new Error(error.message)
  }
}

async function main() {
  console.log('🚀 Kollybry — Running database migrations\n')
  console.log(`📁 Migrations directory: ${MIGRATIONS_DIR}\n`)

  // Get all migration files sorted
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort()

  if (files.length === 0) {
    console.log('No migration files found.')
    return
  }

  // Try to create log table
  await ensureLogTable()
  const applied = await getApplied()

  const pending = files.filter(f => !applied.includes(f))

  if (pending.length === 0) {
    console.log('✅ All migrations already applied:')
    files.forEach(f => console.log(`   ✓ ${f}`))
    return
  }

  console.log(`Already applied (${applied.length}):`)
  applied.forEach(f => console.log(`   ✓ ${f}`))

  console.log(`\nPending (${pending.length}):`)
  pending.forEach(f => console.log(`   → ${f}`))
  console.log()

  for (const filename of pending) {
    const filepath = join(MIGRATIONS_DIR, filename)
    const sql = readFileSync(filepath, 'utf8')

    process.stdout.write(`Running ${filename}... `)

    try {
      await runSQL(sql)
      await markApplied(filename)
      console.log('✅')
    } catch (err) {
      console.log('❌')
      console.error(`   Error: ${err.message}`)
      console.error(`\n⚠️  Migration failed. Fix the error and re-run.`)
      console.error(`   If the migration already ran manually, you can mark it as applied:`)
      console.error(`   INSERT INTO migrations_log (filename) VALUES ('${filename}');`)
      process.exit(1)
    }
  }

  console.log('\n✅ All migrations applied successfully.')
  console.log('\n📋 Current state:')
  files.forEach(f => console.log(`   ✓ ${f}`))
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
