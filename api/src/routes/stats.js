/**
 * Rutas: Estadísticas del Dashboard
 */
const express = require('express');
const router = express.Router();
const Guild = require('../../../bot/src/models/Guild');
const Ticket = require('../../../bot/src/models/Ticket');
const SecurityLog = require('../../../bot/src/models/SecurityLog');
const User = require('../../../bot/src/models/User');
const { guildMiddleware } = require('../middleware/auth');

// GET /api/stats/:guildId - Dashboard overview
router.get('/:guildId', guildMiddleware, async (req, res) => {
  try {
    const guildId = req.params.guildId;
    const [guildConfig, totalTickets, openTickets, securityEvents, totalWarns] = await Promise.all([
      Guild.findOne({ guildId }),
      Ticket.countDocuments({ guildId }),
      Ticket.countDocuments({ guildId, status: { $in: ['open', 'claimed'] } }),
      SecurityLog.countDocuments({ guildId }),
      User.aggregate([
        { $match: { guildId } },
        { $group: { _id: null, total: { $sum: '$warnCount' } } },
      ]),
    ]);

    res.json({
      stats: {
        totalTickets,
        openTickets,
        closedTickets: totalTickets - openTickets,
        securityEvents,
        totalWarns: totalWarns[0]?.total || 0,
        ...guildConfig?.stats,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
