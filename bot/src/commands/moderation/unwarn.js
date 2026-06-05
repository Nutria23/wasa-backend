/**
 * Comando: /unwarn
 * Elimina una advertencia específica de un usuario
 */

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const User = require('../../models/User');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.ModerateMembers],

  data: new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('⚠️ Quita una advertencia a un usuario')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt =>
      opt.setName('usuario').setDescription('Usuario').setRequired(true))
    .addIntegerOption(opt =>
      opt.setName('numero').setDescription('Número de la advertencia a quitar (1 = la más antigua)').setRequired(true).setMinValue(1)),

  async execute(interaction, client) {
    const target = interaction.options.getUser('usuario');
    const warnNum = interaction.options.getInteger('numero');
    const { guild } = interaction;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (target.bot) {
      return interaction.editReply({ embeds: [errorEmbed('Error', 'Los bots no tienen advertencias.')] });
    }

    const userProfile = await User.findOne({ userId: target.id, guildId: guild.id });
    if (!userProfile || userProfile.warns.length === 0) {
      return interaction.editReply({ embeds: [errorEmbed('Error', `${target.tag} no tiene advertencias.`)] });
    }

    if (warnNum > userProfile.warns.length) {
      return interaction.editReply({
        embeds: [errorEmbed('Error', `${target.tag} tiene ${userProfile.warns.length} advertencia(s). Número ${warnNum} no existe.`)],
      });
    }

    const warn = userProfile.warns[warnNum - 1];

    await userProfile.removeWarnByIndex(warnNum - 1);

    logger.security(`⚠️ Warn removido: ${target.tag} en ${guild.name} por ${interaction.user.tag} (razón original: "${warn.reason}")`);

    const embed = successEmbed('Advertencia Eliminada',
      `Se quitó la advertencia #${warnNum} de **${target.tag}**\n` +
      `**Razón original:** ${warn.reason}\n` +
      `**Moderador original:** ${warn.moderatorTag}\n` +
      `**Total warns actuales:** ${userProfile.warnCount}`
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
