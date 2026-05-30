/**
 * Modelo: Guild (Configuración del Servidor)
 * Almacena toda la configuración por servidor
 */

const mongoose = require('mongoose');

const GuildSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  guildName: String,
  guildIcon: String,
  ownerId: String,
  language: { type: String, default: 'es' },
  prefix: { type: String, default: '!' },
  premium: { type: Boolean, default: false },
  premiumExpires: Date,

  // ─── MÓDULOS ACTIVOS ──────────────────────────────────────────────
  modules: {
    antiSpam:   { type: Boolean, default: true },
    antiRaid:   { type: Boolean, default: true },
    antiNuke:   { type: Boolean, default: true },
    tickets:    { type: Boolean, default: true },
    welcome:    { type: Boolean, default: false },
    automod:    { type: Boolean, default: true },
    logging:    { type: Boolean, default: true },
    autoroles:  { type: Boolean, default: false },
  },

  // ─── CANALES DE LOGS ──────────────────────────────────────────────
  logs: {
    moderation:  String,   // ID del canal
    tickets:     String,
    security:    String,
    joins:       String,
    messages:    String,
    voice:       String,
  },

  // ─── CONFIGURACIÓN ANTI-SPAM ──────────────────────────────────────
  antiSpam: {
    enabled:            { type: Boolean, default: true },
    messageThreshold:   { type: Number, default: 7 },
    timeWindow:         { type: Number, default: 5000 },
    muteDuration:       { type: Number, default: 10 },
    ignoredRoles:       [String],
    ignoredChannels:    [String],
    punishments:        { type: [String], default: ['warn', 'mute', 'kick', 'ban'] },
  },

  // ─── CONFIGURACIÓN ANTI-RAID ──────────────────────────────────────
  antiRaid: {
    enabled:            { type: Boolean, default: true },
    joinThreshold:      { type: Number, default: 10 },
    joinTimeWindow:     { type: Number, default: 10000 },
    action:             { type: String, default: 'lockdown' },
    lockdownDuration:   { type: Number, default: 30 },
    whitelist:          [String],
    isActive:           { type: Boolean, default: false },
    activatedAt:        Date,
  },

  // ─── CONFIGURACIÓN ANTI-NUKE ──────────────────────────────────────
  antiNuke: {
    enabled:    { type: Boolean, default: true },
    whitelist:  [String],
    action:     { type: String, default: 'strip_permissions' },
  },

  // ─── CONFIGURACIÓN DE TICKETS ─────────────────────────────────────
  tickets: {
    enabled:          { type: Boolean, default: true },
    categoryId:       String,
    logChannelId:     String,
    supportRoles:     [String],
    maxOpenPerUser:   { type: Number, default: 3 },
    autoCloseHours:   { type: Number, default: 48 },
    transcripts:      { type: Boolean, default: true },
    counter:          { type: Number, default: 0 },
    panelChannelId:   String,
    panelMessageId:   String,
  },

  // ─── CONFIGURACIÓN DE BIENVENIDA ──────────────────────────────────
  welcome: {
    enabled:      { type: Boolean, default: false },
    channelId:    String,
    message:      String,
    embedEnabled: { type: Boolean, default: true },
    dmEnabled:    { type: Boolean, default: false },
    dmMessage:    String,
    autoRole:     String,
  },

  // ─── ROLES AUTOMÁTICOS ────────────────────────────────────────────
  autoroles: [String],

  // ─── ESTADÍSTICAS ─────────────────────────────────────────────────
  stats: {
    totalTickets:     { type: Number, default: 0 },
    totalBans:        { type: Number, default: 0 },
    totalKicks:       { type: Number, default: 0 },
    totalWarns:       { type: Number, default: 0 },
    raidBlocked:      { type: Number, default: 0 },
    spamBlocked:      { type: Number, default: 0 },
    nukeBlocked:      { type: Number, default: 0 },
  },

}, { timestamps: true });

module.exports = mongoose.model('Guild', GuildSchema);
