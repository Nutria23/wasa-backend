/**
 * Socket.IO Handler - Tiempo real para el Dashboard
 */
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

function setupSocket(io) {
  // Middleware de autenticación para WebSocket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) return next(new Error('No autorizado'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Token inválido'));
    }
  });

  // Permitir conexión del bot con API_SECRET_KEY
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token === process.env.API_SECRET_KEY) {
      socket.isBot = true;
      return next();
    }
    next();
  });

  io.on('connection', (socket) => {
    if (socket.isBot) {
      logger.info('🤖 Bot conectado al WebSocket de la API');
      socket.on('dm:new', (dm) => {
        io.emit('dm:new', dm);
      });
      return;
    }

    logger.info(`WebSocket conectado: ${socket.user.username} (${socket.id})`);

    // Unirse a la sala del servidor seleccionado
    socket.on('join:guild', (guildId) => {
      // Verificar que el usuario gestiona ese guild
      const hasAccess = socket.user.guilds?.some(g => g.id === guildId);
      if (hasAccess) {
        socket.join(`guild:${guildId}`);
        socket.emit('joined', { guildId });
        logger.info(`${socket.user.username} unido a sala guild:${guildId}`);
      } else {
        socket.emit('error', 'Sin acceso a este servidor');
      }
    });

    socket.on('disconnect', () => {
      logger.info(`WebSocket desconectado: ${socket.user?.username}`);
    });
  });

  logger.success('Socket.IO configurado');
}

/**
 * Emite un evento de seguridad en tiempo real al dashboard
 */
function emitSecurityEvent(io, guildId, event) {
  io.to(`guild:${guildId}`).emit('security:event', event);
}

/**
 * Emite actualización de ticket en tiempo real
 */
function emitTicketUpdate(io, guildId, ticket) {
  io.to(`guild:${guildId}`).emit('ticket:update', ticket);
}

/**
 * Emite evento de nuevo DM en tiempo real
 */
function emitDMNotification(io, dm) {
  io.emit('dm:new', dm);
}

module.exports = { setupSocket, emitSecurityEvent, emitTicketUpdate, emitDMNotification };
