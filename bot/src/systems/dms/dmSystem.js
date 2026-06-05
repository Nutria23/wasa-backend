const DirectMessage = require('../../models/DirectMessage');
const logger = require('../../utils/logger');
const { io: SocketIOClient } = require('socket.io-client');

let socketClient = null;

module.exports = {
  init(client) {
    logger.info('Sistema de Monitoreo de DMs iniciado');

    const API_URL = process.env.API_URL || `http://localhost:${process.env.API_PORT || 3000}`;
    try {
      socketClient = SocketIOClient(API_URL, {
        auth: { token: process.env.API_SECRET_KEY },
        transports: ['websocket'],
        reconnection: true,
      });
      socketClient.on('connect', () => logger.info('📡 DM System conectado a Socket.IO'));
      socketClient.on('connect_error', () => {});
      logger.info('📡 DM System conectado a WebSocket de la API');
    } catch (err) {
      logger.debug(`DM Socket.IO no disponible: ${err.message}`);
    }
  },

  async handleDM(message, client) {
    try {
      const existing = await DirectMessage.findOne({ messageId: message.id });
      if (existing) return;

      const dm = await DirectMessage.create({
        messageId:  message.id,
        authorId:   message.author.id,
        authorTag:  message.author.tag,
        authorAvatar: message.author.displayAvatarURL({ dynamic: true }),
        channelId:  message.channel.id,
        content:    message.content || '',
        attachments: message.attachments.map(a => ({
          url: a.url,
          name: a.name,
          size: a.size,
        })),
        embeds:     message.embeds.map(e => e.toJSON()),
        read:       false,
        replied:    false,
      });

      logger.discord(`📩 DM recibido de ${message.author.tag}: "${message.content?.slice(0, 60)}"`);

      if (socketClient?.connected) {
        socketClient.emit('dm:new', dm.toObject());
      }

      const ownerId = process.env.OWNER_ID;
      if (ownerId) {
        const owner = await client.users.fetch(ownerId).catch(() => null);
        if (owner) {
          const notification = `📩 **Nuevo DM** de **${message.author.tag}** (${message.author.id})\n\`\`\`${(message.content || 'Sin texto').slice(0, 200)}\`\`\``;
          await owner.send(notification).catch(() => {});
        }
      }

      return dm;
    } catch (err) {
      logger.error(`Error manejando DM: ${err.message}`);
    }
  },

  async getDMs(filters = {}) {
    const query = {};
    if (filters.authorId) query.authorId = filters.authorId;
    if (filters.read !== undefined) query.read = filters.read === 'true' || filters.read === true;
    if (filters.replied !== undefined) query.replied = filters.replied === 'true' || filters.replied === true;

    const page = parseInt(filters.page) || 1;
    const limit = Math.min(parseInt(filters.limit) || 50, 100);
    const skip = (page - 1) * limit;

    const [dms, total] = await Promise.all([
      DirectMessage.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      DirectMessage.countDocuments(query),
    ]);

    return { dms, total, page, pages: Math.ceil(total / limit) };
  },

  async getConversations() {
    const conversations = await DirectMessage.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: {
          _id: '$authorId',
          authorTag: { $first: '$authorTag' },
          authorAvatar: { $first: '$authorAvatar' },
          lastMessage: { $first: '$content' },
          lastMessageAt: { $first: '$createdAt' },
          unreadCount: { $sum: { $cond: ['$read', 0, 1] } },
          totalMessages: { $sum: 1 },
      }},
      { $sort: { lastMessageAt: -1 } },
    ]);
    return conversations;
  },

  async markAsRead(messageId) {
    return DirectMessage.findByIdAndUpdate(messageId, { read: true }, { new: true });
  },

  async markAllAsRead(authorId) {
    return DirectMessage.updateMany({ authorId, read: false }, { read: true });
  },

  async replyToDM(messageId, replyContent, repliedBy) {
    return DirectMessage.findByIdAndUpdate(messageId, {
      replied: true,
      replyContent,
      replyAt: new Date(),
      repliedBy,
    }, { new: true });
  },

  async deleteDM(messageId) {
    return DirectMessage.findByIdAndDelete(messageId);
  },

  async getStats() {
    const [total, unread, uniqueUsers] = await Promise.all([
      DirectMessage.countDocuments(),
      DirectMessage.countDocuments({ read: false }),
      DirectMessage.distinct('authorId').then(ids => ids.length),
    ]);
    return { total, unread, uniqueUsers };
  },
};
