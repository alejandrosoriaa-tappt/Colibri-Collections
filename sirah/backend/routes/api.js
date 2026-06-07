const express  = require('express');
const multer   = require('multer');
const pLimit   = require('p-limit');

const {
  insertExpedientes,
  getExpedientes,
  getExpedienteById,
  getEstadisticas
} = require('../db');

const { EstimadorValorComercial, PJVQuery, ParsearArchivo, LeerHojasExcel, AnalizadorColumnas } = require('../scraper');

const router    = express.Router();
const estimador = new EstimadorValorComercial();
const pjv       = new PJVQuery();
const limit     = pLimit(5); // máx 5 consultas PJV simultáneas

// ─── Multer — memoria, sólo CSV ───────────────────────────────────────────────
const EXCEL_MIMES = new Set([
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 }, // 20 MB para Excel con imágenes
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().split('.').pop();
    const ok  = EXCEL_MIMES.has(file.mimetype) || ['csv','xlsx','xls'].includes(ext);
    ok ? cb(null, true) : cb(new Error('Solo se aceptan archivos CSV (.csv) o Excel (.xlsx, .xls)'));
  }
});

// ─── POST /api/procesar-cartera ───────────────────────────────────────────────
router.post('/procesar-cartera', upload.single('archivo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: true, message: 'No se recibió ningún archivo (campo: "archivo")' });
    }

    const nombre  = req.file.originalname;
    const tamano  = (req.file.size / 1024).toFixed(1);
    console.log(`📂 Procesando: ${nombre} (${tamano} KB)`);

    // 1 — Parsear archivo (CSV o Excel), opcionalmente una hoja específica
    const hoja = req.body.hoja || null; // nombre de pestaña seleccionada
    const { expedientes, errores, total, columnas_detectadas, hoja_usada, mapeo_columnas } =
      ParsearArchivo(req.file.buffer, req.file.originalname, hoja);

    if (total === 0) {
      return res.status(422).json({
        error:             true,
        message:           'No se encontraron expedientes válidos en el archivo',
        errores,
        columnas_detectadas,
        hoja_usada,
        sugerencia:        'Verifica que haya una columna llamada "numero_expediente", "expediente", "folio" o similar'
      });
    }

    console.log(`✓ Archivo válido (hoja: ${hoja_usada}): ${total} expedientes, ${errores.length} errores`);

    // 2 — Estimar valores + consultar PJV (concurrente, máx 5)
    const procesados = await Promise.all(
      expedientes.map(exp => limit(async () => {
        const est    = estimador.estimarValor(exp.valor_catastral, exp.ubicacion, exp.antiguedad_inmueble);
        const pjvRes = await pjv.buscarExpediente(exp.numero_expediente);

        return {
          ...exp,
          valor_estimado: est.valor,
          rentabilidad:   est.rentabilidad,
          factores:       est.factores,
          status_pjv:     pjvRes.status,
          detalles_pjv:   pjvRes.detalles
        };
      }))
    );

    // 3 — Persistir en DB
    const { data: guardados, error: dbErr } = await insertExpedientes(procesados);
    if (dbErr) {
      console.log(`⚠️  Error al guardar en BD: ${dbErr.message}. Retornando resultados sin persistir.`);
    } else {
      console.log(`✓ ${procesados.length} expedientes guardados`);
    }

    // 4 — Estadísticas del lote
    const valorTotal = procesados.reduce((s, e) => s + (e.valor_estimado || 0), 0);
    const rentProm   = total
      ? procesados.reduce((s, e) => s + (e.rentabilidad || 0), 0) / total
      : 0;

    res.json({
      success:         true,
      mensaje:         `${total} expedientes procesados exitosamente`,
      total,
      hoja_usada,
      hojas_procesadas: expedientes.hojas_procesadas || null,
      errores_csv:      errores,
      expedientes:      guardados || procesados,
      mapeo_columnas:   mapeo_columnas || [],
      estadisticas: {
        total,
        valor_total:           valorTotal,
        promedio_rentabilidad: Math.round(rentProm * 10) / 10
      }
    });

  } catch (err) {
    next(err);
  }
});

// ─── POST /api/leer-hojas ─────────────────────────────────────────────────────
// Recibe el archivo y devuelve las pestañas + columnas de cada hoja sin procesar
router.post('/leer-hojas', upload.single('archivo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: true, message: 'No se recibió archivo' });

    const hojas = LeerHojasExcel(req.file.buffer, req.file.originalname);
    res.json({ success: true, hojas });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/expedientes ─────────────────────────────────────────────────────
router.get('/expedientes', async (req, res, next) => {
  try {
    const { ubicacion, banco, status } = req.query;
    const { data, error } = await getExpedientes({
      ...(ubicacion && { ubicacion }),
      ...(banco     && { banco }),
      ...(status    && { status })
    });

    if (error) return res.status(500).json({ error: true, message: error.message });

    res.json({ success: true, total: data?.length || 0, expedientes: data || [] });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/expedientes/:id ─────────────────────────────────────────────────
router.get('/expedientes/:id', async (req, res, next) => {
  try {
    const { data, error } = await getExpedienteById(req.params.id);

    if (error || !data) {
      return res.status(404).json({ error: true, message: 'Expediente no encontrado' });
    }

    res.json({ success: true, expediente: data });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/estadisticas ────────────────────────────────────────────────────
router.get('/estadisticas', async (req, res, next) => {
  try {
    const { data, error } = await getEstadisticas();
    if (error) return res.status(500).json({ error: true, message: error.message });
    res.json({ success: true, estadisticas: data });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/health ──────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'SIRAH API v1' });
});

module.exports = router;
