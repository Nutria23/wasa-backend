/**
 * Sistema AutoMod Avanzado
 * Filtra palabras prohibidas, links, invitaciones, etc.
 */

const { PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');

// Palabras prohibidas por defecto (customizable por servidor)
const DEFAULT_BANNED_WORDS = [];

// Patrones peligrosos
const INVITE_REGEX = /discord(?:\.gg|app\.com\/invite|\.com\/invite)\/[a-zA-Z0-9]+/gi;
const URL_REGEX = /https?:\/\/[^\s]+/gi;
const IP_REGEX = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
const ZALGO_REGEX = /[\u0300-\u036f\u0489]/g;

module.exports = {
  init(client) {
    logger.security('AutoMod iniciado');
  },

  async check(message, client, guildConfig) {
    const { member, channel } = message;

    // Ignorar admins
    if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

    let triggered = false;
    let reason = null;

    // ─── PALABRAS PROHIBIDAS ──────────────────────────────────────────
    // (Aquí se pueden cargar desde DB por servidor)
    const banned = DEFAULT_BANNED_WORDS;
    if (banned.length > 0) {
      const content = message.content.toLowerCase();
      for (const word of banned) {
        if (content.includes(word)) {
          triggered = true;
          reason = `Palabra prohibida: ${word}`;
          break;
        }
      }
    }

    // ─── INVITACIONES DE DISCORD ──────────────────────────────────────
    // Solo si el servidor lo tiene configurado
    // if (INVITE_REGEX.test(message.content)) {
    //   triggered = true;
    //   reason = 'Invitación no autorizada';
    // }

    // ─── TEXTO ZALGO ──────────────────────────────────────────────────
    const zalgoMatches = message.content.match(ZALGO_REGEX) || [];
    if (zalgoMatches.length > 20) {
      triggered = true;
      reason = 'Texto malformado (Zalgo)';
    }

    if (triggered && reason) {
      await message.delete().catch(() => {});
      const warn = await channel.send(`⚠️ <@${message.author.id}>, tu mensaje fue eliminado: **${reason}**`);
      setTimeout(() => warn.delete().catch(() => {}), 5000);
      return true;
    }

    return false;
  },
};
