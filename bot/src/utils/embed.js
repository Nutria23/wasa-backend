/**
 * Utilidades para crear Embeds de Discord
 * Estandariza el diseño visual del bot
 */

const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');

/**
 * Crea un embed de éxito (verde)
 * @param {string} title 
 * @param {string} description 
 * @param {Object} options - Opciones adicionales
 */
function successEmbed(title, description, options = {}) {
  return new EmbedBuilder()
    .setColor(config.bot.successColor)
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setTimestamp()
    .setFooter(options.footer || { text: config.bot.name })
    .setThumbnail(options.thumbnail || null)
    .setImage(options.image || null);
}

/**
 * Crea un embed de error (rojo)
 */
function errorEmbed(title, description, options = {}) {
  return new EmbedBuilder()
    .setColor(config.bot.errorColor)
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setTimestamp()
    .setFooter(options.footer || { text: config.bot.name });
}

/**
 * Crea un embed de advertencia (amarillo)
 */
function warningEmbed(title, description, options = {}) {
  return new EmbedBuilder()
    .setColor(config.bot.warningColor)
    .setTitle(`⚠️ ${title}`)
    .setDescription(description)
    .setTimestamp()
    .setFooter(options.footer || { text: config.bot.name });
}

/**
 * Crea un embed informativo (azul)
 */
function infoEmbed(title, description, options = {}) {
  return new EmbedBuilder()
    .setColor(config.bot.infoColor)
    .setTitle(`ℹ️ ${title}`)
    .setDescription(description)
    .setTimestamp()
    .setFooter(options.footer || { text: config.bot.name });
}

/**
 * Crea un embed de moderación con campos
 */
function modEmbed({ action, target, moderator, reason, duration, guildName }) {
  const embed = new EmbedBuilder()
    .setColor(config.bot.warningColor)
    .setTitle(`🔨 Acción de Moderación: ${action}`)
    .addFields(
      { name: '👤 Usuario', value: `${target.tag} (${target.id})`, inline: true },
      { name: '🛡️ Moderador', value: `${moderator.tag}`, inline: true },
      { name: '📋 Razón', value: reason || 'Sin razón especificada', inline: false }
    )
    .setThumbnail(target.displayAvatarURL({ dynamic: true }))
    .setTimestamp();

  if (duration) embed.addFields({ name: '⏱️ Duración', value: duration, inline: true });
  if (guildName) embed.setFooter({ text: guildName });

  return embed;
}

/**
 * Crea un embed de ticket
 */
function ticketEmbed({ ticketId, user, category, priority, guildName }) {
  return new EmbedBuilder()
    .setColor(config.bot.embedColor)
    .setTitle(`🎫 Ticket #${ticketId}`)
    .setDescription('Un miembro del soporte te atenderá pronto. Por favor describe tu problema con detalle.')
    .addFields(
      { name: '👤 Usuario', value: `${user}`, inline: true },
      { name: '📂 Categoría', value: category || 'General', inline: true },
      { name: '🔴 Prioridad', value: priority || '🟢 Baja', inline: true }
    )
    .setTimestamp()
    .setFooter({ text: `${guildName} • Ticket System` });
}

/**
 * Crea un embed de seguridad/alerta
 */
function securityEmbed({ title, description, fields = [], level = 'warning' }) {
  const colors = {
    info: '#5865F2',
    warning: '#FEE75C',
    danger: '#ED4245',
    critical: '#FF0000',
  };

  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    danger: '🚨',
    critical: '🆘',
  };

  const embed = new EmbedBuilder()
    .setColor(colors[level] || colors.warning)
    .setTitle(`${icons[level]} ALERTA DE SEGURIDAD: ${title}`)
    .setDescription(description)
    .setTimestamp();

  if (fields.length > 0) embed.addFields(fields);

  return embed;
}

/**
 * Embed de bienvenida
 */
function welcomeEmbed({ member, guildName, guildIcon, memberCount }) {
  return new EmbedBuilder()
    .setColor(config.bot.embedColor)
    .setTitle(`👋 ¡Bienvenido/a a ${guildName}!`)
    .setDescription(
      `¡Hola ${member}! Nos alegra que hayas llegado.\n` +
      `Eres el miembro número **${memberCount}** del servidor.`
    )
    .setThumbnail(member.displayAvatarURL({ dynamic: true, size: 256 }))
    .setImage(guildIcon || null)
    .setTimestamp()
    .setFooter({ text: guildName });
}

module.exports = {
  successEmbed,
  errorEmbed,
  warningEmbed,
  infoEmbed,
  modEmbed,
  ticketEmbed,
  securityEmbed,
  welcomeEmbed,
};
