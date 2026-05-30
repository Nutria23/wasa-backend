/**
 * Comando: /ticket setup
 * Configura el sistema de tickets del servidor
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');
const Guild = require('../../models/Guild');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const ticketSystem = require('../../systems/tickets/ticketSystem');

module.exports = {
  cooldown: 10,
  userPermissions: [PermissionFlagsBits.Administrator],

  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('🎫 Gestión del sistema de tickets')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Configura el sistema de tickets')
        .addChannelOption(opt =>
          opt.setName('panel').setDescription('Canal donde enviar el panel de tickets')
            .addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName('logs').setDescription('Canal de logs de tickets')
            .addChannelTypes(ChannelType.GuildText).setRequired(false)
        )
        .addRoleOption(opt =>
          opt.setName('soporte').setDescription('Rol del equipo de soporte').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('panel').setDescription('Envía el panel de tickets al canal configurado')
    )
    .addSubcommand(sub =>
      sub.setName('stats').setDescription('Ver estadísticas de tickets del servidor')
    )
    .addSubcommand(sub =>
      sub.setName('blacklist')
        .setDescription('Añade/quita usuario de la lista negra de tickets')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true))
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const { guild } = interaction;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    switch (sub) {
      case 'setup': {
        const panelChannel = interaction.options.getChannel('panel');
        const logChannel = interaction.options.getChannel('logs');
        const supportRole = interaction.options.getRole('soporte');

        await Guild.findOneAndUpdate(
          { guildId: guild.id },
          {
            'tickets.enabled': true,
            'tickets.panelChannelId': panelChannel.id,
            ...(logChannel ? { 'tickets.logChannelId': logChannel.id, 'logs.tickets': logChannel.id } : {}),
            ...(supportRole ? { $addToSet: { 'tickets.supportRoles': supportRole.id } } : {}),
          },
          { upsert: true }
        );

        await interaction.editReply({
          embeds: [successEmbed('Tickets Configurados',
            `✅ Sistema de tickets configurado correctamente.\n` +
            `📋 Panel: <#${panelChannel.id}>\n` +
            (logChannel ? `📝 Logs: <#${logChannel.id}>\n` : '') +
            (supportRole ? `👥 Rol soporte: <@&${supportRole.id}>` : '')
          )],
        });
        break;
      }

      case 'panel': {
        const guildConfig = await Guild.findOne({ guildId: guild.id });
        if (!guildConfig?.tickets?.panelChannelId) {
          return interaction.editReply({ embeds: [errorEmbed('Sin Configurar', 'Usa `/ticket setup` primero.')] });
        }

        const channel = guild.channels.cache.get(guildConfig.tickets.panelChannelId);
        if (!channel) {
          return interaction.editReply({ embeds: [errorEmbed('Canal no encontrado', 'El canal del panel no existe.')] });
        }

        await ticketSystem.sendPanel(channel, guild, guildConfig);
        await interaction.editReply({ embeds: [successEmbed('Panel Enviado', `Panel enviado a <#${channel.id}>`)] });
        break;
      }

      case 'stats': {
        const Ticket = require('../../models/Ticket');
        const total = await Ticket.countDocuments({ guildId: guild.id });
        const open = await Ticket.countDocuments({ guildId: guild.id, status: { $in: ['open', 'claimed'] } });
        const closed = await Ticket.countDocuments({ guildId: guild.id, status: 'closed' });

        await interaction.editReply({
          embeds: [successEmbed('📊 Estadísticas de Tickets',
            `**Servidor:** ${guild.name}\n\n` +
            `🎫 Total: **${total}**\n` +
            `🟢 Abiertos: **${open}**\n` +
            `🔒 Cerrados: **${closed}**`
          )],
        });
        break;
      }

      case 'blacklist': {
        const target = interaction.options.getUser('usuario');
        const User = require('../../models/User');
        const userProfile = await User.getOrCreate(target.id, guild.id, { tag: target.tag });
        const newState = !userProfile.blacklisted;

        await User.findOneAndUpdate(
          { userId: target.id, guildId: guild.id },
          {
            blacklisted: newState,
            blacklistReason: newState ? 'Añadido por moderador' : null,
            blacklistedBy: newState ? interaction.user.id : null,
            blacklistedAt: newState ? new Date() : null,
          }
        );

        await interaction.editReply({
          embeds: [successEmbed(
            newState ? 'Añadido a Blacklist' : 'Eliminado de Blacklist',
            `**${target.tag}** fue ${newState ? 'añadido a' : 'eliminado de'} la lista negra de tickets.`
          )],
        });
        break;
      }
    }
  },
};
