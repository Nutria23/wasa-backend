/**
 * Evento: guildMemberAdd
 * Auto-roles y detección de raids (bienvenida gestionada por welcomeSystem)
 */

const Guild = require('../models/Guild');
const User = require('../models/User');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  once: false,

  async execute(member, client) {
    const { guild } = member;

    try {
      // ─── OBTENER CONFIG DEL SERVIDOR ────────────────────────────────────
      let guildConfig = await Guild.findOne({ guildId: guild.id });
      if (!guildConfig) {
        guildConfig = await Guild.create({
          guildId: guild.id,
          guildName: guild.name,
          ownerId: guild.ownerId,
        });
      }

      if (guild.name !== guildConfig.guildName) {
        guildConfig.guildName = guild.name;
        await guildConfig.save();
      }

      // ─── CREAR PERFIL DE USUARIO ────────────────────────────────────────────
      await User.getOrCreate(member.id, guild.id, {
        tag: member.user.tag,
        username: member.user.username,
        avatar: member.user.displayAvatarURL(),
        'stats.joinedAt': member.joinedAt,
      });

      // ─── VERIFICAR ANTI-RAID ───────────────────────────────────────────────
      if (guildConfig.modules.antiRaid && guildConfig.antiRaid.enabled) {
        await require('../systems/antiraid/antiRaid').checkJoin(member, client, guildConfig);
      }

      // ─── AUTO-ROL (aquí también por si el módulo autoroles está activo) ─────
      if (guildConfig.modules.autoroles && guildConfig.autoroles?.length > 0) {
        for (const roleId of guildConfig.autoroles) {
          const role = guild.roles.cache.get(roleId);
          if (role) await member.roles.add(role).catch(() => {});
        }
      }

    } catch (err) {
      logger.error(`Error en guildMemberAdd [${guild.id}]: ${err.message}`);
    }
  },
};
