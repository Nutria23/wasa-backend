/**
 * Comando: /help
 * Muestra la lista de comandos disponibles
 */
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../../config/config');

module.exports = {
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('📜 Muestra la lista de comandos disponibles'),

  async execute(interaction, client) {
    const categories = {
      moderation: '⚖️ Moderación',
      admin: '⚙️ Administración',
      tickets: '🎫 Tickets',
      utility: 'ℹ️ Utilidad'
    };

    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor)
      .setTitle(`📜 Ayuda de ${client.user.username}`)
      .setDescription('Aquí tienes una lista de mis comandos slash disponibles:')
      .setThumbnail(client.user.displayAvatarURL())
      .setTimestamp();

    const commands = client.commands;
    const categorized = {};

    commands.forEach(cmd => {
      // Find the folder name by checking the path of the command file if possible,
      // but since we don't have it easily accessible in the collection without extra work,
      // we'll use a simple approach based on name or metadata if added.
      // For now, let's just group them.
      const name = cmd.data.name;
      let category = 'utility'; // default
      
      if (['ban', 'kick', 'timeout', 'warn', 'purge'].includes(name)) category = 'moderation';
      if (['config', 'lockdown', 'backup'].includes(name)) category = 'admin';
      if (['ticket'].includes(name)) category = 'tickets';

      if (!categorized[category]) categorized[category] = [];
      categorized[category].push(`\`/${name}\``);
    });

    for (const [key, value] of Object.entries(categories)) {
      if (categorized[key]) {
        embed.addFields({ name: value, value: categorized[key].join(', '), inline: false });
      }
    }

    embed.addFields({ 
      name: '🌐 Dashboard', 
      value: `Gestiona el bot desde la web: [Haz clic aquí](${process.env.DASHBOARD_URL || 'http://localhost:5500'})`, 
      inline: false 
    });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
