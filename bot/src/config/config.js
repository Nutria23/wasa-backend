/**
 * Configuración centralizada del Bot
 * Todos los valores configurables están aquí
 */

module.exports = {
  // ─── INFORMACIÓN DEL BOT ───────────────────────────────────────────
  bot: {
    name: 'Wasa Bot',
    version: '1.0.0',
    prefix: process.env.BOT_PREFIX || '!',
    defaultLanguage: process.env.DEFAULT_LANGUAGE || 'es',
    embedColor: '#5865F2',         // Color principal (Discord Blurple)
    successColor: '#57F287',       // Verde éxito
    errorColor: '#ED4245',         // Rojo error
    warningColor: '#FEE75C',       // Amarillo advertencia
    infoColor: '#5865F2',          // Azul info
  },

  // ─── SISTEMA DE TICKETS ────────────────────────────────────────────
  tickets: {
    maxOpenPerUser: 3,             // Máximo tickets abiertos por usuario
    autoCloseAfterHours: 48,       // Cerrar ticket inactivo tras N horas
    transcriptEnabled: true,       // Generar transcript HTML al cerrar
    categoryName: '🎫 TICKETS',    // Nombre de categoría por defecto
    logChannelName: 'ticket-logs', // Canal de logs de tickets
    priorities: ['🟢 Baja', '🟡 Media', '🔴 Alta', '⚫ Crítica'],
  },

  // ─── ANTI-RAID ─────────────────────────────────────────────────────
  antiRaid: {
    enabled: true,
    // Umbral: N acciones en M milisegundos activan la protección
    joinThreshold: 10,             // X miembros uniéndose en...
    joinTimeWindow: 10000,         // ...10 segundos
    mentionThreshold: 10,          // X menciones en un mensaje
    channelCreateThreshold: 3,     // X canales creados en...
    channelCreateTimeWindow: 10000,
    roleDeleteThreshold: 3,        // X roles eliminados en...
    roleDeleteTimeWindow: 10000,
    banThreshold: 5,               // X bans en...
    banTimeWindow: 10000,
    webhookCreateThreshold: 3,
    webhookCreateTimeWindow: 10000,
    // Acción al detectar raid: 'lockdown' | 'kick' | 'ban' | 'alert'
    defaultAction: 'lockdown',
    lockdownDuration: 30,          // Minutos que dura el lockdown
  },

  // ─── ANTI-SPAM ─────────────────────────────────────────────────────
  antiSpam: {
    enabled: true,
    messageThreshold: 7,           // X mensajes en...
    messageTimeWindow: 5000,       // ...5 segundos
    duplicateThreshold: 5,         // X mensajes iguales
    duplicateTimeWindow: 30000,
    maxMentionsPerMessage: 5,      // Máx. menciones por mensaje
    maxEmojisPerMessage: 10,       // Máx. emojis por mensaje
    maxLinksPerMessage: 3,         // Máx. links por mensaje
    // Sanciones progresivas: warn > mute > kick > ban
    punishments: ['warn', 'mute', 'kick', 'ban'],
    muteDuration: 10,              // Minutos de mute
    ignoredRoles: [],              // IDs de roles ignorados
    ignoredChannels: [],           // IDs de canales ignorados
  },

  // ─── ANTI-NUKE ─────────────────────────────────────────────────────
  antiNuke: {
    enabled: true,
    // Acciones monitoreadas
    channelDelete: { enabled: true, threshold: 3, timeWindow: 10000 },
    roleDelete: { enabled: true, threshold: 3, timeWindow: 10000 },
    memberBan: { enabled: true, threshold: 5, timeWindow: 10000 },
    memberKick: { enabled: true, threshold: 5, timeWindow: 10000 },
    webhookCreate: { enabled: true, threshold: 3, timeWindow: 10000 },
    guildUpdate: { enabled: true },
    // Al detectar nuke: remover permisos del atacante
    action: 'strip_permissions',   // 'strip_permissions' | 'ban' | 'kick'
    whitelist: [],                 // IDs de usuarios/roles en whitelist
  },

  // ─── MODERACIÓN ────────────────────────────────────────────────────
  moderation: {
    muteRoleName: 'Muted',         // Nombre del rol de mute
    logChannelName: 'mod-logs',    // Canal de logs de moderación
    maxWarnBeforeAction: 3,        // Warns antes de acción automática
    warnAction: 'mute',            // Acción tras X warns
    dmOnPunishment: true,          // Enviar DM al usuario sancionado
  },

  // ─── BIENVENIDAS ───────────────────────────────────────────────────
  welcome: {
    enabled: false,
    channelName: 'bienvenidas',
    dmWelcome: false,
    autoRole: null,                // ID del rol automático al unirse
  },

  // ─── SISTEMA DE LOGS ───────────────────────────────────────────────
  logging: {
    enabled: true,
    channels: {
      moderation: 'mod-logs',
      tickets: 'ticket-logs',
      antiRaid: 'security-logs',
      joins: 'member-logs',
      messages: 'message-logs',
    },
  },

  // ─── COOLDOWNS (en segundos) ───────────────────────────────────────
  cooldowns: {
    default: 3,
    moderation: 5,
    admin: 10,
    tickets: 30,
  },

  // ─── PERMISOS REQUERIDOS ───────────────────────────────────────────
  permissions: {
    moderation: ['KickMembers', 'BanMembers', 'ModerateMembers'],
    admin: ['Administrator'],
    tickets: ['ManageChannels'],
  },
};
