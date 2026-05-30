/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                  WASA BOT - API BACKEND                     ║
 * ║         REST API + WebSocket para el Dashboard              ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const http = require('http');
const { Server: SocketIO } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const logger = require('./src/utils/logger');
const authRoutes = require('./src/routes/auth');
const guildRoutes = require('./src/routes/guilds');
const ticketRoutes = require('./src/routes/tickets');
const securityRoutes = require('./src/routes/security');
const statsRoutes = require('./src/routes/stats');
const botRoutes = require('./src/routes/bot');
const moderationRoutes = require('./src/routes/moderation');
const messagesRoutes = require('./src/routes/messages');
const { setupSocket } = require('./src/socket/socketHandler');
const { authMiddleware } = require('./src/middleware/auth');
const { errorHandler } = require('./src/middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
const io = new SocketIO(server, {
  cors: {
    origin: process.env.DASHBOARD_URL || 'http://localhost:5500',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Hacer io disponible globalmente para rutas
app.set('io', io);

// ─── MIDDLEWARES ──────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(cors({
  origin: [
    process.env.DASHBOARD_URL || 'http://localhost:5500',
    'https://localhost:5500',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// ─── RATE LIMITING GLOBAL ─────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 200,                   // 200 requests por ventana
  message: { error: 'Demasiadas solicitudes, intenta más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Rate limit más estricto para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos de autenticación.' },
});

// ─── RUTAS ────────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/api/guilds', authMiddleware, guildRoutes);
app.use('/api/tickets', authMiddleware, ticketRoutes);
app.use('/api/security', authMiddleware, securityRoutes);
app.use('/api/stats', authMiddleware, statsRoutes);
app.use('/api/bot', authMiddleware, botRoutes);
app.use('/api/moderation', authMiddleware, moderationRoutes);
app.use('/api/messages', authMiddleware, messagesRoutes);

// Ruta de salud para Railway/Render
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
  });
});

// ─── MANEJADOR DE ERRORES ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── CONECTAR DB Y ARRANCAR ───────────────────────────────────────────────────
async function start() {
  try {
    if (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('PON_AQUI')) {
      try {
        await mongoose.connect(process.env.MONGODB_URI);
        logger.success('✅ MongoDB conectado (API)');
      } catch (dbError) {
        logger.error(`❌ Error al conectar MongoDB en API: ${dbError.message}`);
      }
    } else {
      logger.warn('⚠️ Base de datos no conectada: Configura MONGODB_URI en .env para funcionalidad completa.');
    }

    // Configurar Socket.IO
    setupSocket(io);

    const PORT = process.env.PORT || process.env.API_PORT || 3000;
    server.listen(PORT, () => {
      logger.success(`🌐 API corriendo en puerto ${PORT}`);
      logger.info(`📡 WebSocket listo en ws://localhost:${PORT}`);
    });

    // --- DASHBOARD SERVER ---
    const dashboardApp = express();
    dashboardApp.use(express.static(path.join(__dirname, '../dashboard/public')));
    const DASHBOARD_PORT = 5500;
    dashboardApp.listen(DASHBOARD_PORT, () => {
      logger.success(`🖥️ Dashboard web corriendo en http://localhost:${DASHBOARD_PORT}`);
    });

  } catch (err) {
    logger.error(`Error al iniciar API: ${err.message}`);
    process.exit(1);
  }
}

start();

module.exports = { app, io };
