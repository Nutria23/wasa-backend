/**
 * Comando: /backup
 * Crea un backup manual del servidor
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const antiRaid = require('../../systems/antiraid/antiRaid');

module.exports = {
  cooldown: 60, // 1 minuto de cooldown para backups
  userPermissions: [PermissionFlagsBits.Administrator],

  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('💾 Gestión de backups del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => 
      sub.setName('crear')
        .setDescription('Crea un backup manual del estado actual del servidor')
    )
    .addSubcommand(sub => 
      sub.setName('lista')
        .setDescription('Muestra la lista de backups disponibles')
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const { guild } = interaction;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (sub === 'crear') {
      try {
        await antiRaid.createBackup(guild, interaction.user.id, `Manual por ${interaction.user.tag}`);
        await interaction.editReply({ 
          embeds: [successEmbed('Backup Creado', 'Se ha guardado un snapshot completo del servidor en la base de datos.')] 
        });
      } catch (err) {
        await interaction.editReply({ 
          embeds: [errorEmbed('Error', `No se pudo crear el backup: ${err.message}`)] 
        });
      }
    } else {
      const Backup = require('../../models/Backup');
      const backups = await Backup.find({ guildId: guild.id }).sort({ createdAt: -1 });

      if (backups.length === 0) {
        return interaction.editReply({ 
          embeds: [errorEmbed('Sin Backups', 'No hay ningún backup guardado para este servidor.')] 
        });
      }

      const desc = backups.map((b, i) => 
        `**${i + 1}.** \`${b.label}\` - <t:${Math.floor(b.createdAt.getTime() / 1000)}:R>`
      ).join('\n');

      await interaction.editReply({ 
        embeds: [successEmbed('Backups Disponibles', desc)] 
      });
    }
  },
};
