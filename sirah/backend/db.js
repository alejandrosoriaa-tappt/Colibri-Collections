const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) return null;
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  return pool;
}

// ─── In-memory fallback (sin DATABASE_URL) ────────────────────────────────────
let memArchivos    = [];
let memExpedientes = [];
let memId  = 1;
let memSeq = 1;

// ─── Estado → abreviatura oficial ────────────────────────────────────────────
const ESTADO_ABBR = {
  'AGUASCALIENTES': 'AGS', 'BAJA CALIFORNIA': 'BC', 'BAJA CALIFORNIA SUR': 'BCS',
  'CAMPECHE': 'CAM', 'CHIAPAS': 'CHIS', 'CHIHUAHUA': 'CHIH',
  'CIUDAD DE MEXICO': 'CDMX', 'CDMX': 'CDMX', 'COAHUILA': 'COAH',
  'COLIMA': 'COL', 'DURANGO': 'DGO', 'GUANAJUATO': 'GTO',
  'GUERRERO': 'GRO', 'HIDALGO': 'HGO', 'JALISCO': 'JAL',
  'MEXICO': 'MEX', 'ESTADO DE MEXICO': 'MEX', 'EDO. DE MEXICO': 'MEX',
  'MICHOACAN': 'MICH', 'MICHOACÁN': 'MICH', 'MORELOS': 'MOR',
  'NAYARIT': 'NAY', 'NUEVO LEON': 'NL', 'NUEVO LEÓN': 'NL',
  'OAXACA': 'OAX', 'PUEBLA': 'PUE', 'QUERETARO': 'QRO', 'QUERÉTARO': 'QRO',
  'QUINTANA ROO': 'QROO', 'SAN LUIS POTOSI': 'SLP', 'SAN LUIS POTOSÍ': 'SLP',
  'SINALOA': 'SIN', 'SONORA': 'SON', 'TABASCO': 'TAB',
  'TAMAULIPAS': 'TAMS', 'TLAXCALA': 'TLAX', 'VERACRUZ': 'VER',
  'YUCATAN': 'YUC', 'YUCATÁN': 'YUC', 'ZACATECAS': 'ZAC',
};

function estadoAbbr(estado) {
  if (!estado) return 'XX';
  const key = estado.toUpperCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, ''); // remove accents for lookup
  return ESTADO_ABBR[estado.toUpperCase().trim()] || ESTADO_ABBR[key] || key.slice(0, 3);
}

function buildClave(estadoGeo, seq) {
  const yy   = String(new Date().getFullYear()).slice(-2);
  const abbr = estadoAbbr(estadoGeo);
  return `SIRAH-${abbr}-${yy}-${String(seq).padStart(5, '0')}`;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const SQL_SCHEMA = `
  CREATE SEQUENCE IF NOT EXISTS sirah_exp_seq START 1;

  CREATE TABLE IF NOT EXISTS archivos (
    id             SERIAL PRIMARY KEY,
    nombre         TEXT NOT NULL,
    nombre_display TEXT,
    total          INTEGER DEFAULT 0,
    created_at     TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS expedientes (
    id                  SERIAL PRIMARY KEY,
    archivo_id          INTEGER REFERENCES archivos(id) ON DELETE CASCADE,
    numero_expediente   TEXT,
    folio_banco         TEXT,
    nombre_archivo      TEXT,
    banco               TEXT,
    estado_geo          TEXT,
    municipio           TEXT,
    ubicacion           TEXT,
    valor_catastral     NUMERIC,
    monto_adeudo        NUMERIC,
    fecha_inicio        TEXT,
    status_juridico     TEXT,
    antiguedad_inmueble INTEGER,
    contacto            TEXT,
    notas               TEXT,
    tipo_cartera        TEXT,
    valor_estimado      NUMERIC,
    rentabilidad        NUMERIC,
    factores            JSONB,
    status_pjv          TEXT,
    detalles_pjv        JSONB,
    created_at          TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_exp_archivo_id ON expedientes (archivo_id);
  CREATE INDEX IF NOT EXISTS idx_exp_banco       ON expedientes (banco);
  CREATE INDEX IF NOT EXISTS idx_exp_estado_geo  ON expedientes (estado_geo);
  CREATE INDEX IF NOT EXISTS idx_exp_status      ON expedientes (status_juridico);
`;

async function createTablesIfNotExist() {
  const p = getPool();
  if (!p) {
    console.log('⚠️  DATABASE_URL no configurado → usando almacenamiento en memoria');
    console.log('   Agrega el plugin PostgreSQL en Railway para persistencia');
    return;
  }
  try {
    await p.query(SQL_SCHEMA);
    await p.query(`ALTER TABLE expedientes ADD COLUMN IF NOT EXISTS favorito    BOOLEAN DEFAULT FALSE`);
    await p.query(`ALTER TABLE expedientes ADD COLUMN IF NOT EXISTS clave_sirah TEXT`);
    await p.query(`CREATE INDEX IF NOT EXISTS idx_exp_clave ON expedientes (clave_sirah)`);
    console.log('✓ Tablas verificadas (PostgreSQL Railway)');

    // Backfill claves for existing records that have none
    const { rows: [{ cnt }] } = await p.query(`SELECT COUNT(*)::int AS cnt FROM expedientes WHERE clave_sirah IS NULL`);
    if (cnt > 0) {
      console.log(`🔄 Generando claves SIRAH para ${cnt} expedientes sin clave…`);
      const seqRes = await p.query(`SELECT nextval('sirah_exp_seq') AS seq FROM generate_series(1,$1)`, [cnt]);
      const seqs   = seqRes.rows.map(r => Number(r.seq));
      const { rows: toFill } = await p.query(`SELECT id, estado_geo FROM expedientes WHERE clave_sirah IS NULL ORDER BY id ASC`);
      for (let i = 0; i < toFill.length; i++) {
        await p.query(`UPDATE expedientes SET clave_sirah=$1 WHERE id=$2`, [buildClave(toFill[i].estado_geo, seqs[i]), toFill[i].id]);
      }
      console.log(`✓ ${cnt} claves SIRAH generadas`);
    }
  } catch (err) {
    console.error('✗ Error creando tablas:', err.message);
    pool = null;
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function calcStats(rows) {
  const total      = rows.length;
  const valorTotal = rows.reduce((s, e) => s + (Number(e.valor_estimado) || 0), 0);
  const rentTotal  = rows.reduce((s, e) => s + (Number(e.rentabilidad)   || 0), 0);
  const porBanco = {}, porUbicacion = {};
  rows.forEach(e => {
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

// ─── insertArchivo ────────────────────────────────────────────────────────────
async function insertArchivo(nombre, total) {
  const p = getPool();
  if (!p) {
    const a = { id: memId++, nombre, nombre_display: null, total, created_at: new Date().toISOString() };
    memArchivos.push(a);
    return { data: a, error: null };
  }
  try {
    const { rows } = await p.query(
      'INSERT INTO archivos (nombre, total) VALUES ($1, $2) RETURNING *',
      [nombre, total]
    );
    return { data: rows[0], error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

// ─── getArchivos ──────────────────────────────────────────────────────────────
async function getArchivos() {
  const p = getPool();
  if (!p) return { data: [...memArchivos].reverse(), error: null };
  try {
    const { rows } = await p.query('SELECT * FROM archivos ORDER BY created_at DESC');
    return { data: rows, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

// ─── renameArchivo ────────────────────────────────────────────────────────────
async function renameArchivo(id, nombreDisplay) {
  const p = getPool();
  if (!p) {
    const a = memArchivos.find(x => x.id === Number(id));
    if (a) a.nombre_display = nombreDisplay;
    return { data: a || null, error: null };
  }
  try {
    const { rows } = await p.query(
      'UPDATE archivos SET nombre_display=$1 WHERE id=$2 RETURNING *',
      [nombreDisplay, id]
    );
    return { data: rows[0] || null, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

// ─── deleteArchivo ────────────────────────────────────────────────────────────
async function deleteArchivo(id) {
  const p = getPool();
  if (!p) {
    memArchivos    = memArchivos.filter(x => x.id !== Number(id));
    memExpedientes = memExpedientes.filter(x => x.archivo_id !== Number(id));
    return { error: null };
  }
  try {
    await p.query('DELETE FROM archivos WHERE id=$1', [id]);
    return { error: null };
  } catch (err) {
    return { error: err };
  }
}

// ─── insertExpedientes ────────────────────────────────────────────────────────
const EXP_COLS = [
  'clave_sirah',
  'archivo_id','numero_expediente','folio_banco','nombre_archivo',
  'banco','estado_geo','municipio','ubicacion',
  'valor_catastral','monto_adeudo','fecha_inicio','status_juridico',
  'antiguedad_inmueble','contacto','notas','tipo_cartera',
  'valor_estimado','rentabilidad','factores','status_pjv','detalles_pjv'
];

function rowParams(row, archivoId, clave) {
  return [
    clave,
    archivoId,
    row.numero_expediente   || null,
    row.folio_banco         || null,
    row.nombre_archivo      || null,
    row.banco               || null,
    row.estado_geo          || null,
    row.municipio           || null,
    row.ubicacion           || null,
    row.valor_catastral     != null ? Number(row.valor_catastral)      : null,
    row.monto_adeudo        != null ? Number(row.monto_adeudo)         : null,
    row.fecha_inicio        || null,
    row.status_juridico     || null,
    row.antiguedad_inmueble != null ? Number(row.antiguedad_inmueble)  : null,
    row.contacto            || null,
    row.notas               || null,
    row.tipo_cartera        || null,
    row.valor_estimado      != null ? Number(row.valor_estimado)       : null,
    row.rentabilidad        != null ? Number(row.rentabilidad)         : null,
    row.factores            != null ? JSON.stringify(row.factores)     : null,
    row.status_pjv          || null,
    row.detalles_pjv        != null ? JSON.stringify(row.detalles_pjv) : null,
  ];
}

async function insertExpedientes(rows, archivoId) {
  const p = getPool();
  if (!p) {
    const inserted = rows.map(r => ({
      ...r,
      id: memId++,
      archivo_id:  archivoId,
      clave_sirah: buildClave(r.estado_geo, memSeq++),
      created_at:  new Date().toISOString()
    }));
    memExpedientes.push(...inserted);
    return { data: inserted, error: null };
  }
  const CHUNK = 100;
  const all = [];
  try {
    // Obtain a block of sequence values in one query
    const seqRes = await p.query(
      `SELECT nextval('sirah_exp_seq') AS seq FROM generate_series(1, $1)`,
      [rows.length]
    );
    const seqs = seqRes.rows.map(r => Number(r.seq));

    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const vals = [], params = [];
      let pi = 1;
      for (let j = 0; j < chunk.length; j++) {
        const row   = chunk[j];
        const clave = buildClave(row.estado_geo, seqs[i + j]);
        const rp    = rowParams(row, archivoId, clave);
        vals.push(`(${rp.map(() => `$${pi++}`).join(',')})`);
        params.push(...rp);
      }
      const sql = `INSERT INTO expedientes (${EXP_COLS.join(',')}) VALUES ${vals.join(',')} RETURNING *`;
      const res = await p.query(sql, params);
      all.push(...res.rows);
    }
    return { data: all, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

// ─── getExpedientes ───────────────────────────────────────────────────────────
async function getExpedientes(filters = {}) {
  const p = getPool();
  if (!p) {
    let res = [...memExpedientes];
    if (filters.archivo_id) res = res.filter(e => e.archivo_id === Number(filters.archivo_id));
    if (filters.banco)      res = res.filter(e => e.banco?.toLowerCase().includes(filters.banco.toLowerCase()));
    if (filters.estado_geo) res = res.filter(e => e.estado_geo === filters.estado_geo);
    if (filters.status)     res = res.filter(e => e.status_juridico === filters.status);
    return { data: res, error: null };
  }
  const conds = [], params = [];
  let pi = 1;
  if (filters.archivo_id) { conds.push(`archivo_id=$${pi++}`);     params.push(filters.archivo_id); }
  if (filters.banco)      { conds.push(`banco ILIKE $${pi++}`);     params.push(`%${filters.banco}%`); }
  if (filters.estado_geo) { conds.push(`estado_geo=$${pi++}`);      params.push(filters.estado_geo); }
  if (filters.status)     { conds.push(`status_juridico=$${pi++}`); params.push(filters.status); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  try {
    const { rows } = await p.query(
      `SELECT * FROM expedientes ${where} ORDER BY id ASC`, params
    );
    return { data: rows, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

// ─── getExpedienteById ────────────────────────────────────────────────────────
async function getExpedienteById(id) {
  const p = getPool();
  if (!p) {
    const found = memExpedientes.find(e => String(e.id) === String(id));
    return found ? { data: found, error: null } : { data: null, error: { message: 'No encontrado' } };
  }
  try {
    const { rows } = await p.query('SELECT * FROM expedientes WHERE id=$1', [id]);
    return rows.length
      ? { data: rows[0], error: null }
      : { data: null, error: { message: 'No encontrado' } };
  } catch (err) {
    return { data: null, error: err };
  }
}

// ─── getEstadisticas ──────────────────────────────────────────────────────────
async function getEstadisticas() {
  const p = getPool();
  if (!p) return { data: calcStats(memExpedientes), error: null };
  try {
    const { rows } = await p.query(
      'SELECT banco, ubicacion, valor_estimado, rentabilidad FROM expedientes'
    );
    return { data: calcStats(rows), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

// ─── toggleFavorito ───────────────────────────────────────────────────────────
async function toggleFavorito(id) {
  const p = getPool();
  if (!p) {
    const exp = memExpedientes.find(e => String(e.id) === String(id));
    if (exp) exp.favorito = !exp.favorito;
    return { data: exp ? { id: exp.id, favorito: exp.favorito } : null, error: null };
  }
  try {
    const { rows } = await p.query(
      'UPDATE expedientes SET favorito = NOT COALESCE(favorito, FALSE) WHERE id=$1 RETURNING id, favorito',
      [id]
    );
    return { data: rows[0] || null, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

module.exports = {
  createTablesIfNotExist,
  insertArchivo, getArchivos, renameArchivo, deleteArchivo,
  insertExpedientes, getExpedientes, getExpedienteById, getEstadisticas,
  toggleFavorito
};
