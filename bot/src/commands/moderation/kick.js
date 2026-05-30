/**
 * Comando: /kick
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed, modEmbed } = require('../../utils/embed');
const User = require('../../models/User');
const logger = require('../../utils/logger');

module.exports = {
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.KickMembers],
  botPermissions: [PermissionFlagsBits.KickMembers],

  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('👢 Expulsa a un miembro del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a expulsar').setRequired(true))
    .addStringOption(opt => opt.setName('razon').setDescription('Razón').setRequired(false).setMaxLength(512)),

  async execute(interaction, client) {
    const target = interaction.options.getMember('usuario');
    const reason = interaction.options.getString('razon') || 'Sin razón especificada';
    const { guild, member: moderator } = interaction;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!target) return interaction.editReply({ embeds: [errorEmbed('Error', 'Usuario no encontrado en el servidor.')] });
    if (target.id === interaction.user.id) return interaction.editReply({ embeds: [errorEmbed('Error', 'No puedes expulsarte.')] });
    if (!target.kickable) return interaction.editReply({ embeds: [errorEmbed('Error', 'No puedo expulsar a este usuario.')] });

    if (target.roles.highest.position >= moderator.roles.highest.position) {
      return interaction.editReply({ embeds: [errorEmbed('Sin Permisos', 'No puedes expulsar a alguien con rol igual o superior.')] });
    }

    await target.user.send({
      embeds: [modEmbed({ action: 'KICK', target: target.user, moderator: interaction.user, reason, guildName: guild.name })],
    }).catch(() => {});

    await target.kick(`[${interaction.user.tag}] ${reason}`);

    await User.findOneAndUpdate(
      { userId: target.id, guildId: guild.id },
      { $push: { infractions: { type: 'kick', reason, moderatorId: interaction.user.id, moderatorTag: interaction.user.tag } } }
    ).catch(() => {});

    logger.security(`KICK: ${target.user.tag} expulsado de ${guild.name}`);

    await interaction.editReply({
      embeds: [successEmbed('Usuario Expulsado', `**${target.user.tag}** fue expulsado.\n**Razón:** ${reason}`)],
    });
  },
};
