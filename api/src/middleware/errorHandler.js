/**
 * Middleware global de manejo de errores
 */
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error(`[${req.method}] ${req.path} → ${err.message}`);

  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? (statusCode < 500 ? err.message : 'Error interno del servidor')
    : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = { errorHandler };
