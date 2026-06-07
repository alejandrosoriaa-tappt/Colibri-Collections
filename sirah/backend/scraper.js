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
    id_expediente:       'numero_expediente',
    // folio / id son IDs internos del banco, no el número de expediente judicial
    folio:               'folio_banco',
    id:                  'folio_banco',
    id_credito:          'folio_banco',
    numero_credito:      'folio_banco',
    num_credito:         'folio_banco',
    clave:               'folio_banco',
    clave_credito:       'folio_banco',
    cuenta:              'folio_banco',
    num_cuenta:          'folio_banco',
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

// ─── LeerHojasExcel ──────────────────────────────────────────────────────────
/**
 * Lee un Excel y devuelve metadata de cada hoja: nombre, filas, columnas detectadas.
 * No parsea — solo inspecciona.
 */
function LeerHojasExcel(buffer, filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (!['xlsx', 'xls'].includes(ext)) {
    return [{ nombre: 'CSV', filas: '—', columnas: [], es_csv: true }];
  }

  let wb;
  try { wb = XLSX.read(buffer, { type: 'buffer', sheetRows: 3 }); }
  catch (e) { throw new Error(`No se pudo leer el Excel: ${e.message}`); }

  return wb.SheetNames.map(nombre => {
    const sheet = wb.Sheets[nombre];
    const rows  = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const cols  = rows[0]
      ? rows[0].map(h => String(h).trim()).filter(Boolean)
      : [];
    return {
      nombre,
      filas:    Math.max(0, rows.length - 1),
      columnas: cols,
      mapeo:    cols.map(c => ({ original: c, mapeado: autoMap(normHeader(c.toLowerCase())) }))
    };
  });
}

// ─── AnalizadorColumnas ───────────────────────────────────────────────────────
/**
 * Analiza los valores reales de una columna para inferir su tipo semántico,
 * independientemente del nombre del encabezado.
 */
class AnalizadorColumnas {
  /**
   * Analiza una muestra de valores y devuelve el tipo inferido con su confianza.
   * @param {string[]} valores  Array de valores (hasta 20 no vacíos)
   * @returns {{ tipo: string, confianza: number, scores: object, muestra: string[] }}
   */
  static analizar(valores) {
    // Filtrar valores vacíos y tomar hasta 20 muestras
    const muestra = valores
      .map(v => String(v ?? '').trim())
      .filter(v => v !== '')
      .slice(0, 20);

    if (muestra.length === 0) {
      return { tipo: 'desconocido', confianza: 0, scores: {}, muestra: [] };
    }

    const scores = {
      numero_expediente: AnalizadorColumnas._scoreExpediente(muestra),
      banco:             AnalizadorColumnas._scoreBanco(muestra),
      ubicacion:         AnalizadorColumnas._scoreUbicacion(muestra),
      numerico_grande:   AnalizadorColumnas._scoreNumericoGrande(muestra),
      fecha_inicio:      AnalizadorColumnas._scoreFecha(muestra),
      status_juridico:   AnalizadorColumnas._scoreStatus(muestra),
      antiguedad_inmueble: AnalizadorColumnas._scoreAntiguedad(muestra),
      contacto:          AnalizadorColumnas._scoreContacto(muestra)
    };

    // Encontrar el tipo con mayor score
    const [tipo, confianza] = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])[0];

    return { tipo, confianza, scores, muestra };
  }

  // ── Scoring helpers ────────────────────────────────────────────────────────

  static _scoreExpediente(muestra) {
    const patrones = [
      /^\d{1,8}\/\d{4}/,
      /^[A-Za-z]{1,5}-?\d{3,}/i,
      /^\d{4,15}$/,
      /^\w+\/\w+\/\w+$/
    ];

    // Patterns that disqualify a value from being an expediente
    const patronesFecha = [
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,   // dd/mm/yyyy
      /^\d{4}-\d{2}-\d{2}$/,             // yyyy-mm-dd
      /^\d{2}-\d{2}-\d{4}$/,             // dd-mm-yyyy
      /^\d{1,2}-[a-z]{3}-\d{2,4}$/i      // dd-mon-yy
    ];

    let coincidencias = 0;
    for (const v of muestra) {
      const vTrim = v.trim();

      // Exclude values that are clearly dates
      if (patronesFecha.some(p => p.test(vTrim))) continue;

      // Exclude pure numeric values > 10,000 (those are amounts, not expedientes)
      const n = parseFloat(vTrim.replace(/[$,\s]/g, ''));
      if (!isNaN(n) && n > 10000 && /^\d+$/.test(vTrim)) continue;

      if (patrones.some(p => p.test(vTrim))) coincidencias++;
    }

    // Penalizar si hay valores repetidos (expedientes son únicos)
    const unicos = new Set(muestra).size;
    const unicidadFactor = muestra.length > 1 ? unicos / muestra.length : 1;

    return (coincidencias / muestra.length) * unicidadFactor;
  }

  static _scoreBanco(muestra) {
    const bancos = [
      'bbva', 'santander', 'banamex', 'citibanamex', 'hsbc', 'banorte',
      'scotiabank', 'inbursa', 'banbajio', 'banregio', 'afirme', 'bancoppel',
      'azteca', 'nafin', 'fovissste', 'infonavit'
    ];

    let coincidencias = 0;
    for (const v of muestra) {
      const vLow = v.toLowerCase();
      if (bancos.some(b => vLow.includes(b))) coincidencias++;
    }

    return coincidencias / muestra.length;
  }

  static _scoreUbicacion(muestra) {
    const palabrasClave = [
      'calle', 'avenida', 'av.', 'blvd', 'boulevard', 'fracc', 'colonia',
      'col.', 'municipio', 'interior', 'int.', 'km.', 'carretera', 'privada',
      'callejon', 'andador', 'circuito', 'paseo'
    ];

    let scoreTotal = 0;
    for (const v of muestra) {
      const vLow = v.toLowerCase();
      let scoreValor = 0;

      // Tiene palabras clave de dirección
      if (palabrasClave.some(p => vLow.includes(p))) scoreValor += 0.5;
      // Longitud > 20 caracteres
      if (v.length > 20) scoreValor += 0.3;
      // Mezcla dígitos con letras
      if (/[a-zA-Z]/.test(v) && /\d/.test(v)) scoreValor += 0.2;
      // Contiene comas
      if (v.includes(',')) scoreValor += 0.1;

      scoreTotal += Math.min(scoreValor, 1.0);
    }

    return scoreTotal / muestra.length;
  }

  static _scoreNumericoGrande(muestra) {
    let coincidencias = 0;
    for (const v of muestra) {
      const limpio = v.replace(/[$,\s]/g, '').replace(/MXN|USD|mx/gi, '');
      const n = parseFloat(limpio);
      if (!isNaN(n) && n > 10000) coincidencias++;
    }
    return coincidencias / muestra.length;
  }

  static _scoreFecha(muestra) {
    const patrones = [
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{2}-\d{2}-\d{4}$/,
      /^\d{1,2}-[a-z]{3}-\d{2,4}$/i
    ];

    let coincidencias = 0;
    for (const v of muestra) {
      const vTrim = v.trim();
      // Verificar patrones de fecha textual
      if (patrones.some(p => p.test(vTrim))) {
        coincidencias++;
        continue;
      }
      // Números seriales de Excel (enteros entre 30000-50000)
      const n = parseInt(vTrim, 10);
      if (!isNaN(n) && n >= 30000 && n <= 50000 && String(n) === vTrim) {
        coincidencias++;
      }
    }
    return coincidencias / muestra.length;
  }

  static _scoreStatus(muestra) {
    const terminos = [
      'embargo', 'juicio', 'amparo', 'remate', 'demanda', 'ejecucion',
      'sentencia', 'apelacion', 'convenio', 'suspension', 'adjudicado',
      'diligencia', 'audiencia', 'juzgado', 'gravamen', 'hipoteca'
    ];

    let coincidencias = 0;
    for (const v of muestra) {
      const vLow = v.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (terminos.some(t => vLow.includes(t))) coincidencias++;
    }
    return coincidencias / muestra.length;
  }

  static _scoreAntiguedad(muestra) {
    let validos = 0;
    let penalizar = false;

    for (const v of muestra) {
      const n = parseInt(v.trim(), 10);
      if (!isNaN(n) && String(n) === v.trim()) {
        if (n >= 1 && n <= 100) {
          validos++;
        } else {
          penalizar = true;
        }
      }
    }

    if (penalizar) return 0;
    return validos / muestra.length;
  }

  static _scoreContacto(muestra) {
    let scoreTotal = 0;
    for (const v of muestra) {
      // Contiene @  → email
      if (/@/.test(v)) { scoreTotal += 1.0; continue; }
      // 10 dígitos consecutivos → teléfono
      if (/\d{10}/.test(v.replace(/[\s\-().]/g, ''))) { scoreTotal += 0.8; continue; }
      // Nombre de persona: solo letras, 2 palabras, 5-40 chars
      if (/^[A-Za-záéíóúÁÉÍÓÚñÑ\s.]+$/.test(v) && v.length >= 5 && v.length <= 40) {
        const palabras = v.trim().split(/\s+/);
        if (palabras.length >= 2) scoreTotal += 0.3;
      }
    }
    return scoreTotal / muestra.length;
  }
}

// ─── Detectar fila real de encabezados ───────────────────────────────────────
// Muchos archivos bancarios tienen filas de título antes de los encabezados reales.
// Busca la primera fila con ≥3 celdas no vacías de texto corto (< 60 chars, no solo números).
function encontrarFilaHeader(rows) {
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    const noVacias = row.filter(v => v !== '' && v !== null && v !== undefined);
    if (noVacias.length < 2) continue;
    const parecenHeaders = noVacias.filter(v => {
      const s = String(v).trim();
      if (s.length === 0 || s.length > 80) return false;
      // Descarta valores que son solo números o fechas
      const sinFormato = s.replace(/[$,.\s]/g, '');
      if (!isNaN(Number(sinFormato)) && sinFormato.length > 0) return false;
      return true;
    });
    if (parecenHeaders.length >= Math.max(2, noVacias.length * 0.5)) {
      if (i > 0) console.log(`  ℹ️  Filas de título detectadas: ${i} fila(s) antes de encabezados`);
      return i;
    }
  }
  return 0;
}

// ─── ParsearHoja (una hoja de Excel) ─────────────────────────────────────────
function ParsearHoja(rows, nombreHoja, nombreArchivo = null) {
  if (!rows || rows.length < 2) return { expedientes: [], errores: [], total: 0, mapeo_columnas: [] };

  const headerRowIdx  = encontrarFilaHeader(rows);
  const dataRows      = rows.slice(headerRowIdx + 1).filter(r => r && !r.every(v => v === '' || v === null || v === undefined));
  if (dataRows.length === 0) return { expedientes: [], errores: [], total: 0, mapeo_columnas: [] };

  const rawHeaders    = rows[headerRowIdx].map(h => String(h ?? '').trim());
  const headers       = rawHeaders.map(h => normHeader(h.toLowerCase()));
  const mappedHeaders = headers.map(autoMap);

  // Guardar columnas originales no mapeadas como campo extra
  const columnasOriginales = rawHeaders;

  // ── Análisis semántico de columnas por contenido ──────────────────────────
  const sampleRows = dataRows.slice(0, 30);

  const reporteMapeo = [];
  const finalMappedHeaders = mappedHeaders.map((headerMap, colIdx) => {
    const valoresMuestra = sampleRows
      .map(r => String(r?.[colIdx] ?? '').trim())
      .filter(v => v !== '')
      .slice(0, 20);

    if (valoresMuestra.length === 0) {
      reporteMapeo.push({
        columna_original: rawHeaders[colIdx],
        campo_mapeado:    headerMap,
        metodo:           'encabezado',
        confianza:        0
      });
      return headerMap;
    }

    const analisis  = AnalizadorColumnas.analizar(valoresMuestra);
    const contentTipo = analisis.tipo;
    const contentConf = analisis.confianza;

    // Determinar si el mapeo por encabezado es a un campo schema conocido
    const headerEsSchema = CAMPOS_SCHEMA.includes(headerMap);

    let tipoFinal;
    let metodo;
    let confianzaFinal;

    // folio_banco es una regla de negocio explícita: el folio del banco NO es el
    // expediente judicial aunque el contenido parezca un ID. Nunca dejar que el
    // content scorer lo convierta en numero_expediente.
    const CAMPOS_FIJOS = ['folio_banco', 'nombre_archivo'];

    if (CAMPOS_FIJOS.includes(headerMap)) {
      tipoFinal      = headerMap;
      metodo         = 'encabezado-fijo';
      confianzaFinal = 1.0;
    } else if (headerEsSchema && contentConf < 0.55) {
      // Encabezado reconocido y contenido no aporta nada mejor → mantener header
      tipoFinal      = headerMap;
      metodo         = 'encabezado';
      confianzaFinal = 0.95;
    } else if (!headerEsSchema && contentConf >= 0.55) {
      // Encabezado no reconocido pero contenido da buena señal → usar contenido
      tipoFinal      = resolverNumericoGrande(contentTipo, headerMap, rawHeaders[colIdx]);
      metodo         = 'contenido';
      confianzaFinal = contentConf;
    } else if (headerEsSchema && contentConf >= 0.55 && contentTipo !== headerMap) {
      const headerConf = 0.60;
      if (contentConf > headerConf) {
        tipoFinal      = resolverNumericoGrande(contentTipo, headerMap, rawHeaders[colIdx]);
        metodo         = 'contenido';
        confianzaFinal = contentConf;
      } else {
        tipoFinal      = headerMap;
        metodo         = 'encabezado';
        confianzaFinal = headerConf;
      }
    } else {
      // Default: mantener header mapping
      tipoFinal      = headerMap;
      metodo         = 'encabezado';
      confianzaFinal = headerEsSchema ? 0.95 : 0.30;
    }

    console.log(`  🔍 "${rawHeaders[colIdx]}" → "${tipoFinal}" (header: ${headerMap}, contenido: ${contentTipo} ${Math.round(contentConf * 100)}%)`);

    reporteMapeo.push({
      columna_original: rawHeaders[colIdx],
      campo_mapeado:    tipoFinal,
      metodo,
      confianza:        Math.round(confianzaFinal * 100)
    });

    return tipoFinal;
  });

  // Caso especial: dos columnas compiten como numerico_grande → desambiguar por header
  _desambiguarNumericos(finalMappedHeaders, mappedHeaders, rawHeaders, reporteMapeo);

  // Desambiguar duplicados: si dos columnas mapean al mismo campo schema,
  // marcar la segunda como _dup_<campo> para guardarla en notas
  const camposUsados = {};
  const finalMappedHeadersDedup = finalMappedHeaders.map((campo, idx) => {
    if (!CAMPOS_SCHEMA.includes(campo)) return campo;
    if (camposUsados[campo] === undefined) { camposUsados[campo] = idx; return campo; }
    return `_dup_${campo}`;
  });

  const expedientes = [];
  const errores     = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];

    try {
      const obj = { tipo_cartera: nombreHoja, nombre_archivo: nombreArchivo || null };

      finalMappedHeadersDedup.forEach((campo, idx) => {
        const raw = String(row[idx] ?? '').trim();
        if (!raw) return;

        if (campo.startsWith('_dup_')) {
          // Columna duplicada: guardar con nombre original en notas
          if (!obj._extra) obj._extra = {};
          obj._extra[columnasOriginales[idx]] = raw;
        } else if (campo === columnasOriginales[idx] && !CAMPOS_SCHEMA.includes(campo)) {
          if (!obj._extra) obj._extra = {};
          obj._extra[columnasOriginales[idx]] = raw;
        } else {
          obj[campo] = limpiarValor(campo, raw);
        }
      });

      // Si no tiene numero_expediente, intentar generar uno desde otros campos
      if (!obj.numero_expediente) {
        const posibleId = finalMappedHeaders.findIndex(h =>
          ['folio_banco', 'clave', 'referencia', 'ref', 'num', 'numero'].includes(h)
        );
        if (posibleId >= 0 && row[posibleId]) {
          obj.numero_expediente = `${nombreHoja}-${String(row[posibleId]).trim()}`;
        } else {
          obj.numero_expediente = `${nombreHoja}-${i}`;
        }
      }

      // Mover columnas extra a notas si no hay campo notas
      if (obj._extra && !obj.notas) {
        obj.notas = Object.entries(obj._extra)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' | ');
      }
      delete obj._extra;

      expedientes.push(obj);
    } catch (e) {
      errores.push({ hoja: nombreHoja, linea: i + 1, error: e.message });
    }
  }

  return {
    expedientes,
    errores,
    total:               expedientes.length,
    columnas_detectadas: columnasOriginales,
    hoja_usada:          nombreHoja,
    mapeo_columnas:      reporteMapeo
  };
}

/**
 * Resuelve el tipo "numerico_grande" a "valor_catastral" o "monto_adeudo"
 * usando el nombre del encabezado como tiebreaker.
 */
function resolverNumericoGrande(tipo, headerMap, rawHeader) {
  if (tipo !== 'numerico_grande') return tipo;

  const h = (rawHeader || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');

  const palabrasCatastral = ['avaluo', 'catastral', 'comercial', 'fiscal', 'valor'];
  const palabrasAdeudo    = ['saldo', 'adeudo', 'monto', 'deuda', 'credito', 'prestamo', 'insoluto'];

  if (palabrasCatastral.some(p => h.includes(p))) return 'valor_catastral';
  if (palabrasAdeudo.some(p => h.includes(p)))    return 'monto_adeudo';
  if (headerMap === 'valor_catastral' || headerMap === 'monto_adeudo') return headerMap;

  // Default para numérico_grande sin contexto adicional
  return 'monto_adeudo';
}

/**
 * Si hay múltiples columnas mapeadas como numerico_grande, las diferencia
 * usando el nombre del encabezado original como desambiguador.
 */
function _desambiguarNumericos(finalMappedHeaders, originalMappedHeaders, rawHeaders, reporteMapeo) {
  const indicesNumericos = finalMappedHeaders.reduce((acc, tipo, idx) => {
    if (tipo === 'numerico_grande') acc.push(idx);
    return acc;
  }, []);

  if (indicesNumericos.length < 2) return;

  let tieneValorCatastral = false;
  let tieneMonto          = false;

  for (const idx of indicesNumericos) {
    const resolved = resolverNumericoGrande('numerico_grande', originalMappedHeaders[idx], rawHeaders[idx]);
    finalMappedHeaders[idx] = resolved;
    if (resolved === 'valor_catastral') tieneValorCatastral = true;
    if (resolved === 'monto_adeudo')    tieneMonto = true;

    // Actualizar reporte
    const entrada = reporteMapeo.find(r => r.columna_original === rawHeaders[idx]);
    if (entrada) entrada.campo_mapeado = resolved;
  }

  // Si todos quedaron igual (no se pudo diferenciar), asignar por posición
  if (!tieneValorCatastral && indicesNumericos.length >= 1) {
    finalMappedHeaders[indicesNumericos[0]] = 'valor_catastral';
    const entrada = reporteMapeo.find(r => r.columna_original === rawHeaders[indicesNumericos[0]]);
    if (entrada) entrada.campo_mapeado = 'valor_catastral';
  }
  if (!tieneMonto && indicesNumericos.length >= 2) {
    finalMappedHeaders[indicesNumericos[1]] = 'monto_adeudo';
    const entrada = reporteMapeo.find(r => r.columna_original === rawHeaders[indicesNumericos[1]]);
    if (entrada) entrada.campo_mapeado = 'monto_adeudo';
  }
}

// Campos que pertenecen al schema de expedientes
const CAMPOS_SCHEMA = [
  'numero_expediente','folio_banco','nombre_archivo','banco','ubicacion',
  'valor_catastral','monto_adeudo','fecha_inicio','status_juridico',
  'antiguedad_inmueble','contacto','notas','tipo_cartera'
];

// ─── ParsearExcel (todas las hojas o una específica) ─────────────────────────
function ParsearExcel(buffer, hojaSeleccionada = null, nombreArchivo = null) {
  let wb;
  try {
    wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  } catch (e) {
    throw new Error(`No se pudo leer el archivo Excel: ${e.message}`);
  }

  if (!wb.SheetNames.length) throw new Error('El archivo Excel no contiene hojas');

  // Filtrar hojas a procesar
  const hojasAProcesar = hojaSeleccionada
    ? wb.SheetNames.filter(n => n === hojaSeleccionada)
    : wb.SheetNames;

  if (!hojasAProcesar.length) {
    throw new Error(`Hoja "${hojaSeleccionada}" no encontrada. Hojas disponibles: ${wb.SheetNames.join(', ')}`);
  }

  const todosExpedientes = [];
  const todosErrores     = [];
  const resumenHojas     = [];
  const todoMapeoColumnas = [];

  for (const nombre of hojasAProcesar) {
    const sheet = wb.Sheets[nombre];
    const rows  = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const resultado = ParsearHoja(rows, nombre, nombreArchivo);
    todosExpedientes.push(...resultado.expedientes);
    todosErrores.push(...resultado.errores);
    resumenHojas.push({
      hoja:     nombre,
      total:    resultado.total,
      columnas: resultado.columnas_detectadas
    });
    todoMapeoColumnas.push(...(resultado.mapeo_columnas || []));

    console.log(`  📋 Hoja "${nombre}": ${resultado.total} registros`);
  }

  return {
    expedientes:         todosExpedientes,
    errores:             todosErrores,
    total:               todosExpedientes.length,
    hojas_procesadas:    resumenHojas,
    hoja_usada:          hojasAProcesar.join(', '),
    columnas_detectadas: resumenHojas.flatMap(h => h.columnas),
    mapeo_columnas:      todoMapeoColumnas
  };
}

// ─── ParsearArchivo (unificado CSV + Excel) ───────────────────────────────────
function ParsearArchivo(buffer, filename, hojaSeleccionada = null) {
  const ext          = (filename || '').split('.').pop().toLowerCase();
  const nombreArchivo = filename || null;
  if (ext === 'xlsx' || ext === 'xls') {
    return ParsearExcel(buffer, hojaSeleccionada, nombreArchivo);
  }
  const resultado = ParsearCSV(buffer.toString('utf-8'));
  // Agregar nombre_archivo a cada registro CSV
  resultado.expedientes.forEach(e => { e.nombre_archivo = nombreArchivo; });
  return { ...resultado, hoja_usada: 'CSV', columnas_detectadas: [], mapeo_columnas: [] };
}

module.exports = { EstimadorValorComercial, PJVQuery, ParsearCSV, ParsearExcel, ParsearArchivo, LeerHojasExcel, AnalizadorColumnas };
