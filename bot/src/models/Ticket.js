/**
 * Modelo: Ticket
 * Gestiona el estado y datos de cada ticket
 */

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  authorId:   String,
  authorTag:  String,
  content:    String,
  attachments: [String],
  timestamp:  { type: Date, default: Date.now },
});

const TicketSchema = new mongoose.Schema({
  ticketId:     { type: String, required: true, index: true },  // ej: "0042"
  guildId:      { type: String, required: true, index: true },
  channelId:    { type: String, required: true },
  authorId:     { type: String, required: true },
  authorTag:    String,

  // Estado
  status: {
    type: String,
    enum: ['open', 'claimed', 'closed', 'deleted'],
    default: 'open',
    index: true,
  },

  // Categoría y prioridad
  category:   { type: String, default: 'General' },
  priority:   { type: String, default: '🟢 Baja' },
  subject:    String,

  // Moderación del ticket
  claimedBy:  String,   // ID del moderador que tomó el ticket
  claimedAt:  Date,
  closedBy:   String,
  closedAt:   Date,
  closeReason: String,

  // Participantes
  participants: [String],  // IDs de usuarios que participaron

  // Historial de mensajes (para transcript)
  messages: [MessageSchema],

  // Transcript generado
  transcriptUrl: String,
  transcriptFile: String,

  // Tags personalizadas
  tags: [String],

  // Fechas
  lastActivity: { type: Date, default: Date.now },

}, { timestamps: true });

// Índice compuesto para buscar tickets por guild y estado
TicketSchema.index({ guildId: 1, status: 1 });
TicketSchema.index({ guildId: 1, authorId: 1, status: 1 });

module.exports = mongoose.model('Ticket', TicketSchema);
