/**
 * Evento: messageCreate
 * Detección de spam, auto-moderación y tracking de mensajes
 */

const Guild = require('../models/Guild');
const logger = require('../utils/logger');

module.exports = {
  name: 'messageCreate',
  once: false,

  async execute(message, client) {
    // Ignorar bots y mensajes en DM
    if (message.author.bot || !message.guild) return;
    // Ignorar mensajes del sistema
    if (message.system) return;

    try {
      const guildConfig = await Guild.findOne({ guildId: message.guild.id });
      if (!guildConfig) return;

      // ─── ANTI-SPAM ──────────────────────────────────────────────────
      if (guildConfig.modules.antiSpam && guildConfig.antiSpam?.enabled) {
        const triggered = await require('../systems/antispam/antiSpam').check(message, client, guildConfig);
        if (triggered) return; // Mensaje ya fue eliminado
      }

      // ─── AUTO-MOD ───────────────────────────────────────────────────
      if (guildConfig.modules.automod) {
        await require('../systems/automod/autoMod').check(message, client, guildConfig);
      }

    } catch (err) {
      logger.error(`Error en messageCreate: ${err.message}`);
    }
  },
};
