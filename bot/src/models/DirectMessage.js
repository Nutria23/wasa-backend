const mongoose = require('mongoose');

const DirectMessageSchema = new mongoose.Schema({
  messageId:  { type: String, required: true, unique: true },
  authorId:   { type: String, required: true, index: true },
  authorTag:  { type: String, required: true },
  authorAvatar: String,
  channelId:  { type: String, required: true },
  content:    { type: String, default: '' },
  attachments: [{
    url: String,
    name: String,
    size: Number,
  }],
  embeds: [mongoose.Schema.Types.Mixed],
  read:       { type: Boolean, default: false },
  replied:    { type: Boolean, default: false },
  replyContent: String,
  replyAt:    Date,
  repliedBy:  String,
  createdAt:  { type: Date, default: Date.now },
}, { timestamps: true });

DirectMessageSchema.index({ authorId: 1, createdAt: -1 });
DirectMessageSchema.index({ read: 1 });

module.exports = mongoose.model('DirectMessage', DirectMessageSchema);
