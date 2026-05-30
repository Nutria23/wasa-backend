/**
 * Comando: /timeout (mute temporal nativo de Discord)
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed, modEmbed } = require('../../utils/embed');
const ms = require('ms');

module.exports = {
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],

  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('⏳ Aplica timeout (silencio) a un usuario')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true))
    .addStringOption(opt =>
      opt.setName('duracion')
        .setDescription('Duración: 1m, 1h, 1d (max 28d)')
        .setRequired(true)
    )
    .addStringOption(opt => opt.setName('razon').setDescription('Razón').setRequired(false)),

  async execute(interaction, client) {
    const target = interaction.options.getMember('usuario');
    const duration = interaction.options.getString('duracion');
    const reason = interaction.options.getString('razon') || 'Sin razón especificada';
    const { guild, member: moderator } = interaction;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!target) return interaction.editReply({ embeds: [errorEmbed('Error', 'Usuario no encontrado.')] });

    // Parsear duración
    const durationMs = ms(duration);
    if (!durationMs || durationMs < 1000 || durationMs > 27 * 24 * 60 * 60 * 1000) {
      return interaction.editReply({
        embeds: [errorEmbed('Duración Inválida', 'Usa formatos como: `10m`, `1h`, `2d`. Máximo: 27 días.')],
      });
    }

    if (!target.moderatable) {
      return interaction.editReply({ embeds: [errorEmbed('Error', 'No puedo silenciar a este usuario.')] });
    }

    if (target.roles.highest.position >= moderator.roles.highest.position) {
      return interaction.editReply({ embeds: [errorEmbed('Sin Permisos', 'No puedes silenciar a alguien con rol igual o superior.')] });
    }

    await target.timeout(durationMs, `[${interaction.user.tag}] ${reason}`);

    await target.user.send({
      embeds: [modEmbed({ action: 'TIMEOUT', target: target.user, moderator: interaction.user, reason, duration, guildName: guild.name })],
    }).catch(() => {});

    await interaction.editReply({
      embeds: [successEmbed('Timeout Aplicado', `**${target.user.tag}** fue silenciado por **${duration}**.\n**Razón:** ${reason}`)],
    });
  },
};
