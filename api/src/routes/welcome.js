const express = require('express');
const router = express.Router();
const Guild = require('../../../bot/src/models/Guild');
const { authMiddleware, guildMiddleware } = require('../middleware/auth');

// GET /api/welcome/:guildId - Obtener config actual
router.get('/:guildId', authMiddleware, guildMiddleware, async (req, res) => {
  try {
    const guild = await Guild.findOne({ guildId: req.params.guildId });
    if (!guild) return res.status(404).json({ error: 'Servidor no encontrado' });
    res.json({ welcome: guild.welcome, modules: guild.modules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/welcome/:guildId - Guardar config de bienvenida
router.post('/:guildId', authMiddleware, guildMiddleware, async (req, res) => {
  try {
    const { enabled, channelId, message, embedEnabled, dmEnabled, dmMessage, autoRole } = req.body;

    const update = {
      'modules.welcome': enabled,
      'welcome.enabled': enabled,
      'welcome.channelId': channelId,
      'welcome.message': message,
      'welcome.embedEnabled': embedEnabled,
      'welcome.dmEnabled': dmEnabled,
      'welcome.dmMessage': dmMessage,
      'welcome.autoRole': autoRole,
    };

    await Guild.findOneAndUpdate(
      { guildId: req.params.guildId },
      { $set: update },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Configuración de bienvenida guardada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
