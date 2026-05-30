/**
 * Utilidad de logging para la API (compartida con el bot)
 */
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;
const path = require('path');
const fs = require('fs');

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const logFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp.slice(0,19).replace('T',' ')}] [API][${level.toUpperCase().padEnd(5)}] ${message}`;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })),
  transports: [
    new transports.Console({ format: combine(colorize({ all: true }), logFormat) }),
    new transports.File({ filename: path.join(logsDir, 'api.log'), maxsize: 10485760, maxFiles: 5 }),
  ],
});

logger.success = (msg) => logger.info(`✅ ${msg}`);

module.exports = logger;
