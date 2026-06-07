const NodeCache = require('node-cache');
const XLSX      = require('xlsx');

const pjvCache = new NodeCache({ stdTTL: 3600 }); // 1 h

// ─── Factores de zona ─────────────────────────────────────────────────────────
// Factor multiplicador sobre valor catastral para estimar valor comercial
const FACTORES = {
  // CDMX — Premium
  'polanco':                3.2,
  'lomas de chapultepec':   3.0,
  'bosques de las lomas':   2.9,
  'santa fe':               2.8,
  'interlomas':             2.5,
  'condesa':                2.5,
  'roma':                   2.4,
  'pedregal':               2.7,
  'coyoacán':               2.1,
  'narvarte':               2.0,
  'benito juárez':          2.2,
  'miguel hidalgo':         2.3,
  'cdmx':                   2.1,
  'ciudad de mexico':       2.1,

  // Guadalajara / Jalisco
  'puerta de hierro':       2.8,
  'providencia':            2.6,
  'chapalita':              2.3,
  'zapopan':                2.2,
  'tlaquepaque':            1.8,
  'jalisco':                1.9,
  'guadalajara':            1.9,

  // Monterrey / NL
  'san pedro garza':        2.9,
  'valle':                  2.4,
  'cumbres':                2.1,
  'san nicolás':            1.9,
  'nuevo leon':             2.0,
  'monterrey':              2.0,

  // Otros estados
  'angelópolis':            2.2,
  'cholula':                2.0,
  'puebla':                 1.7,
  'queretaro':              1.8,
  'querétaro':              1.8,
  'estado de mexico':       1.6,
  'edomex':                 1.6,
  'veracruz':               1.5,
  'guanajuato':             1.6,
  'mérida':                 1.7,
  'merida':                 1.7,
  'tijuana':                1.7,

  // Default
  default:                  1.4
};

const DEPRECIACION_ANUAL = 0.02;  // 2 % por año
const MAX_DEPRECIACION   = 0.50;  // máximo 50 %

// ─── EstimadorValorComercial ──────────────────────────────────────────────────
class EstimadorValorComercial {
  /**
   * Estima el valor comercial de un inmueble con base en su valor catastral,
   * la zona y los años de antigüedad.
   * @param {number} catastral   Valor catastral en MXN
   * @param {string} ubicacion   Colonia, municipio o estado
   * @param {number} antiguedad  Años de antigüedad del inmueble
   */
  estimarValor(catastral, ubicacion, antiguedad = 0) {
    if (!catastral || isNaN(catastral) || catastral <= 0) {
      return { valor: 0, rentabilidad: 0, factores: { error: 'Valor catastral inválido o ausente' } };
    }

    const factorZona         = this._factorZona(ubicacion);
    const factorDepreciacion = this._depreciacion(Number(antiguedad) || 0);
    const valorBase          = catastral * factorZona;
    const valorAjustado      = valorBase * (1 - factorDepreciacion);

    // Varianza de mercado ±5 %
    const varianza   = (Math.random() * 0.10) - 0.05;
    const valorFinal = Math.round(valorAjustado * (1 + varianza));

    const rentabilidad = Math.round(((valorFinal - catastral) / catastral) * 1000) / 10;

    return {
      valor: valorFinal,
      rentabilidad,
      factores: {
        catastral,
        zona: ubicacion || 'Desconocida',
        factor_zona: factorZona,
        antiguedad_anos: Number(antiguedad) || 0,
        depreciacion_pct: Math.round(factorDepreciacion * 100),
        valor_base: Math.round(valorBase),
        valor_ajustado: Math.round(valorAjustado),
        varianza_pct: Math.round(varianza * 100)
      }
    };
  }

  _factorZona(ubicacion) {
    if (!ubicacion) return FACTORES.default;
    const u = ubicacion.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, ''); // quitar acentos para comparación parcial

    for (const [zona, factor] of Object.entries(FACTORES)) {
      if (zona === 'default') continue;
      const z = zona.normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (u.includes(z)) return factor;
    }
    return FACTORES.default;
  }

  _depreciacion(anos) {
    if (anos <= 0) return 0;
    return Math.min(anos * DEPRECIACION_ANUAL, MAX_DEPRECIACION);
  }
}

// ─── PJVQuery ─────────────────────────────────────────────────────────────────
// Simula consulta al Portal de Juzgados Virtuales del PJF.
// En producción reemplazar el body de buscarExpediente() con el request real.
class PJVQuery {
  async buscarExpediente(numero) {
    if (!numero) return { encontrado: false, status: 'Número no proporcionado', detalles: null };

    const cacheKey = `pjv:${numero}`;
    const cached   = pjvCache.get(cacheKey);
    if (cached) return cached;

    // Simular latencia de red
    await delay(80 + Math.random() * 180);

    const encontrado = Math.random() > 0.12; // 88 % encontrado

    const statuses = [
      'En proceso — Primera audiencia programada',
      'Sentencia favorable — En ejecución',
      'Apelación pendiente — Tribunal Superior',
      'Embargo ejecutado — Remate próximo',
      'Convenio de pago — Suspendido temporalmente',
      'Juicio oral mercantil en curso',
      'Amparo — Suspensión temporal',
      'Diligencias de ejecución en trámite',
      'Desahogo de pruebas en proceso',
      'Laudo arbitral — Pendiente homologación'
    ];

    const juzgados = [
      'Juzgado 1° Civil Federal',
      'Juzgado 3° de Distrito en Materia Civil',
      'Juzgado 7° Civil del Tribunal Superior',
      'Juzgado 12° Civil CDMX',
      'Juzgado 2° de Distrito Mercantil'
    ];

    const resultado = {
      numero_expediente: numero,
      encontrado,
      status: encontrado ? statuses[Math.floor(Math.random() * statuses.length)] : 'No encontrado en PJV',
      detalles: encontrado ? {
        juzgado:             juzgados[Math.floor(Math.random() * juzgados.length)],
        ultima_actualizacion: fechaAleatoria(90),
        actor:               'Institución bancaria',
        demandado:           'Propietario registrado',
        etapa:               encontrado ? 'En proceso' : null
      } : null,
      fuente:    'PJV (simulado)',
      timestamp: new Date().toISOString()
    };

    pjvCache.set(cacheKey, resultado);
    return resultado;
  }
}

// ─── ParsearCSV ───────────────────────────────────────────────────────────────
/**
 * Parsea el contenido de un CSV de cartera bancaria a un array de expedientes.
 * @param {string} contenido Texto completo del archivo CSV
 * @returns {{ expedientes: object[], errores: object[], total: number }}
 */
function ParsearCSV(contenido) {
  if (!contenido || typeof contenido !== 'string' || !contenido.trim()) {
    throw new Error('El archivo CSV está vacío o es inválido');
  }

  const lineas = contenido
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(l => l.trim());

  if (lineas.length < 2) {
    throw new Error('El CSV debe contener encabezados y al menos una fila de datos');
  }

  const sep     = detectSep(lineas[0]);
  const headers = splitLine(lineas[0], sep).map(h => normHeader(h.trim().toLowerCase()));

  // Mapear encabezados del CSV a nombres canónicos
  const mappedHeaders = headers.map(autoMap);

  // Verificar que exista al menos un campo identificador
  if (!mappedHeaders.includes('numero_expediente')) {
    throw new Error(
      `No se encontró columna de expediente. Encabezados detectados: [${headers.join(', ')}]. ` +
      `Renombra la columna identificadora a "numero_expediente", "expediente", "folio" o similar.`
    );
  }

  const expedientes = [];
  const errores     = [];

  for (let i = 1; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    if (!linea) continue;

    try {
      const vals = splitLine(linea, sep);
      const obj  = {};

      mappedHeaders.forEach((campo, idx) => {
        const raw = (vals[idx] || '').trim();
        obj[campo] = limpiarValor(campo, raw);
      });

      if (!obj.numero_expediente) {
        errores.push({ linea: i + 1, error: 'Número de expediente vacío — fila omitida' });
        continue;
      }

      expedientes.push(obj);
    } catch (e) {
      errores.push({ linea: i + 1, error: e.message });
    }
  }

  return { expedientes, errores, total: expedientes.length };
}

// ─── Helpers CSV ─────────────────────────────────────────────────────────────
function detectSep(linea) {
  const counts = { ',': 0, ';': 0, '\t': 0, '|': 0 };
  for (const ch of linea) if (ch in counts) counts[ch]++;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function splitLine(linea, sep) {
  const out = [];
  let campo = '';
  let inQ   = false;

  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"' && !inQ)                      { inQ = true; }
    else if (c === '"' && inQ && linea[i+1] === '"') { campo += '"'; i++; }
    else if (c === '"' && inQ)                  { inQ = false; }
    else if (c === sep && !inQ)                 { out.push(campo); campo = ''; }
    else                                        { campo += c; }
  }
  out.push(campo);
  return out;
}

function normHeader(h) {
  return h
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e')
    .replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o')
    .replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function autoMap(h) {
  const map = {
    expediente:          'numero_expediente',
    num_expediente:      'numero_expediente',
    numero:              'numero_expediente',
    no_expediente:       'numero_expediente',
    folio:               'numero_expediente',
    id_expediente:       'numero_expediente',
    institucion:         'banco',
    acreedor:            'banco',
    prestamista:         'banco',
    direccion:           'ubicacion',
    domicilio:           'ubicacion',
    ciudad:              'ubicacion',
    zona:                'ubicacion',
    colonia:             'ubicacion',
    municipio:           'ubicacion',
    catastral:           'valor_catastral',
    valor_avaluo:        'valor_catastral',
    avaluo:              'valor_catastral',
    valor_fiscal:        'valor_catastral',
    monto:               'monto_adeudo',
    adeudo:              'monto_adeudo',
    deuda:               'monto_adeudo',
    saldo:               'monto_adeudo',
    credito:             'monto_adeudo',
    prestamo:            'monto_adeudo',
    saldo_insoluto:      'monto_adeudo',
    fecha:               'fecha_inicio',
    fecha_apertura:      'fecha_inicio',
    fecha_credito:       'fecha_inicio',
    status:              'status_juridico',
    estatus:             'status_juridico',
    estado:              'status_juridico',
    etapa:               'status_juridico',
    antiguedad:          'antiguedad_inmueble',
    anos:                'antiguedad_inmueble',
    age:                 'antiguedad_inmueble',
    telefono:            'contacto',
    email:               'contacto',
    responsable:         'contacto',
    observaciones:       'notas',
    comentarios:         'notas'
  };
  return map[h] || h;
}

function limpiarValor(campo, valor) {
  if (valor === '' || valor === null || valor === undefined) return null;

  const numericos = ['valor_catastral', 'monto_adeudo', 'antiguedad_inmueble'];
  if (numericos.includes(campo)) {
    const n = parseFloat(valor.replace(/[$,\s]/g, '').replace(/MXN|USD|mx/gi, ''));
    return isNaN(n) ? null : n;
  }
  return valor;
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fechaAleatoria(diasAtras) {
  const d = new Date(Date.now() - Math.random() * diasAtras * 86400000);
  return d.toISOString().split('T')[0];
}

// ─── ParsearExcel ─────────────────────────────────────────────────────────────
/**
 * Parsea un buffer de archivo Excel (.xlsx / .xls) a array de expedientes.
 * Usa la primera hoja del libro.
 */
function ParsearExcel(buffer) {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  } catch (e) {
    throw new Error(`No se pudo leer el archivo Excel: ${e.message}`);
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('El archivo Excel no contiene hojas');

  const sheet = workbook.Sheets[sheetName];
  // header:1 → primera fila como array de encabezados
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rows.length < 2) {
    throw new Error('La hoja debe tener encabezados y al menos una fila de datos');
  }

  const headers       = rows[0].map(h => normHeader(String(h).trim().toLowerCase()));
  const mappedHeaders = headers.map(autoMap);

  if (!mappedHeaders.includes('numero_expediente')) {
    throw new Error(
      `No se encontró columna de expediente. Columnas detectadas: [${headers.join(', ')}]. ` +
      `Renombra la columna a "numero_expediente", "expediente" o "folio".`
    );
  }

  const expedientes = [];
  const errores     = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Saltar filas completamente vacías
    if (row.every(v => v === '' || v === null || v === undefined)) continue;

    try {
      const obj = {};
      mappedHeaders.forEach((campo, idx) => {
        const raw = String(row[idx] ?? '').trim();
        obj[campo] = limpiarValor(campo, raw);
      });

      if (!obj.numero_expediente) {
        errores.push({ linea: i + 1, error: 'Número de expediente vacío — fila omitida' });
        continue;
      }
      expedientes.push(obj);
    } catch (e) {
      errores.push({ linea: i + 1, error: e.message });
    }
  }

  return { expedientes, errores, total: expedientes.length };
}

// ─── ParsearArchivo (unificado CSV + Excel) ───────────────────────────────────
/**
 * Detecta el tipo de archivo por extensión y parsea con el método correcto.
 * @param {Buffer} buffer   Contenido del archivo
 * @param {string} filename Nombre original del archivo
 */
function ParsearArchivo(buffer, filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') {
    return ParsearExcel(buffer);
  }
  return ParsearCSV(buffer.toString('utf-8'));
}

module.exports = { EstimadorValorComercial, PJVQuery, ParsearCSV, ParsearExcel, ParsearArchivo };
