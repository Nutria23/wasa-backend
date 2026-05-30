const express = require('express');
const router = express.Router();
const BotAction = require('../../../bot/src/models/BotAction');

router.post('/:guildId/send', async (req, res) => {
  const { guildId } = req.params;
  const { channelId, embed } = req.body; // embed object

  const botAction = await BotAction.create({
    action: 'SEND_EMBED',
    guildId,
    payload: { channelId, embed }
  });

  let attempts = 0;
  while(attempts < 15) {
    await new Promise(r => setTimeout(r, 300));
    const updated = await BotAction.findById(botAction._id);
    if (updated.status === 'COMPLETED') {
      return res.json({ success: true, result: updated.result });
    } else if (updated.status === 'ERROR') {
      return res.status(500).json({ error: updated.result.error || 'Error enviando el mensaje' });
    }
    attempts++;
  }

  res.status(504).json({ error: 'Timeout esperando al bot' });
});

module.exports = router;
