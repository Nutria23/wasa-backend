const express = require('express');
const router = express.Router();
const BotAction = require('../../../bot/src/models/BotAction');

// Get Bot Status
router.get('/status', async (req, res) => {
  // Simple ping action
  const action = await BotAction.create({ action: 'PING' });
  
  // Wait up to 3 seconds for bot to reply
  let attempts = 0;
  let status = 'OFFLINE';
  while(attempts < 15) {
    await new Promise(r => setTimeout(r, 200));
    const updated = await BotAction.findById(action._id);
    if (updated.status === 'COMPLETED') {
      status = 'ONLINE';
      break;
    }
    attempts++;
  }
  
  res.json({ status });
});

// Control Bot (This sets its presence or status in discord, true bot process is concurrent)
router.post('/presence', async (req, res) => {
  const { status, activity } = req.body;
  await BotAction.create({ 
    action: 'SET_PRESENCE',
    payload: { status, activity }
  });
  res.json({ success: true, message: 'Presencia actualizada' });
});

// Send Ticket Panel
router.post('/:guildId/send-ticket-panel', async (req, res) => {
  const { guildId } = req.params;
  
  await BotAction.create({
    action: 'SEND_TICKET_PANEL',
    guildId,
    payload: {}
  });
  
  res.json({ success: true, message: 'Solicitud de panel enviada al bot' });
});

// Fetch Real Logs
router.get('/logs', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const logsDir = path.join(__dirname, '../../../bot/logs');
  if (!fs.existsSync(logsDir)) return res.json({ logs: [] });
  
  const files = fs.readdirSync(logsDir).filter(f => f.startsWith('combined-')).sort().reverse();
  if (files.length === 0) return res.json({ logs: [] });
  
  const latestFile = path.join(logsDir, files[0]);
  const content = fs.readFileSync(latestFile, 'utf8');
  const lines = content.trim().split('\n').slice(-50);
  const parsed = lines.map(line => {
    try {
      return JSON.parse(line);
    } catch { return null; }
  }).filter(Boolean);
  
  res.json({ logs: parsed });
});

module.exports = router;
