/**
 * Modelo: Backup del Servidor
 * Guarda snapshots del servidor para restauración
 */

const mongoose = require('mongoose');

const BackupSchema = new mongoose.Schema({
  guildId:    { type: String, required: true, index: true },
  guildName:  String,
  createdBy:  String,   // 'auto' o ID del admin
  type:       { type: String, enum: ['auto', 'manual'], default: 'auto' },
  label:      String,   // Nombre descriptivo del backup

  // Snapshot del servidor
  data: {
    name:       String,
    icon:       String,
    description: String,
    region:     String,
    verificationLevel: Number,
    defaultMessageNotifications: Number,
    explicitContentFilter: Number,
    afkTimeout: Number,

    // Roles (sin @everyone)
    roles: [{
      id:          String,
      name:        String,
      color:       Number,
      hoist:       Boolean,
      position:    Number,
      permissions: String,
      mentionable: Boolean,
    }],

    // Canales
    channels: [{
      id:          String,
      name:        String,
      type:        Number,
      position:    Number,
      parentId:    String,
      topic:       String,
      nsfw:        Boolean,
      rateLimitPerUser: Number,
      permissionOverwrites: mongoose.Schema.Types.Mixed,
    }],

    // Emojis
    emojis: [{
      name: String,
      url:  String,
    }],
  },

  size: Number,  // Tamaño aproximado en bytes

}, { timestamps: true });

// Mantener solo los últimos 5 backups por servidor
BackupSchema.index({ guildId: 1, createdAt: -1 });

module.exports = mongoose.model('Backup', BackupSchema);
