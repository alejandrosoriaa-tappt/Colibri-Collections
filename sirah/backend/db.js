const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

// ─── Cliente Supabase ─────────────────────────────────────────────────────────
let supabase = null;

function getClient() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (!url || !key || url.includes('your-project-id')) {
    return null;
  }

  supabase = createClient(url, key);
  return supabase;
}

// ─── Almacenamiento en memoria (fallback sin Supabase) ────────────────────────
let memStore = [];
let memIdCounter = 1;

// ─── SQL para crear tabla (ejecutar manualmente en Supabase Dashboard > SQL Editor)
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS expedientes (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_expediente TEXT      NOT NULL,
  banco           TEXT,
  ubicacion       TEXT,
  valor_catastral NUMERIC,
  monto_adeudo    NUMERIC,
  fecha_inicio    DATE,
  status_juridico TEXT,
  antiguedad_inmueble INTEGER,
  contacto        TEXT,
  notas           TEXT,
  valor_estimado  NUMERIC,
  rentabilidad    NUMERIC,
  factores        JSONB,
  status_pjv      TEXT,
  detalles_pjv    JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expedientes_banco      ON expedientes (banco);
CREATE INDEX IF NOT EXISTS idx_expedientes_ubicacion  ON expedientes (ubicacion);
CREATE INDEX IF NOT EXISTS idx_expedientes_status     ON expedientes (status_juridico);
`;

async function createTablesIfNotExist() {
  const client = getClient();

  if (!client) {
    console.log('⚠️  Supabase no configurado → usando almacenamiento en memoria');
    console.log('   Configura SUPABASE_URL y SUPABASE_KEY en .env para persistencia');
    return;
  }

  // Intenta hacer un SELECT; si falla con 42P01 la tabla no existe
  const { error } = await client.from('expedientes').select('id').limit(1);

  if (error?.code === '42P01') {
    console.log('⚠️  Tabla "expedientes" no encontrada. Ejecuta esto en Supabase SQL Editor:');
    console.log('─'.repeat(60));
    console.log(CREATE_TABLE_SQL);
    console.log('─'.repeat(60));
    console.log('   Mientras tanto, usando almacenamiento en memoria.');
    supabase = null; // fallback to memory
  } else if (error) {
    console.log(`⚠️  Error verificando BD: ${error.message}. Usando memoria.`);
    supabase = null;
  } else {
    console.log('✓ Tabla "expedientes" verificada en Supabase');
  }
}

// ─── Helpers numéricos ────────────────────────────────────────────────────────
function memStats(data) {
  const total = data.length;
  const valorTotal = data.reduce((s, e) => s + (Number(e.valor_estimado) || 0), 0);
  const rentTotal  = data.reduce((s, e) => s + (Number(e.rentabilidad)   || 0), 0);

  const porBanco = {};
  const porUbicacion = {};
  data.forEach(e => {
    if (e.banco)     porBanco[e.banco]         = (porBanco[e.banco]         || 0) + 1;
    if (e.ubicacion) porUbicacion[e.ubicacion] = (porUbicacion[e.ubicacion] || 0) + 1;
  });

  return {
    total,
    valor_total:           valorTotal,
    promedio_valor:        total ? valorTotal / total : 0,
    rentabilidad_promedio: total ? rentTotal  / total : 0,
    por_banco:      porBanco,
    por_ubicacion:  porUbicacion
  };
}

// ─── insertExpedientes ────────────────────────────────────────────────────────
async function insertExpedientes(rows) {
  const client = getClient();

  if (!client) {
    const inserted = rows.map(r => ({
      ...r,
      id: `mem-${memIdCounter++}`,
      created_at: new Date().toISOString()
    }));
    memStore.push(...inserted);
    return { data: inserted, error: null };
  }

  const { data, error } = await client
    .from('expedientes')
    .upsert(rows, { onConflict: 'numero_expediente', ignoreDuplicates: false })
    .select();

  return { data, error };
}

// ─── getExpedientes ───────────────────────────────────────────────────────────
async function getExpedientes(filters = {}) {
  const client = getClient();

  if (!client) {
    let results = [...memStore];
    if (filters.ubicacion) {
      const q = filters.ubicacion.toLowerCase();
      results = results.filter(e => e.ubicacion?.toLowerCase().includes(q));
    }
    if (filters.banco) {
      const q = filters.banco.toLowerCase();
      results = results.filter(e => e.banco?.toLowerCase().includes(q));
    }
    if (filters.status) {
      results = results.filter(e => e.status_juridico === filters.status);
    }
    return { data: results, error: null };
  }

  let q = client.from('expedientes').select('*').order('created_at', { ascending: false });
  if (filters.ubicacion) q = q.ilike('ubicacion',       `%${filters.ubicacion}%`);
  if (filters.banco)     q = q.ilike('banco',           `%${filters.banco}%`);
  if (filters.status)    q = q.eq('status_juridico',    filters.status);

  return await q;
}

// ─── getExpedienteById ────────────────────────────────────────────────────────
async function getExpedienteById(id) {
  const client = getClient();

  if (!client) {
    const found = memStore.find(e => e.id === id);
    return found
      ? { data: found, error: null }
      : { data: null, error: { message: 'No encontrado' } };
  }

  return await client.from('expedientes').select('*').eq('id', id).single();
}

// ─── getExpedientesByUbicacion ────────────────────────────────────────────────
async function getExpedientesByUbicacion(ubicacion) {
  return getExpedientes({ ubicacion });
}

// ─── getEstadisticas ──────────────────────────────────────────────────────────
async function getEstadisticas() {
  const client = getClient();

  if (!client) {
    return { data: memStats(memStore), error: null };
  }

  const { data, error } = await client
    .from('expedientes')
    .select('banco, ubicacion, valor_estimado, rentabilidad');

  if (error) return { data: null, error };

  return { data: memStats(data), error: null };
}

module.exports = {
  createTablesIfNotExist,
  insertExpedientes,
  getExpedientes,
  getExpedienteById,
  getExpedientesByUbicacion,
  getEstadisticas
};
