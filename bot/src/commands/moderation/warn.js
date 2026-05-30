/**
 * Comando: /warn
 * Sistema de advertencias con sanciones automáticas
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const User = require('../../models/User');
const { successEmbed, errorEmbed, warningEmbed } = require('../../utils/embed');
const config = require('../../config/config');

module.exports = {
  cooldown: 3,
  userPermissions: [PermissionFlagsBits.ModerateMembers],

  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('⚠️ Advierte a un usuario')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true))
    .addStringOption(opt => opt.setName('razon').setDescription('Razón').setRequired(true).setMaxLength(300)),

  async execute(interaction, client) {
    const target = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('razon');
    const { guild } = interaction;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (target.bot) return interaction.editReply({ embeds: [errorEmbed('Error', 'No puedes advertir a un bot.')] });

    // Obtener o crear perfil
    const userProfile = await User.getOrCreate(target.id, guild.id, { tag: target.tag, username: target.username });
    await userProfile.addWarn(reason, interaction.user.id, interaction.user.tag);

    const warnCount = userProfile.warnCount + 1;

    // DM al usuario
    await target.send({
      embeds: [warningEmbed(
        `Advertencia #${warnCount} en ${guild.name}`,
        `Has recibido una advertencia.\n**Razón:** ${reason}\n**Total warns:** ${warnCount}`
      )],
    }).catch(() => {});

    // Acción automática si supera el límite
    const maxWarns = config.moderation.maxWarnBeforeAction || 3;
    let autoAction = null;

    if (warnCount >= maxWarns) {
      const targetMember = guild.members.cache.get(target.id);
      if (targetMember) {
        switch (config.moderation.warnAction) {
          case 'mute':
            await targetMember.timeout(10 * 60 * 1000, `Auto-sanción: ${warnCount} warns`);
            autoAction = '🔇 Silenciado automáticamente (10 min)';
            break;
          case 'kick':
            await targetMember.kick(`Auto-sanción: ${warnCount} warns`);
            autoAction = '👢 Expulsado automáticamente';
            break;
          case 'ban':
            await guild.members.ban(target.id, { reason: `Auto-sanción: ${warnCount} warns` });
            autoAction = '🔨 Baneado automáticamente';
            break;
        }
      }
    }

    const desc = `**${target.tag}** recibió una advertencia.\n**Razón:** ${reason}\n**Total warns:** ${warnCount}/${maxWarns}` +
      (autoAction ? `\n\n${autoAction}` : '');

    await interaction.editReply({ embeds: [successEmbed('Advertencia Registrada', desc)] });
  },
};
