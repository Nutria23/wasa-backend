/**
 * Rutas: Guilds (Servidores)
 */

const express = require('express');
const router = express.Router();
const Guild = require('../../../bot/src/models/Guild');
const { guildMiddleware } = require('../middleware/auth');

// GET /api/guilds - Listar guilds del usuario (desde JWT)
router.get('/', (req, res) => {
  res.json({ guilds: req.user.guilds });
});

// GET /api/guilds/:guildId - Config del servidor
router.get('/:guildId', guildMiddleware, async (req, res) => {
  try {
    const config = await Guild.findOne({ guildId: req.params.guildId });
    if (!config) return res.status(404).json({ error: 'Servidor no encontrado' });
    res.json({ config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/guilds/:guildId - Actualizar config
router.patch('/:guildId', guildMiddleware, async (req, res) => {
  try {
    const allowed = ['modules', 'antiSpam', 'antiRaid', 'antiNuke', 'tickets', 'welcome', 'logs'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key]) update[key] = req.body[key];
    }

    const config = await Guild.findOneAndUpdate(
      { guildId: req.params.guildId },
      { $set: update },
      { new: true, upsert: true }
    );

    res.json({ config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
