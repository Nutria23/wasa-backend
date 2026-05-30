/**
 * Comando: /config
 * Panel de configuración del servidor
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embed');
const config = require('../../config/config');

module.exports = {
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.Administrator],

  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('⚙️ Configuración del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('ver').setDescription('Ver la configuración actual'))
    .addSubcommand(sub =>
      sub.setName('modulo')
        .setDescription('Activar/desactivar un módulo')
        .addStringOption(opt =>
          opt.setName('modulo').setDescription('Módulo a cambiar').setRequired(true)
            .addChoices(
              { name: '🛡️ Anti-Spam', value: 'antiSpam' },
              { name: '🚨 Anti-Raid', value: 'antiRaid' },
              { name: '💣 Anti-Nuke', value: 'antiNuke' },
              { name: '🎫 Tickets', value: 'tickets' },
              { name: '👋 Bienvenidas', value: 'welcome' },
              { name: '🤖 AutoMod', value: 'automod' },
              { name: '📋 Logs', value: 'logging' },
            )
        )
        .addBooleanOption(opt => opt.setName('estado').setDescription('Activar o desactivar').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('logs')
        .setDescription('Configurar canales de logs')
        .addChannelOption(opt => opt.setName('moderacion').setDescription('Canal de logs de moderación').setRequired(false))
        .addChannelOption(opt => opt.setName('seguridad').setDescription('Canal de logs de seguridad').setRequired(false))
        .addChannelOption(opt => opt.setName('miembros').setDescription('Canal de logs de miembros').setRequired(false))
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const { guild } = interaction;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    switch (sub) {
      case 'ver': {
        const guildConfig = await Guild.findOne({ guildId: guild.id });
        if (!guildConfig) return interaction.editReply({ embeds: [errorEmbed('Sin Configurar', 'Este servidor no tiene configuración guardada.')] });

        const m = guildConfig.modules;
        const embed = new EmbedBuilder()
          .setColor(config.bot.embedColor)
          .setTitle(`⚙️ Configuración de ${guild.name}`)
          .addFields(
            {
              name: '🔧 Módulos',
              value: Object.entries(m).map(([k, v]) => `${v ? '✅' : '❌'} ${k}`).join('\n'),
              inline: true,
            },
            {
              name: '📋 Canales de Logs',
              value: Object.entries(guildConfig.logs || {}).map(([k, v]) => v ? `• ${k}: <#${v}>` : `• ${k}: No configurado`).join('\n') || 'Sin configurar',
              inline: true,
            },
            {
              name: '📊 Estadísticas',
              value: `🎫 Tickets: ${guildConfig.stats?.totalTickets || 0}\n🔨 Bans: ${guildConfig.stats?.totalBans || 0}\n🚨 Raids bloqueados: ${guildConfig.stats?.raidBlocked || 0}`,
              inline: false,
            },
          )
          .setThumbnail(guild.iconURL({ dynamic: true }))
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'modulo': {
        const modulo = interaction.options.getString('modulo');
        const estado = interaction.options.getBoolean('estado');

        await Guild.findOneAndUpdate(
          { guildId: guild.id },
          { [`modules.${modulo}`]: estado },
          { upsert: true }
        );

        await interaction.editReply({
          embeds: [successEmbed('Módulo Actualizado', `El módulo **${modulo}** fue ${estado ? 'activado ✅' : 'desactivado ❌'}`)],
        });
        break;
      }

      case 'logs': {
        const modLog = interaction.options.getChannel('moderacion');
        const secLog = interaction.options.getChannel('seguridad');
        const memLog = interaction.options.getChannel('miembros');

        const update = {};
        if (modLog) update['logs.moderation'] = modLog.id;
        if (secLog) update['logs.security'] = secLog.id;
        if (memLog) update['logs.joins'] = memLog.id;

        await Guild.findOneAndUpdate({ guildId: guild.id }, update, { upsert: true });

        await interaction.editReply({
          embeds: [successEmbed('Logs Configurados',
            `${modLog ? `📋 Moderación: <#${modLog.id}>\n` : ''}` +
            `${secLog ? `🛡️ Seguridad: <#${secLog.id}>\n` : ''}` +
            `${memLog ? `👥 Miembros: <#${memLog.id}>` : ''}`
          )],
        });
        break;
      }
    }
  },
};
