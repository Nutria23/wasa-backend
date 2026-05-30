/**
 * Sistema Anti-Nuke
 * Protege contra eliminaciones masivas de canales, roles, bans, etc.
 */

const { PermissionFlagsBits, AuditLogEvent } = require('discord.js');
const Guild = require('../../models/Guild');
const SecurityLog = require('../../models/SecurityLog');
const { securityEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

// Cache: Map<guildId_userId_action, [timestamps]>
const nukeCache = new Map();

module.exports = {
  init(client) {
    // Registrar listeners de eventos de nuke
    client.on('channelDelete', (channel) => this.handle(client, channel.guild, 'channelDelete', channel.id));
    client.on('roleDelete', (role) => this.handle(client, role.guild, 'roleDelete', role.id));
    client.on('guildBanAdd', (ban) => this.handle(client, ban.guild, 'memberBan', ban.user.id));
    client.on('guildMemberRemove', (member) => {
      // Solo si fue un kick (no leave normal)
      this.checkKick(client, member);
    });
    client.on('webhookUpdate', (channel) => this.handle(client, channel.guild, 'webhookCreate', channel.id));

    logger.security('Anti-Nuke iniciado');
  },

  async checkKick(client, member) {
    // Verificar en audit log si fue un kick
    try {
      const auditLogs = await member.guild.fetchAuditLogs({
        type: AuditLogEvent.MemberKick,
        limit: 1,
      });
      const kickLog = auditLogs.entries.first();
      if (!kickLog) return;

      const timeDiff = Date.now() - kickLog.createdTimestamp;
      if (timeDiff > 5000) return; // Más de 5 segundos, no es reciente

      await this.handle(client, member.guild, 'memberKick', member.id, kickLog.executor?.id);
    } catch {}
  },

  /**
   * Maneja un evento potencialmente nuke
   */
  async handle(client, guild, action, targetId, actorId = null) {
    if (!guild) return;

    let guildConfig;
    try {
      guildConfig = await Guild.findOne({ guildId: guild.id });
    } catch {
      return;
    }

    if (!guildConfig?.modules?.antiNuke || !guildConfig?.antiNuke?.enabled) return;

    const cfg = guildConfig.antiNuke;
    const actionConfig = guildConfig.antiNuke[action] || getDefaultActionConfig(action);
    if (!actionConfig?.enabled) return;

    // Obtener el ejecutor del audit log si no se proporcionó
    if (!actorId) {
      actorId = await getAuditLogExecutor(guild, action);
    }

    if (!actorId) return;

    // Verificar whitelist
    if (cfg.whitelist?.includes(actorId)) return;

    // Si el actor es el bot, ignorar
    if (actorId === client.user.id) return;

    // Si el actor es el dueño, ignorar
    if (actorId === guild.ownerId) return;

    // Registrar en caché
    const cacheKey = `${guild.id}:${actorId}:${action}`;
    const now = Date.now();

    if (!nukeCache.has(cacheKey)) nukeCache.set(cacheKey, []);
    const events = nukeCache.get(cacheKey);
    events.push(now);

    const timeWindow = actionConfig.timeWindow || 10000;
    const recent = events.filter(t => now - t < timeWindow);
    nukeCache.set(cacheKey, recent);

    if (recent.length >= (actionConfig.threshold || 3)) {
      logger.security(`🚨 NUKE DETECTADO: ${action} x${recent.length} por ${actorId} en ${guild.name}`);

      // Resetear contador
      nukeCache.set(cacheKey, []);

      // Obtener el miembro atacante
      const attacker = await guild.members.fetch(actorId).catch(() => null);
      if (!attacker) return;

      // Aplicar acción contra el atacante
      await this.punishAttacker(guild, attacker, action, cfg.action || 'strip_permissions');

      // Registrar en DB
      await SecurityLog.create({
        guildId: guild.id,
        type: 'ANTI_NUKE',
        severity: 'critical',
        actorId,
        actorTag: attacker.user?.tag,
        details: `Nuke detectado: ${action} x${recent.length} acciones`,
        metadata: { action, count: recent.length, targetId },
      }).catch(() => {});

      // Enviar alerta
      await this.sendNukeAlert(guild, guildConfig, attacker, action, recent.length);
    }
  },

  /**
   * Sanciona al atacante
   */
  async punishAttacker(guild, attacker, action, punishment) {
    switch (punishment) {
      case 'strip_permissions':
        // Remover todos los roles del atacante
        const adminRole = attacker.roles.cache.find(r => r.permissions.has(PermissionFlagsBits.Administrator));
        if (adminRole) {
          await attacker.roles.remove(
            attacker.roles.cache.filter(r => r.id !== guild.id),
            `Anti-Nuke: ${action}`
          ).catch(() => {});
        }
        // Timeout de 28 días (máximo)
        await attacker.timeout(27 * 24 * 60 * 60 * 1000, `Anti-Nuke: ${action}`).catch(() => {});
        break;

      case 'ban':
        await guild.members.ban(attacker.id, {
          reason: `Anti-Nuke: ${action}`,
          deleteMessageSeconds: 86400,
        }).catch(() => {});
        break;

      case 'kick':
        await attacker.kick(`Anti-Nuke: ${action}`).catch(() => {});
        break;
    }
  },

  async sendNukeAlert(guild, guildConfig, attacker, action, count) {
    const logChannelId = guildConfig.logs?.security;
    if (!logChannelId) return;

    const channel = guild.channels.cache.get(logChannelId);
    if (!channel) return;

    const embed = securityEmbed({
      title: '💣 NUKE DETECTADO — ACCIÓN TOMADA',
      description: `Se detectó un intento de nuke. El atacante fue sancionado automáticamente.`,
      level: 'critical',
      fields: [
        { name: '👤 Atacante', value: `${attacker.user?.tag} (${attacker.id})`, inline: true },
        { name: '⚡ Acción', value: action, inline: true },
        { name: '🔢 Ocurrencias', value: `${count}`, inline: true },
        { name: '🔨 Sanción', value: guildConfig.antiNuke?.action || 'strip_permissions', inline: true },
      ],
    });

    await channel.send({
      content: `<@${guild.ownerId}> 💣 **ALERTA NUKE**`,
      embeds: [embed],
    }).catch(() => {});
  },
};

async function getAuditLogExecutor(guild, action) {
  const { AuditLogEvent } = require('discord.js');
  const typeMap = {
    channelDelete: AuditLogEvent.ChannelDelete,
    roleDelete: AuditLogEvent.RoleDelete,
    memberBan: AuditLogEvent.MemberBanAdd,
    memberKick: AuditLogEvent.MemberKick,
    webhookCreate: AuditLogEvent.WebhookCreate,
  };

  try {
    const logs = await guild.fetchAuditLogs({ type: typeMap[action], limit: 1 });
    const entry = logs.entries.first();
    if (entry && Date.now() - entry.createdTimestamp < 5000) {
      return entry.executor?.id;
    }
  } catch {}
  return null;
}

function getDefaultActionConfig(action) {
  const defaults = {
    channelDelete: { enabled: true, threshold: 3, timeWindow: 10000 },
    roleDelete:    { enabled: true, threshold: 3, timeWindow: 10000 },
    memberBan:     { enabled: true, threshold: 5, timeWindow: 10000 },
    memberKick:    { enabled: true, threshold: 5, timeWindow: 10000 },
    webhookCreate: { enabled: true, threshold: 3, timeWindow: 10000 },
  };
  return defaults[action] || { enabled: false };
}
