/**
 * Sistema Anti-Raid
 * Detecta y bloquea raids masivos al servidor
 */

const { PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const Backup = require('../../models/Backup');
const SecurityLog = require('../../models/SecurityLog');
const { securityEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

// Caché de joins recientes: Map<guildId, [timestamp, ...]>
const joinCache = new Map();

module.exports = {
  init(client) {
    logger.security('Anti-Raid iniciado');
  },

  /**
   * Verifica si hay raid cuando alguien se une
   */
  async checkJoin(member, client, guildConfig) {
    const cfg = guildConfig.antiRaid;
    const guildId = member.guild.id;
    const now = Date.now();

    // Si el servidor está en lockdown, kickear al recién llegado
    if (cfg.isActive) {
      await member.kick('Servidor en lockdown (Anti-Raid)').catch(() => {});
      return;
    }

    // Verificar whitelist
    if (cfg.whitelist?.includes(member.id)) return;

    // Registrar join
    if (!joinCache.has(guildId)) joinCache.set(guildId, []);
    const joins = joinCache.get(guildId);
    joins.push(now);

    // Filtrar joins dentro de la ventana de tiempo
    const window = cfg.joinTimeWindow || 10000;
    const recentJoins = joins.filter(t => now - t < window);
    joinCache.set(guildId, recentJoins);

    const threshold = cfg.joinThreshold || 10;

    if (recentJoins.length >= threshold) {
      logger.security(`🚨 RAID DETECTADO en ${member.guild.name} - ${recentJoins.length} joins en ${window/1000}s`);

      // Activar lockdown
      await this.activateLockdown(member.guild, client, guildConfig, `Raid detectado: ${recentJoins.length} usuarios en ${window/1000}s`);

      // Resetear caché
      joinCache.set(guildId, []);
    }
  },

  /**
   * Activa el modo lockdown del servidor
   */
  async activateLockdown(guild, client, guildConfig, reason = 'Protección Anti-Raid') {
    if (guildConfig.antiRaid.isActive) return; // Ya en lockdown

    logger.security(`🔒 LOCKDOWN ACTIVADO: ${guild.name}`);

    // Marcar en DB
    await Guild.findOneAndUpdate(
      { guildId: guild.id },
      { 'antiRaid.isActive': true, 'antiRaid.activatedAt': new Date() }
    );

    // Bloquear todos los canales para @everyone
    const everyone = guild.roles.everyone;
    const channels = guild.channels.cache.filter(c =>
      c.isTextBased() && c.manageable && !c.isDMBased()
    );

    for (const [, channel] of channels) {
      await channel.permissionOverwrites.edit(everyone, {
        SendMessages: false,
        AddReactions: false,
      }).catch(() => {});
    }

    // Actualizar estadísticas
    await Guild.findOneAndUpdate(
      { guildId: guild.id },
      { $inc: { 'stats.raidBlocked': 1 } }
    );

    // Registrar evento de seguridad
    await SecurityLog.create({
      guildId: guild.id,
      type: 'LOCKDOWN_START',
      severity: 'critical',
      details: reason,
    }).catch(() => {});

    // Enviar alerta al canal de seguridad
    await sendRaidAlert(guild, guildConfig, client, reason);

    // Auto-desbloquear después del tiempo configurado
    const duration = (guildConfig.antiRaid.lockdownDuration || 30) * 60 * 1000;
    setTimeout(async () => {
      await this.deactivateLockdown(guild, guildConfig);
    }, duration);
  },

  /**
   * Desactiva el lockdown y restaura los permisos
   */
  async deactivateLockdown(guild, guildConfig) {
    logger.security(`🔓 Lockdown desactivado: ${guild.name}`);

    await Guild.findOneAndUpdate(
      { guildId: guild.id },
      { 'antiRaid.isActive': false }
    );

    // Restaurar permisos de @everyone
    const everyone = guild.roles.everyone;
    const channels = guild.channels.cache.filter(c =>
      c.isTextBased() && c.manageable && !c.isDMBased()
    );

    for (const [, channel] of channels) {
      await channel.permissionOverwrites.edit(everyone, {
        SendMessages: null,
        AddReactions: null,
      }).catch(() => {});
    }

    await SecurityLog.create({
      guildId: guild.id,
      type: 'LOCKDOWN_END',
      severity: 'low',
      details: 'Lockdown desactivado automáticamente',
    }).catch(() => {});
  },

  /**
   * Backup automático de todos los servidores
   */
  async autoBackupAll(client) {
    logger.info('🔄 Iniciando backups automáticos...');
    for (const [guildId, guild] of client.guilds.cache) {
      try {
        await this.createBackup(guild, 'auto');
      } catch (err) {
        logger.error(`Error al crear backup de ${guildId}: ${err.message}`);
      }
    }
    logger.info('✅ Backups completados');
  },

  /**
   * Crea un backup del servidor
   */
  async createBackup(guild, createdBy = 'auto', label = null) {
    const backup = {
      guildId: guild.id,
      guildName: guild.name,
      createdBy,
      type: createdBy === 'auto' ? 'auto' : 'manual',
      label: label || `Backup ${new Date().toISOString().slice(0, 10)}`,
      data: {
        name: guild.name,
        icon: guild.iconURL(),
        description: guild.description,
        verificationLevel: guild.verificationLevel,
        defaultMessageNotifications: guild.defaultMessageNotifications,
        explicitContentFilter: guild.explicitContentFilter,
        afkTimeout: guild.afkTimeout,
        roles: guild.roles.cache
          .filter(r => r.name !== '@everyone')
          .map(r => ({
            id: r.id,
            name: r.name,
            color: r.color,
            hoist: r.hoist,
            position: r.position,
            permissions: r.permissions.bitfield.toString(),
            mentionable: r.mentionable,
          })),
        channels: guild.channels.cache.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          position: c.position,
          parentId: c.parentId,
          topic: c.topic,
          nsfw: c.nsfw,
          rateLimitPerUser: c.rateLimitPerUser,
        })),
      },
    };

    // Guardar y mantener solo los últimos 5 backups
    await Backup.create(backup);
    const count = await Backup.countDocuments({ guildId: guild.id });
    if (count > 5) {
      const oldest = await Backup.find({ guildId: guild.id }).sort({ createdAt: 1 }).limit(count - 5);
      await Backup.deleteMany({ _id: { $in: oldest.map(b => b._id) } });
    }

    return backup;
  },
};

async function sendRaidAlert(guild, guildConfig, client, reason) {
  const logChannelId = guildConfig.logs?.security;
  if (!logChannelId) return;

  const logChannel = guild.channels.cache.get(logChannelId);
  if (!logChannel) return;

  const embed = securityEmbed({
    title: '🚨 RAID DETECTADO — SERVIDOR EN LOCKDOWN',
    description: `El servidor ha sido puesto en **modo lockdown** automáticamente.\n\n**Razón:** ${reason}`,
    level: 'critical',
    fields: [
      { name: '🔒 Estado', value: 'LOCKDOWN ACTIVO', inline: true },
      { name: '⏱️ Duración', value: `${guildConfig.antiRaid.lockdownDuration || 30} minutos`, inline: true },
      { name: '📋 Acción', value: 'Mensajes bloqueados para @everyone', inline: false },
    ],
  });

  // Mencionar al dueño del servidor
  await logChannel.send({
    content: `<@${guild.ownerId}> 🚨 **ALERTA DE RAID**`,
    embeds: [embed],
  }).catch(() => {});
}
