/**
 * Comando: /lockdown
 * Activa/desactiva el modo lockdown del servidor
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const Guild = require('../../models/Guild');
const { successEmbed, errorEmbed, warningEmbed } = require('../../utils/embed');
const antiRaid = require('../../systems/antiraid/antiRaid');

module.exports = {
  cooldown: 10,
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageChannels],

  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('🔒 Activa o desactiva el modo lockdown del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('on').setDescription('🔒 Activar lockdown').addStringOption(opt => opt.setName('razon').setDescription('Razón').setRequired(false)))
    .addSubcommand(sub => sub.setName('off').setDescription('🔓 Desactivar lockdown')),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const { guild } = interaction;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildConfig = await Guild.findOne({ guildId: guild.id });

    if (sub === 'on') {
      const reason = interaction.options.getString('razon') || 'Activado manualmente por moderador';
      await antiRaid.activateLockdown(guild, client, guildConfig || {}, reason);
      await interaction.editReply({
        embeds: [warningEmbed('🔒 Lockdown Activado', `El servidor está en modo lockdown.\n**Razón:** ${reason}`)],
      });
    } else {
      await antiRaid.deactivateLockdown(guild, guildConfig || {});
      await interaction.editReply({
        embeds: [successEmbed('🔓 Lockdown Desactivado', 'Los canales han sido desbloqueados.')],
      });
    }
  },
};
