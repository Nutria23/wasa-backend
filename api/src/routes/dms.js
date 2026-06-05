const express = require('express');
const router = express.Router();
const DirectMessage = require('../../../bot/src/models/DirectMessage');
const BotAction = require('../../../bot/src/models/BotAction');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/conversations', async (req, res) => {
  try {
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
    res.json({ conversations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { authorId, read, replied, page = 1, limit = 50 } = req.query;
    const query = {};
    if (authorId) query.authorId = authorId;
    if (read !== undefined) query.read = read === 'true';
    if (replied !== undefined) query.replied = replied === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [dms, total] = await Promise.all([
      DirectMessage.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      DirectMessage.countDocuments(query),
    ]);

    res.json({ dms, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [total, unread, uniqueUsers] = await Promise.all([
      DirectMessage.countDocuments(),
      DirectMessage.countDocuments({ read: false }),
      DirectMessage.distinct('authorId').then(ids => ids.length),
    ]);
    res.json({ stats: { total, unread, uniqueUsers } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:messageId/read', async (req, res) => {
  try {
    const dm = await DirectMessage.findByIdAndUpdate(req.params.messageId, { read: true }, { new: true });
    if (!dm) return res.status(404).json({ error: 'Mensaje no encontrado' });
    res.json({ dm });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/read-all/:authorId', async (req, res) => {
  try {
    await DirectMessage.updateMany({ authorId: req.params.authorId, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:messageId/reply', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'El contenido es requerido' });

    const dm = await DirectMessage.findById(req.params.messageId);
    if (!dm) return res.status(404).json({ error: 'Mensaje no encontrado' });

    await BotAction.create({
      action: 'REPLY_DM',
      payload: {
        channelId: dm.channelId,
        content,
        authorId: dm.authorId,
        originalMessageId: dm.messageId,
      },
    });

    await DirectMessage.findByIdAndUpdate(req.params.messageId, {
      replied: true,
      replyContent: content,
      replyAt: new Date(),
      repliedBy: req.user.id,
    });

    res.json({ success: true, message: 'Respuesta encolada para el bot' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:messageId', async (req, res) => {
  try {
    await DirectMessage.findByIdAndDelete(req.params.messageId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
