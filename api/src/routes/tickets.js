const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Ticket = require('../../../bot/src/models/Ticket');
const { guildMiddleware } = require('../middleware/auth');

router.get('/:guildId', guildMiddleware, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { guildId: req.params.guildId };
    if (status) query.status = status;

    const tickets = await Ticket.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Ticket.countDocuments(query);

    res.json({ tickets, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:guildId/:ticketId', guildMiddleware, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ guildId: req.params.guildId, ticketId: req.params.ticketId });
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });
    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:guildId/:ticketId/transcript', guildMiddleware, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ guildId: req.params.guildId, ticketId: req.params.ticketId });
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

    if (!ticket.transcriptFile) return res.status(404).json({ error: 'Transcript no disponible' });

    const filepath = path.join(__dirname, '../../../bot/transcripts', ticket.transcriptFile);
    if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Archivo de transcript no encontrado' });

    res.sendFile(filepath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
