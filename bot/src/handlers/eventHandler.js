/**
 * Handler de Eventos de Discord
 * Carga automáticamente todos los eventos de la carpeta events/
 */

const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

/**
 * Carga todos los eventos desde la carpeta /events
 * @param {Client} client
 */
async function loadEvents(client) {
  const eventsPath = path.join(__dirname, '../events');
  const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  for (const file of eventFiles) {
    try {
      const event = require(path.join(eventsPath, file));

      if (!event.name || !event.execute) {
        logger.warn(`⚠️  El evento ${file} no tiene 'name' o 'execute'`);
        continue;
      }

      // Registrar el evento (once para eventos de una sola vez, on para el resto)
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }

      logger.discord(`  Evento registrado: ${event.name}`);
    } catch (err) {
      logger.error(`Error al cargar evento ${file}: ${err.message}`);
    }
  }
}

module.exports = { loadEvents };
