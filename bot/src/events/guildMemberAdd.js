/**
 * Evento: guildMemberAdd
 * Bienvenidas, auto-roles y detección de raids
 */

const Guild = require('../models/Guild');
const User = require('../models/User');
const { welcomeEmbed } = require('../utils/embed');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  once: false,

  async execute(member, client) {
    const { guild } = member;

    try {
      // ─── OBTENER CONFIG DEL SERVIDOR ────────────────────────────────
      let guildConfig = await Guild.findOne({ guildId: guild.id });
      if (!guildConfig) {
        guildConfig = await Guild.create({
          guildId: guild.id,
          guildName: guild.name,
          ownerId: guild.ownerId,
        });
      }

      // ─── ACTUALIZAR ICONO DEL SERVIDOR ──────────────────────────────
      if (guild.name !== guildConfig.guildName) {
        guildConfig.guildName = guild.name;
        await guildConfig.save();
      }

      // ─── CREAR PERFIL DE USUARIO ────────────────────────────────────
      await User.getOrCreate(member.id, guild.id, {
        tag: member.user.tag,
        username: member.user.username,
        avatar: member.user.displayAvatarURL(),
        'stats.joinedAt': member.joinedAt,
      });

      // ─── VERIFICAR ANTI-RAID ─────────────────────────────────────────
      if (guildConfig.modules.antiRaid && guildConfig.antiRaid.enabled) {
        await require('../systems/antiraid/antiRaid').checkJoin(member, client, guildConfig);
      }

      // ─── AUTO-ROL ────────────────────────────────────────────────────
      if (guildConfig.modules.autoroles && guildConfig.autoroles?.length > 0) {
        for (const roleId of guildConfig.autoroles) {
          const role = guild.roles.cache.get(roleId);
          if (role) {
            await member.roles.add(role).catch(() => {});
          }
        }
      }

      // ─── MENSAJE DE BIENVENIDA ───────────────────────────────────────
      if (guildConfig.modules.welcome && guildConfig.welcome?.enabled && guildConfig.welcome?.channelId) {
        const channel = guild.channels.cache.get(guildConfig.welcome.channelId);
        if (channel) {
          const memberCount = guild.memberCount;
          const embed = welcomeEmbed({
            member,
            guildName: guild.name,
            guildIcon: guild.bannerURL({ size: 1024 }),
            memberCount,
          });

          // Mensaje personalizado o embed
          const welcomeMsg = guildConfig.welcome.message
            ? guildConfig.welcome.message.replace('{user}', `<@${member.id}>`).replace('{server}', guild.name)
            : null;

          await channel.send({
            content: welcomeMsg || `¡Bienvenido/a ${member}!`,
            embeds: [embed],
          });
        }
      }

      // ─── DM DE BIENVENIDA ────────────────────────────────────────────
      if (guildConfig.welcome?.dmEnabled && guildConfig.welcome?.dmMessage) {
        const dmMsg = guildConfig.welcome.dmMessage
          .replace('{user}', member.user.username)
          .replace('{server}', guild.name);
        await member.user.send(dmMsg).catch(() => {}); // Ignorar si DMs desactivados
      }

    } catch (err) {
      logger.error(`Error en guildMemberAdd [${guild.id}]: ${err.message}`);
    }
  },
};
