/**
 * Comando: /ban
 * Banea a un miembro del servidor
 */

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const User = require('../../models/User');
const { successEmbed, errorEmbed, modEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],

  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('🔨 Banea a un miembro del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(opt =>
      opt.setName('usuario').setDescription('Usuario a banear').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('razon').setDescription('Razón del ban').setRequired(false).setMaxLength(512)
    )
    .addIntegerOption(opt =>
      opt.setName('dias').setDescription('Días de mensajes a eliminar (0-7)').setMinValue(0).setMaxValue(7).setRequired(false)
    ),

  async execute(interaction, client) {
    const target = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('razon') || 'Sin razón especificada';
    const days = interaction.options.getInteger('dias') || 1;
    const { guild, member: moderator } = interaction;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // No banearse a uno mismo
    if (target.id === interaction.user.id) {
      return interaction.editReply({ embeds: [errorEmbed('Error', 'No puedes banearte a ti mismo.')] });
    }

    // No banear al bot
    if (target.id === client.user.id) {
      return interaction.editReply({ embeds: [errorEmbed('Error', 'No puedes banearme a mí.')] });
    }

    // Verificar jerarquía de roles
    const targetMember = guild.members.cache.get(target.id);
    if (targetMember) {
      if (targetMember.roles.highest.position >= moderator.roles.highest.position) {
        return interaction.editReply({
          embeds: [errorEmbed('Sin Permisos', 'No puedes banear a alguien con un rol igual o superior al tuyo.')],
        });
      }
    }

    // Enviar DM antes de banear
    const dmEmbed = modEmbed({
      action: 'BAN',
      target: { tag: target.tag, id: target.id, displayAvatarURL: () => target.displayAvatarURL() },
      moderator: { tag: interaction.user.tag },
      reason,
      guildName: guild.name,
    });
    await target.send({ embeds: [dmEmbed] }).catch(() => {}); // Ignorar si DM bloqueado

    // Ejecutar ban
    try {
      await guild.members.ban(target.id, {
        reason: `[${interaction.user.tag}] ${reason}`,
        deleteMessageSeconds: days * 86400,
      });
    } catch (err) {
      return interaction.editReply({ embeds: [errorEmbed('Error', `No pude banear a ${target.tag}: ${err.message}`)] });
    }

    // Registrar en DB
    await User.getOrCreate(target.id, guild.id, { tag: target.tag, username: target.username });
    await User.findOneAndUpdate(
      { userId: target.id, guildId: guild.id },
      { $push: { infractions: { type: 'ban', reason, moderatorId: interaction.user.id, moderatorTag: interaction.user.tag } } }
    );

    // Log en canal de moderación
    await sendModLog(guild, interaction.user, target, 'BAN', reason, client);

    logger.security(`BAN: ${target.tag} baneado de ${guild.name} por ${interaction.user.tag} | Razón: ${reason}`);

    await interaction.editReply({
      embeds: [successEmbed('Usuario Baneado', `**${target.tag}** fue baneado exitosamente.\n**Razón:** ${reason}`)],
    });
  },
};

async function sendModLog(guild, moderator, target, action, reason, client) {
  const Guild = require('../../models/Guild');
  const guildConfig = await Guild.findOne({ guildId: guild.id });
  const logChannelId = guildConfig?.logs?.moderation;
  if (!logChannelId) return;

  const channel = guild.channels.cache.get(logChannelId);
  if (!channel) return;

  const embed = modEmbed({
    action,
    target: { tag: target.tag, id: target.id, displayAvatarURL: () => target.displayAvatarURL() },
    moderator: { tag: moderator.tag },
    reason,
    guildName: guild.name,
  });

  await channel.send({ embeds: [embed] }).catch(() => {});
}
