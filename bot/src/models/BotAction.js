const mongoose = require('mongoose');

const BotActionSchema = new mongoose.Schema({
  action: { type: String, required: true }, // 'KICK', 'BAN', 'MUTE', 'SEND_MESSAGE', 'SET_STATUS'
  guildId: { type: String, required: false },
  payload: { type: Object, default: {} },
  status: { type: String, default: 'PENDING' }, // 'PENDING', 'COMPLETED', 'ERROR'
  result: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('BotAction', BotActionSchema);
