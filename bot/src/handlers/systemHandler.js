/**
 * Handler de Sistemas
 * Inicializa todos los sistemas del bot (anti-raid, tickets, etc.)
 */

const logger = require('../utils/logger');

/**
 * Carga e inicializa todos los sistemas del bot
 * @param {Client} client
 */
async function loadSystems(client) {
  const systems = [
    { name: 'Anti-Spam', loader: () => require('../systems/antispam/antiSpam').init(client) },
    { name: 'Anti-Raid', loader: () => require('../systems/antiraid/antiRaid').init(client) },
    { name: 'Anti-Nuke', loader: () => require('../systems/antinuke/antiNuke').init(client) },
    { name: 'Tickets',   loader: () => require('../systems/tickets/ticketSystem').init(client) },
    { name: 'Welcome',   loader: () => require('../systems/welcome/welcomeSystem').init(client) },
    { name: 'AutoMod',   loader: () => require('../systems/automod/autoMod').init(client) },
    { name: 'Dashboard', loader: () => require('../systems/dashboard/actionPoller')(client) },
    { name: 'DM Monitor', loader: () => require('../systems/dms/dmSystem').init(client) },
  ];

  for (const system of systems) {
    try {
      await system.loader();
      logger.info(`  ✓ Sistema [${system.name}] iniciado`);
    } catch (err) {
      logger.error(`Error al iniciar sistema [${system.name}]: ${err.message}`);
    }
  }
}

module.exports = { loadSystems };
