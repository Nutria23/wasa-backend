/**
 * Sistema Anti-Spam
 * Detecta y sanciona spam masivo, flood, menciones masivas
 */

const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const User = require('../../models/User');
const SecurityLog = require('../../models/SecurityLog');
const { warningEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

// Caché: Map<userId_guildId, { messages: [], duplicates: Map }>
const spamCache = new Map();

module.exports = {
  /**
   * Inicializa el sistema anti-spam
   */
  init(client) {
    // Limpiar caché cada 5 minutos
    setInterval(() => spamCache.clear(), 5 * 60 * 1000);
    logger.security('Anti-Spam iniciado');
  },

  /**
   * Verifica si un mensaje es spam
   * @returns {boolean} true si fue sancionado
   */
  async check(message, client, guildConfig) {
    const cfg = guildConfig.antiSpam;
    const { author, guild, channel } = message;

    // ─── EXCLUSIONES ───────────────────────────────────────────────
    // Ignorar admins y roles excluidos
    if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return false;
    if (cfg.ignoredRoles?.some(r => message.member.roles.cache.has(r))) return false;
    if (cfg.ignoredChannels?.includes(channel.id)) return false;

    const key = `${author.id}:${guild.id}`;
    const now = Date.now();

    // Inicializar caché del usuario
    if (!spamCache.has(key)) {
      spamCache.set(key, { messages: [], duplicates: new Map(), infractions: 0 });
    }

    const userData = spamCache.get(key);

    // ─── VERIFICAR FLOOD DE MENSAJES ──────────────────────────────
    userData.messages.push(now);
    // Filtrar mensajes fuera de la ventana de tiempo
    userData.messages = userData.messages.filter(t => now - t < cfg.timeWindow);

    let spamType = null;

    if (userData.messages.length >= cfg.messageThreshold) {
      spamType = 'FLOOD';
    }

    // ─── VERIFICAR MENSAJES DUPLICADOS ────────────────────────────
    const content = message.content.toLowerCase().trim();
    if (content.length > 5) {
      const dupCount = (userData.duplicates.get(content) || 0) + 1;
      userData.duplicates.set(content, dupCount);

      // Limpiar duplicados viejos
      setTimeout(() => userData.duplicates.delete(content), cfg.duplicateTimeWindow || 30000);

      if (dupCount >= (cfg.duplicateThreshold || 5)) {
        spamType = 'DUPLICADOS';
      }
    }

    // ─── VERIFICAR MENCIONES MASIVAS ──────────────────────────────
    const mentionCount = message.mentions.users.size + message.mentions.roles.size;
    if (mentionCount >= (cfg.maxMentionsPerMessage || 5)) {
      spamType = 'MENCIONES';
    }

    // ─── VERIFICAR EMOJIS MASIVOS ────────────────────────────────
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
    const emojiCount = (message.content.match(emojiRegex) || []).length;
    if (emojiCount >= (cfg.maxEmojisPerMessage || 10)) {
      spamType = 'EMOJIS';
    }

    // Si no hay spam, salir
    if (!spamType) return false;

    // ─── SANCIONAR ───────────────────────────────────────────────
    userData.infractions += 1;
    spamCache.set(key, userData);

    // Eliminar el mensaje de spam
    await message.delete().catch(() => {});

    // Determinar sanción según infracciones
    const punishments = cfg.punishments || ['warn', 'mute', 'kick', 'ban'];
    const punishIndex = Math.min(userData.infractions - 1, punishments.length - 1);
    const punishment = punishments[punishIndex];

    logger.security(`Spam detectado [${spamType}] - ${author.tag} en ${guild.name} → ${punishment}`);

    // Aplicar sanción
    await applyPunishment(message, punishment, spamType, cfg, guildConfig);

    // Registrar en base de datos
    await logSecurityEvent(guild.id, author, spamType, punishment);

    // Enviar alerta al canal de logs
    await sendSecurityAlert(client, guild, guildConfig, author, spamType, punishment, channel);

    return true;
  },
};

/**
 * Aplica la sanción correspondiente
 */
async function applyPunishment(message, punishment, spamType, cfg, guildConfig) {
  const { member, guild, channel } = message;

  // DM al usuario
  const dmEmbed = warningEmbed(
    'Sancionado por Spam',
    `Has sido sancionado en **${guild.name}** por spam (${spamType}).\nSanción: **${punishment.toUpperCase()}**`
  );
  await message.author.send({ embeds: [dmEmbed] }).catch(() => {});

  switch (punishment) {
    case 'warn':
      // Solo advertir
      const warnMsg = await channel.send({
        content: `<@${member.id}>`,
        embeds: [warningEmbed('⚠️ Advertencia', `${message.author}, por favor no hagas spam (${spamType}).`)],
      });
      setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
      break;

    case 'mute':
      // Timeout de Discord (mute nativo)
      const muteDuration = (cfg.muteDuration || 10) * 60 * 1000;
      await member.timeout(muteDuration, `Anti-Spam: ${spamType}`).catch(() => {});
      break;

    case 'kick':
      await member.kick(`Anti-Spam: ${spamType}`).catch(() => {});
      break;

    case 'ban':
      await guild.members.ban(member.id, {
        reason: `Anti-Spam: ${spamType}`,
        deleteMessageSeconds: 86400, // Eliminar mensajes del último día
      }).catch(() => {});
      break;
  }
}

/**
 * Registra el evento en la base de datos
 */
async function logSecurityEvent(guildId, author, spamType, punishment) {
  await SecurityLog.create({
    guildId,
    type: 'ANTI_SPAM',
    severity: punishment === 'ban' ? 'high' : punishment === 'kick' ? 'medium' : 'low',
    actorId: author.id,
    actorTag: author.tag,
    details: `Spam tipo ${spamType} → Sanción: ${punishment}`,
  }).catch(() => {});
}

/**
 * Envía alerta al canal de seguridad
 */
async function sendSecurityAlert(client, guild, guildConfig, author, spamType, punishment, spamChannel) {
  const logChannelId = guildConfig.logs?.security;
  if (!logChannelId) return;

  const logChannel = guild.channels.cache.get(logChannelId);
  if (!logChannel) return;

  const { securityEmbed } = require('../../utils/embed');
  const embed = securityEmbed({
    title: 'Spam Detectado',
    description: `Un usuario fue sancionado por spam automáticamente.`,
    level: punishment === 'ban' ? 'danger' : 'warning',
    fields: [
      { name: '👤 Usuario', value: `${author.tag} (${author.id})`, inline: true },
      { name: '📝 Tipo', value: spamType, inline: true },
      { name: '🔨 Sanción', value: punishment.toUpperCase(), inline: true },
      { name: '📍 Canal', value: `<#${spamChannel.id}>`, inline: true },
    ],
  });

  await logChannel.send({ embeds: [embed] }).catch(() => {});
}
