const express  = require('express');
const multer   = require('multer');
const pLimit   = require('p-limit');

const {
  insertArchivo, getArchivos, renameArchivo, deleteArchivo,
  insertExpedientes, getExpedientes, getExpedienteById, getEstadisticas,
  toggleFavorito
} = require('../db');

const { EstimadorValorComercial, PJVQuery, ParsearArchivo, LeerHojasExcel } = require('../scraper');

const router    = express.Router();
const estimador = new EstimadorValorComercial();
const pjv       = new PJVQuery();
const limit     = pLimit(5);

// ─── Multer ───────────────────────────────────────────────────────────────────
const EXCEL_MIMES = new Set([
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 },
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

    const nombre = req.file.originalname;
    const tamano = (req.file.size / 1024).toFixed(1);
    console.log(`📂 Procesando: ${nombre} (${tamano} KB)`);

    const hoja = req.body.hoja || null;
    const { expedientes, errores, total, hoja_usada, mapeo_columnas } =
      ParsearArchivo(req.file.buffer, req.file.originalname, hoja);

    if (total === 0) {
      return res.status(422).json({
        error:   true,
        message: 'No se encontraron expedientes válidos en el archivo',
        errores, hoja_usada,
        sugerencia: 'Verifica que haya una columna llamada "numero_expediente", "expediente", "folio" o similar'
      });
    }

    console.log(`✓ Archivo válido (hoja: ${hoja_usada}): ${total} expedientes`);

    // Estimar valores + PJV
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

    // Crear registro de archivo y persistir expedientes
    const { data: archivo, error: archErr } = await insertArchivo(nombre, total);
    if (archErr) console.log(`⚠️  Error al guardar archivo: ${archErr.message}`);

    const archivoId = archivo?.id || null;
    const { data: guardados, error: dbErr } = await insertExpedientes(procesados, archivoId);
    if (dbErr) console.log(`⚠️  Error al guardar expedientes: ${dbErr.message}`);
    else       console.log(`✓ ${procesados.length} expedientes guardados (archivo_id: ${archivoId})`);

    // Estadísticas del lote
    const valorTotal = procesados.reduce((s, e) => s + (e.valor_estimado || 0), 0);
    const rentProm   = total
      ? procesados.reduce((s, e) => s + (e.rentabilidad || 0), 0) / total
      : 0;

    // Resumen por hoja (tipo_cartera)
    const hojaMap = {};
    procesados.forEach(e => {
      const h = e.tipo_cartera || 'Sin hoja';
      hojaMap[h] = (hojaMap[h] || 0) + 1;
    });
    const hojas_procesadas = Object.entries(hojaMap).map(([hoja, total]) => ({ hoja, total }));

    res.json({
      success: true,
      mensaje: `${total} expedientes procesados exitosamente`,
      total,
      hoja_usada,
      archivo_id:      archivoId,
      hojas_procesadas,
      errores_csv:     errores,
      expedientes:     guardados || procesados,
      mapeo_columnas:  mapeo_columnas || [],
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
router.post('/leer-hojas', upload.single('archivo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: true, message: 'No se recibió archivo' });
    const hojas = LeerHojasExcel(req.file.buffer, req.file.originalname);
    res.json({ success: true, hojas });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/archivos ────────────────────────────────────────────────────────
router.get('/archivos', async (req, res, next) => {
  try {
    const { data, error } = await getArchivos();
    if (error) return res.status(500).json({ error: true, message: error.message });
    res.json({ success: true, archivos: data || [] });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/archivos/:id ──────────────────────────────────────────────────
router.patch('/archivos/:id', async (req, res, next) => {
  try {
    const { nombre_display } = req.body;
    if (!nombre_display?.trim()) {
      return res.status(400).json({ error: true, message: 'nombre_display requerido' });
    }
    const { data, error } = await renameArchivo(req.params.id, nombre_display.trim());
    if (error) return res.status(500).json({ error: true, message: error.message });
    if (!data)  return res.status(404).json({ error: true, message: 'Archivo no encontrado' });
    res.json({ success: true, archivo: data });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/archivos/:id ─────────────────────────────────────────────────
router.delete('/archivos/:id', async (req, res, next) => {
  try {
    const { error } = await deleteArchivo(req.params.id);
    if (error) return res.status(500).json({ error: true, message: error.message });
    res.json({ success: true, message: 'Archivo y sus expedientes eliminados' });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/expedientes ─────────────────────────────────────────────────────
router.get('/expedientes', async (req, res, next) => {
  try {
    const { archivo_id, banco, estado_geo, status } = req.query;
    const { data, error } = await getExpedientes({
      ...(archivo_id && { archivo_id }),
      ...(banco      && { banco }),
      ...(estado_geo && { estado_geo }),
      ...(status     && { status })
    });
    if (error) return res.status(500).json({ error: true, message: error.message });
    res.json({ success: true, total: data?.length || 0, expedientes: data || [] });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/expedientes/:id/favorito ─────────────────────────────────────
router.patch('/expedientes/:id/favorito', async (req, res, next) => {
  try {
    const { data, error } = await toggleFavorito(req.params.id);
    if (error) return res.status(500).json({ error: true, message: error.message });
    if (!data)  return res.status(404).json({ error: true, message: 'Expediente no encontrado' });
    res.json({ success: true, id: data.id, favorito: data.favorito });
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

router.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'SIRAH API v1' });
});

module.exports = router;
