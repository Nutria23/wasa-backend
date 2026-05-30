/**
 * Comando: /userinfo
 * Muestra información detallada de un usuario
 */
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../../models/User');
const config = require('../../config/config');

module.exports = {
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('ℹ️ Muestra información de un usuario')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario (opcional)').setRequired(false)),

  async execute(interaction, client) {
    const target = interaction.options.getMember('usuario') || interaction.member;
    const { guild } = interaction;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const userProfile = await User.findOne({ userId: target.id, guildId: guild.id });

    const embed = new EmbedBuilder()
      .setColor(target.displayHexColor || config.bot.embedColor)
      .setTitle(`👤 ${target.user.tag}`)
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '🆔 ID', value: target.id, inline: true },
        { name: '🤖 Bot', value: target.user.bot ? 'Sí' : 'No', inline: true },
        { name: '📅 Cuenta creada', value: `<t:${Math.floor(target.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '📥 Se unió al servidor', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: '🎨 Color del rol', value: target.displayHexColor || 'N/A', inline: true },
        { name: '🏆 Rol más alto', value: `${target.roles.highest}`, inline: true },
        { name: `🎭 Roles (${target.roles.cache.size - 1})`, value: target.roles.cache.filter(r => r.id !== guild.id).map(r => `${r}`).slice(0, 10).join(', ') || 'Sin roles', inline: false },
      )
      .setTimestamp();

    if (userProfile) {
      embed.addFields(
        { name: '⚠️ Warns', value: `${userProfile.warnCount}`, inline: true },
        { name: '📋 Infracciones', value: `${userProfile.infractions.length}`, inline: true },
        { name: '🎫 Tickets', value: `${userProfile.stats?.totalTickets || 0}`, inline: true },
        { name: '🚫 Blacklist', value: userProfile.blacklisted ? '⛔ Sí' : '✅ No', inline: true },
      );
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
