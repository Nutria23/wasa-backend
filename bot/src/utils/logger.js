/**
 * Sistema de Logging profesional con Winston
 * Soporta colores en consola y archivos rotativos
 */

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors } = format;
require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Crear directorio de logs si no existe
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

// ─── FORMATO CONSOLA ──────────────────────────────────────────────────────────
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  const ts = timestamp.slice(0, 19).replace('T', ' ');
  const msg = stack || message;
  return `[${ts}] [${level.toUpperCase().padEnd(7)}] ${msg}`;
});

// ─── FORMATO ARCHIVO ──────────────────────────────────────────────────────────
const fileFormat = printf(({ level, message, timestamp, stack }) => {
  return JSON.stringify({
    timestamp,
    level,
    message: stack || message,
  });
});

// ─── TRANSPORTS ───────────────────────────────────────────────────────────────
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  transports: [
    // Consola con colores
    new transports.Console({
      format: combine(colorize({ all: true }), consoleFormat),
    }),
    // Archivo general rotativo
    new transports.DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: fileFormat,
    }),
    // Solo errores
    new transports.DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      format: fileFormat,
    }),
  ],
});

// ─── MÉTODOS EXTRAS ────────────────────────────────────────────────────────────
logger.success = (msg) => logger.info(`✅ ${msg}`);
logger.bot = (msg) => logger.info(`🤖 ${msg}`);
logger.security = (msg) => logger.warn(`🛡️  ${msg}`);
logger.discord = (msg) => logger.debug(`💬 ${msg}`);

module.exports = logger;
