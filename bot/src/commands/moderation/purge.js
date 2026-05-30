/**
 * Comando: /purge
 * Elimina mensajes en masa con filtros
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.ManageMessages],

  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('🗑️ Elimina mensajes en masa')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(opt =>
      opt.setName('cantidad').setDescription('Cantidad de mensajes (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)
    )
    .addUserOption(opt => opt.setName('usuario').setDescription('Solo eliminar mensajes de este usuario').setRequired(false))
    .addBooleanOption(opt => opt.setName('bots').setDescription('Solo eliminar mensajes de bots').setRequired(false)),

  async execute(interaction, client) {
    const amount = interaction.options.getInteger('cantidad');
    const filterUser = interaction.options.getUser('usuario');
    const botsOnly = interaction.options.getBoolean('bots') || false;
    const { channel } = interaction;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Obtener mensajes
    let messages = await channel.messages.fetch({ limit: 100 });

    // Filtrar mensajes mayores a 14 días (Discord no permite eliminarlos en masa)
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    messages = messages.filter(m => m.createdTimestamp > twoWeeksAgo);

    // Aplicar filtros
    if (filterUser) messages = messages.filter(m => m.author.id === filterUser.id);
    if (botsOnly) messages = messages.filter(m => m.author.bot);

    // Limitar a la cantidad solicitada
    messages = [...messages.values()].slice(0, amount);

    if (messages.length === 0) {
      return interaction.editReply({ embeds: [errorEmbed('Sin mensajes', 'No hay mensajes elegibles para eliminar.')] });
    }

    const deleted = await channel.bulkDelete(messages, true);

    await interaction.editReply({
      embeds: [successEmbed('Mensajes Eliminados', `Se eliminaron **${deleted.size}** mensajes${filterUser ? ` de ${filterUser.tag}` : ''}`)],
    });
  },
};
