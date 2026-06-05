/**
 * Modelo: User (Perfil de usuario por servidor)
 * Historial, warns, infracciones y estadísticas
 */

const mongoose = require('mongoose');

const WarnSchema = new mongoose.Schema({
  reason:       String,
  moderatorId:  String,
  moderatorTag: String,
  timestamp:    { type: Date, default: Date.now },
});

const InfractionSchema = new mongoose.Schema({
  type:         { type: String, enum: ['warn', 'mute', 'kick', 'ban', 'timeout'] },
  reason:       String,
  moderatorId:  String,
  moderatorTag: String,
  duration:     String,
  timestamp:    { type: Date, default: Date.now },
});

const UserSchema = new mongoose.Schema({
  userId:       { type: String, required: true, index: true },
  guildId:      { type: String, required: true, index: true },
  tag:          String,
  username:     String,
  avatar:       String,

  // Infracciones
  warns:        [WarnSchema],
  warnCount:    { type: Number, default: 0 },
  infractions:  [InfractionSchema],

  // Estado
  blacklisted:  { type: Boolean, default: false },
  blacklistReason: String,
  blacklistedBy: String,
  blacklistedAt: Date,

  isMuted:      { type: Boolean, default: false },
  muteExpires:  Date,

  // Estadísticas
  stats: {
    totalTickets:   { type: Number, default: 0 },
    totalMessages:  { type: Number, default: 0 },
    joinedAt:       Date,
  },

  // Tickets
  openTickets:  [String],    // IDs de tickets abiertos

  // Anti-spam tracking
  spamScore:    { type: Number, default: 0 },
  lastMessage:  Date,

}, { timestamps: true });

// Índice único por usuario+servidor
UserSchema.index({ userId: 1, guildId: 1 }, { unique: true });

/**
 * Método: Agregar warn
 */
UserSchema.methods.addWarn = function(reason, moderatorId, moderatorTag) {
  this.warns.push({ reason, moderatorId, moderatorTag });
  this.warnCount += 1;
  this.infractions.push({ type: 'warn', reason, moderatorId, moderatorTag });
  return this.save();
};

/**
 * Método: Eliminar warn por índice
 */
UserSchema.methods.removeWarnByIndex = function(index) {
  if (index < 0 || index >= this.warns.length) return null;
  const removed = this.warns.splice(index, 1)[0];
  this.warnCount = Math.max(0, this.warnCount - 1);
  const infIdx = this.infractions.findIndex(i =>
    i.type === 'warn' && i.reason === removed.reason &&
    String(i.timestamp) === String(removed.timestamp)
  );
  if (infIdx !== -1) this.infractions.splice(infIdx, 1);
  return this.save();
};

/**
 * Método: Agregar infracción
 */
UserSchema.methods.addInfraction = function(type, reason, moderatorId, moderatorTag, duration) {
  this.infractions.push({ type, reason, moderatorId, moderatorTag, duration });
  return this.save();
};

/**
 * Static: Obtener o crear perfil de usuario
 */
UserSchema.statics.getOrCreate = async function(userId, guildId, userData = {}) {
  let user = await this.findOne({ userId, guildId });
  if (!user) {
    user = await this.create({ userId, guildId, ...userData });
  } else if (userData.tag && user.tag !== userData.tag) {
    user.tag = userData.tag;
    user.username = userData.username;
    await user.save();
  }
  return user;
};

module.exports = mongoose.model('User', UserSchema);
