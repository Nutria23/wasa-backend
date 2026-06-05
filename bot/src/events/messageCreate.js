/**
 * Evento: messageCreate
 * Detección de spam, auto-moderación y tracking de mensajes
 */

const Guild = require('../models/Guild');
const Ticket = require('../models/Ticket');
const logger = require('../utils/logger');

module.exports = {
  name: 'messageCreate',
  once: false,

  async execute(message, client) {
    // Ignorar bots
    if (message.author.bot) return;

    // ─── MANEJAR DMs (MENSAJES DIRECTOS AL BOT) ────────────────────
    if (!message.guild) {
      return require('../systems/dms/dmSystem').handleDM(message, client);
    }
    // Ignorar mensajes del sistema
    if (message.system) return;

    try {
      const guildConfig = await Guild.findOne({ guildId: message.guild.id });
      if (!guildConfig) return;

      // ─── REGISTRAR MENSAJES DE TICKET ───────────────────────────────
      // Si el canal es un ticket activo, guardar el mensaje en la DB
      const activeTicket = await Ticket.findOne({
        channelId: message.channel.id,
        guildId: message.guild.id,
        status: { $in: ['open', 'claimed'] },
      });
      if (activeTicket) {
        await Ticket.findByIdAndUpdate(activeTicket._id, {
          $push: {
            messages: {
              authorId: message.author.id,
              authorTag: message.author.tag,
              content: message.content || '[Sin texto]',
              attachments: message.attachments.map(a => a.url),
              timestamp: message.createdAt,
            }
          },
          lastActivity: new Date(),
        });
      }

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
