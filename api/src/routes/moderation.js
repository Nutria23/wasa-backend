const express = require('express');
const router = express.Router();
const BotAction = require('../../../bot/src/models/BotAction');

router.post('/:guildId/:action', async (req, res) => {
  const { guildId, action } = req.params;
  const { userId, reason, duration } = req.body;
  
  const validActions = ['KICK', 'BAN', 'TIMEOUT'];
  if (!validActions.includes(action.toUpperCase())) {
    return res.status(400).json({ error: 'Acción no válida' });
  }

  const botAction = await BotAction.create({
    action: action.toUpperCase(),
    guildId,
    payload: { userId, reason, duration }
  });

  // Wait for result
  let attempts = 0;
  while(attempts < 15) {
    await new Promise(r => setTimeout(r, 300));
    const updated = await BotAction.findById(botAction._id);
    if (updated.status === 'COMPLETED') {
      return res.json({ success: true, result: updated.result });
    } else if (updated.status === 'ERROR') {
      return res.status(500).json({ error: updated.result.error || 'Error ejecutando la acción en el bot' });
    }
    attempts++;
  }

  res.status(504).json({ error: 'Timeout esperando al bot' });
});

module.exports = router;
