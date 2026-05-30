/**
 * Rutas: Seguridad - Logs y eventos
 */
const express = require('express');
const router = express.Router();
const SecurityLog = require('../../../bot/src/models/SecurityLog');
const { guildMiddleware } = require('../middleware/auth');

// GET /api/security/:guildId/logs
router.get('/:guildId/logs', guildMiddleware, async (req, res) => {
  try {
    const { type, severity, limit = 50, page = 1 } = req.query;
    const query = { guildId: req.params.guildId };
    if (type) query.type = type;
    if (severity) query.severity = severity;

    const logs = await SecurityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await SecurityLog.countDocuments(query);
    res.json({ logs, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
