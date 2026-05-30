/**
 * Modelo: SecurityLog
 * Registra todos los eventos de seguridad
 */

const mongoose = require('mongoose');

const SecurityLogSchema = new mongoose.Schema({
  guildId:    { type: String, required: true, index: true },
  type: {
    type: String,
    enum: [
      'ANTI_RAID', 'ANTI_NUKE', 'ANTI_SPAM',
      'LOCKDOWN_START', 'LOCKDOWN_END',
      'CHANNEL_DELETE', 'ROLE_DELETE',
      'MASS_BAN', 'MASS_KICK',
      'WEBHOOK_CREATE', 'BOT_ADD',
      'SERVER_UPDATE', 'PERMISSION_CHANGE',
    ],
    required: true,
    index: true,
  },
  severity:   { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  actorId:    String,    // Quien realizó la acción
  actorTag:   String,
  targetId:   String,    // A quién afectó
  details:    String,    // Descripción del evento
  metadata:   mongoose.Schema.Types.Mixed,  // Datos extra (JSON libre)
  resolved:   { type: Boolean, default: false },
  resolvedBy: String,
  resolvedAt: Date,
}, { timestamps: true });

SecurityLogSchema.index({ guildId: 1, createdAt: -1 });
SecurityLogSchema.index({ guildId: 1, type: 1 });

module.exports = mongoose.model('SecurityLog', SecurityLogSchema);
