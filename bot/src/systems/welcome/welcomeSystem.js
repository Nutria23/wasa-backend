/**
 * Sistema de Bienvenida - Estilo Nekotina
 * Genera una tarjeta de imagen con el avatar del usuario y la envía al canal configurado
 */

const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  init(client) {
    logger.info('Sistema de Bienvenida (estilo Nekotina) iniciado');

    client.on('guildMemberAdd', async (member) => {
      try {
        const guildConfig = await Guild.findOne({ guildId: member.guild.id });
        if (!guildConfig?.modules?.welcome) return;
        if (!guildConfig.welcome?.enabled) return;
        if (!guildConfig.welcome?.channelId) return;

        const channel = member.guild.channels.cache.get(guildConfig.welcome.channelId);
        if (!channel || !channel.isTextBased()) return;

        const { generateWelcomeCard } = require('../../utils/welcomeCard');

        const bannerUrl = member.guild.bannerURL({ size: 1024, extension: 'png' }) || null;
        const avatarUrl = member.user.displayAvatarURL({ extension: 'png', forceStatic: true });
        const memberCount = member.guild.memberCount;

        // Generar tarjeta de bienvenida
        const cardBuffer = await generateWelcomeCard({
          avatarUrl,
          username: member.user.username,
          bannerUrl,
          memberCount,
        });

        const attachment = new AttachmentBuilder(cardBuffer, { name: 'bienvenida.png' });

        // Mensaje de texto personalizable (con variables)
        const rawMsg = guildConfig.welcome.message || '¡Bienvenido/a {user} a **{server}**!';
        const welcomeText = rawMsg
          .replace('{user}',   `<@${member.id}>`)
          .replace('{server}', member.guild.name);

        await channel.send({
          content: welcomeText,
          files: [attachment],
        });

        // DM de bienvenida (opcional)
        if (guildConfig.welcome.dmEnabled && guildConfig.welcome.dmMessage) {
          const dmMsg = guildConfig.welcome.dmMessage
            .replace('{user}',   member.user.username)
            .replace('{server}', member.guild.name);
          await member.user.send(dmMsg).catch(() => {});
        }

        // Auto-rol (opcional)
        if (guildConfig.welcome.autoRole) {
          const role = member.guild.roles.cache.get(guildConfig.welcome.autoRole);
          if (role) await member.roles.add(role).catch(() => {});
        }

      } catch (err) {
        logger.error(`[Welcome] Error al enviar bienvenida: ${err.message}`);
      }
    });
  },
};
