function loggerMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;
    const icon = res.statusCode < 400 ? '✓' : res.statusCode < 500 ? '⚠' : '✗';
    console.log(`${icon} ${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`);
  });

  next();
}

function errorHandler(err, req, res, next) {
  console.error('✗ Error no manejado:', err.message);
  if (process.env.NODE_ENV === 'development') console.error(err.stack);

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: true, message: 'Archivo demasiado grande (máximo 10 MB)' });
  }

  // Multer file type error
  if (err.message?.includes('Solo se aceptan')) {
    return res.status(400).json({ error: true, message: err.message });
  }

  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    error: true,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = { loggerMiddleware, errorHandler };
