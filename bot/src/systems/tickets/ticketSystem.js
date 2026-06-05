/**
 * Sistema de Tickets - Core
 * Gestión completa de creación, cierre y transcripts
 */

const path = require('path');
const fs = require('fs');
const {
  ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle,
  ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder,
  TextInputStyle, EmbedBuilder,
} = require('discord.js');

const Ticket = require('../../models/Ticket');
const Guild = require('../../models/Guild');
const { ticketEmbed, successEmbed, errorEmbed, infoEmbed } = require('../../utils/embed');
const logger = require('../../utils/logger');
const config = require('../../config/config');

module.exports = {
  init(client) {
    logger.security('Sistema de Tickets iniciado');
  },

  /**
   * Envía el panel de tickets a un canal
   */
  async sendPanel(channel, guild, guildConfig, categories = []) {
    const embed = new EmbedBuilder()
      .setColor(config.bot.embedColor)
      .setTitle('🎫 Centro de Soporte')
      .setDescription(
        '¿Necesitas ayuda? Abre un ticket seleccionando una categoría.\n\n' +
        '**📋 Categorías disponibles:**\n' +
        (categories.length > 0
          ? categories.map(c => `• ${c}`).join('\n')
          : '• 💬 Soporte General\n• 🔨 Reportar Usuario\n• 💡 Sugerencias\n• 📦 Otro')
      )
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setFooter({ text: `${guild.name} • Sistema de Tickets` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket:create')
        .setLabel('🎫 Abrir Ticket')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('ticket:mystats')
        .setLabel('📊 Mis Tickets')
        .setStyle(ButtonStyle.Secondary),
    );

    const msg = await channel.send({ embeds: [embed], components: [row] });
    return msg;
  },

  /**
   * Crea un nuevo ticket
   */
  async createTicket(interaction, guildConfig, category = 'General', subject = null) {
    const { guild, user, member } = interaction;

    // Verificar si el módulo está activo
    if (!guildConfig.modules.tickets || !guildConfig.tickets?.enabled) {
      return interaction.reply({
        embeds: [errorEmbed('Módulo Desactivado', 'El sistema de tickets no está activo en este servidor.')],
        ephemeral: true,
      });
    }

    // Verificar blacklist
    if (guildConfig.tickets && await isBlacklisted(user.id, guild.id)) {
      return interaction.reply({
        embeds: [errorEmbed('Acceso Denegado', 'Estás en la lista negra y no puedes abrir tickets.')],
        ephemeral: true,
      });
    }

    // Verificar límite de tickets abiertos
    const openCount = await Ticket.countDocuments({
      guildId: guild.id,
      authorId: user.id,
      status: { $in: ['open', 'claimed'] },
    });

    const maxOpen = guildConfig.tickets?.maxOpenPerUser || config.tickets.maxOpenPerUser;
    if (openCount >= maxOpen) {
      return interaction.reply({
        embeds: [errorEmbed('Límite Alcanzado', `Ya tienes **${openCount}** ticket(s) abierto(s). Máximo: **${maxOpen}**`)],
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    // Generar ID del ticket
    const counter = (guildConfig.tickets?.counter || 0) + 1;
    const ticketId = counter.toString().padStart(4, '0');

    // Encontrar/crear categoría de Discord
    let categoryChannel = guild.channels.cache.get(guildConfig.tickets?.categoryId);
    if (!categoryChannel) {
      categoryChannel = await guild.channels.create({
        name: config.tickets.categoryName,
        type: ChannelType.GuildCategory,
      });
      await Guild.findOneAndUpdate(
        { guildId: guild.id },
        { 'tickets.categoryId': categoryChannel.id }
      );
    }

    // Construir permisos del canal
    const permissionOverwrites = [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
    ];

    // Agregar roles de soporte
    const supportRoles = guildConfig.tickets?.supportRoles || [];
    for (const roleId of supportRoles) {
      permissionOverwrites.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
        ],
      });
    }

    // Crear canal del ticket
    const ticketChannel = await guild.channels.create({
      name: `ticket-${ticketId}`,
      type: ChannelType.GuildText,
      parent: categoryChannel.id,
      topic: `Ticket de ${user.tag} | Categoría: ${category} | ID: ${ticketId}`,
      permissionOverwrites,
    });

    // Guardar en DB
    const ticket = await Ticket.create({
      ticketId,
      guildId: guild.id,
      channelId: ticketChannel.id,
      authorId: user.id,
      authorTag: user.tag,
      category,
      subject: subject || `Ticket de ${user.username}`,
      status: 'open',
      participants: [user.id],
    });

    // Actualizar contador en guild
    await Guild.findOneAndUpdate(
      { guildId: guild.id },
      {
        $inc: { 'tickets.counter': 1, 'stats.totalTickets': 1 },
      }
    );

    // Embed principal del ticket
    const embed = ticketEmbed({
      ticketId,
      user: `<@${user.id}>`,
      category,
      priority: '🟢 Baja',
      guildName: guild.name,
    });

    // Botones del ticket
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket:claim:${ticket._id}`)
        .setLabel('📌 Tomar Ticket')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`ticket:close:${ticket._id}`)
        .setLabel('🔒 Cerrar')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`ticket:priority:${ticket._id}`)
        .setLabel('⚡ Prioridad')
        .setStyle(ButtonStyle.Secondary),
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket:adduser:${ticket._id}`)
        .setLabel('➕ Agregar Usuario')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`ticket:transcript:${ticket._id}`)
        .setLabel('📄 Transcript')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`ticket:delete:${ticket._id}`)
        .setLabel('🗑️ Eliminar')
        .setStyle(ButtonStyle.Danger),
    );

    // Mención de roles de soporte
    const supportMentions = supportRoles.map(r => `<@&${r}>`).join(' ');

    await ticketChannel.send({
      content: `${supportMentions ? supportMentions + ' | ' : ''}🎫 Nuevo ticket de <@${user.id}>`,
      embeds: [embed],
      components: [row1, row2],
    });

    // Enviar log de apertura
    await sendTicketLog(guild, guildConfig, 'open', { ticket, user });

    await interaction.editReply({
      embeds: [successEmbed('Ticket Creado', `Tu ticket fue creado: <#${ticketChannel.id}>\n**Ticket ID:** \`#${ticketId}\``)],
    });

    return ticket;
  },

  /**
   * Cierra un ticket
   */
  async closeTicket(interaction, ticketId, reason = 'Sin razón') {
    const { guild, user } = interaction;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket || ticket.status === 'closed') {
      return interaction.reply({
        embeds: [errorEmbed('Error', 'Este ticket no existe o ya está cerrado.')],
        ephemeral: true,
      });
    }

    const guildConfig = await Guild.findOne({ guildId: guild.id });
    const channel = guild.channels.cache.get(ticket.channelId);

    // Generar transcript si está activo
    let transcriptFile = null;
    if (guildConfig?.tickets?.transcripts) {
      transcriptFile = await generateTranscript(ticket, guild);
    }

    // Actualizar DB
    await Ticket.findByIdAndUpdate(ticketId, {
      status: 'closed',
      closedBy: user.id,
      closedAt: new Date(),
      closeReason: reason,
      transcriptFile,
    });

    // Enviar transcript al staff que cerró
    if (transcriptFile) {
      const transcriptsDir = path.join(__dirname, '../../../transcripts');
      const filePath = path.join(transcriptsDir, transcriptFile);
      if (fs.existsSync(filePath)) {
        const { AttachmentBuilder } = require('discord.js');
        const attachment = new AttachmentBuilder(filePath);
        await interaction.user.send({
          content: `📄 **Transcript del ticket #${ticket.ticketId}** (${guild.name})\nRazón: ${reason}`,
          files: [attachment],
        }).catch(() => {});
      }
    }

    // Enviar log
    await sendTicketLog(guild, guildConfig, 'close', {
      ticket,
      closedBy: user,
      reason,
      transcriptFile,
    });

    // Embed de cierre en el canal
    const embed = new EmbedBuilder()
      .setColor(config.bot.errorColor)
      .setTitle('🔒 Ticket Cerrado')
      .addFields(
        { name: '👤 Cerrado por', value: `<@${user.id}>`, inline: true },
        { name: '📋 Razón', value: reason, inline: true },
      )
      .setTimestamp();

    if (channel) {
      await channel.send({ embeds: [embed] });

      // Eliminar canal después de 5 segundos
      setTimeout(async () => {
        await channel.delete().catch(() => {});
        await Ticket.findByIdAndUpdate(ticketId, { status: 'deleted' });
      }, 5000);
    }

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ embeds: [successEmbed('Ticket Cerrado', 'El ticket será eliminado en 5 segundos.')], ephemeral: true });
    }
  },

  /**
   * Auto-cierra tickets inactivos
   */
  async autoCloseInactive(client) {
    const cutoffTime = new Date(Date.now() - (config.tickets.autoCloseAfterHours * 60 * 60 * 1000));

    const inactiveTickets = await Ticket.find({
      status: { $in: ['open', 'claimed'] },
      lastActivity: { $lt: cutoffTime },
    });

    for (const ticket of inactiveTickets) {
      try {
        const guild = client.guilds.cache.get(ticket.guildId);
        if (!guild) continue;

        const channel = guild.channels.cache.get(ticket.channelId);
        if (channel) {
          const embed = warningEmbed('⏰ Ticket Cerrado', 'Este ticket fue cerrado automáticamente por inactividad.');
          await channel.send({ embeds: [embed] });
          setTimeout(() => channel.delete().catch(() => {}), 5000);
        }

        await Ticket.findByIdAndUpdate(ticket._id, {
          status: 'closed',
          closedBy: 'auto',
          closedAt: new Date(),
          closeReason: 'Inactividad automática',
        });

        logger.info(`Auto-closed ticket #${ticket.ticketId} en guild ${ticket.guildId}`);
      } catch (err) {
        logger.error(`Error auto-closing ticket: ${err.message}`);
      }
    }
  },
};

/**
 * Genera un transcript HTML del ticket
 */
async function generateTranscript(ticket, guild) {
  const path = require('path');
  const fs = require('fs');

  const transcriptsDir = path.join(__dirname, '../../../transcripts');
  if (!fs.existsSync(transcriptsDir)) fs.mkdirSync(transcriptsDir, { recursive: true });

  const filename = `ticket-${ticket.ticketId}-${guild.id}.html`;
  const filepath = path.join(transcriptsDir, filename);

  const messages = ticket.messages.map(m => `
    <div class="message">
      <span class="author">${escapeHtml(m.authorTag)}</span>
      <span class="time">${new Date(m.timestamp).toLocaleString()}</span>
      <p class="content">${escapeHtml(m.content)}</p>
      ${m.attachments.map(a => `<a href="${a}" target="_blank">📎 Adjunto</a>`).join('')}
    </div>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Transcript Ticket #${ticket.ticketId}</title>
  <style>
    body { background: #1a1a2e; color: #eee; font-family: 'Segoe UI', sans-serif; padding: 20px; }
    h1 { color: #5865F2; }
    .info { background: #16213e; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .message { background: #0f3460; padding: 10px 15px; margin: 5px 0; border-radius: 6px; border-left: 3px solid #5865F2; }
    .author { font-weight: bold; color: #5865F2; margin-right: 10px; }
    .time { font-size: 0.8em; color: #aaa; }
    .content { margin-top: 5px; }
    a { color: #57F287; }
  </style>
</head>
<body>
  <h1>🎫 Transcript Ticket #${ticket.ticketId}</h1>
  <div class="info">
    <p><strong>Usuario:</strong> ${ticket.authorTag}</p>
    <p><strong>Categoría:</strong> ${ticket.category}</p>
    <p><strong>Abierto:</strong> ${new Date(ticket.createdAt).toLocaleString()}</p>
    <p><strong>Cerrado:</strong> ${new Date(ticket.closedAt).toLocaleString()}</p>
    <p><strong>Razón de cierre:</strong> ${ticket.closeReason || 'N/A'}</p>
    <p><strong>Total mensajes:</strong> ${ticket.messages.length}</p>
  </div>
  <div class="messages">
    ${messages || '<p>Sin mensajes registrados.</p>'}
  </div>
</body>
</html>`;

  fs.writeFileSync(filepath, html);
  return filename;
}

function escapeHtml(str = '') {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function isBlacklisted(userId, guildId) {
  const User = require('../../models/User');
  const user = await User.findOne({ userId, guildId });
  return user?.blacklisted || false;
}

async function sendTicketLog(guild, guildConfig, type, data) {
  const logChannelId = guildConfig?.tickets?.logChannelId || guildConfig?.logs?.tickets;
  if (!logChannelId) return;

  const channel = guild.channels.cache.get(logChannelId);
  if (!channel) return;

  const { ticket, user, closedBy, reason, transcriptFile } = data;
  const color = type === 'open' ? config.bot.successColor : config.bot.errorColor;
  const title = type === 'open' ? '🎫 Ticket Abierto' : '🔒 Ticket Cerrado';

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .addFields(
      { name: '🎫 ID', value: `#${ticket.ticketId}`, inline: true },
      { name: '👤 Usuario', value: `<@${ticket.authorId}>`, inline: true },
      { name: '📂 Categoría', value: ticket.category, inline: true },
    )
    .setTimestamp();

  if (type === 'close') {
    embed.addFields(
      { name: '🔒 Cerrado por', value: `<@${closedBy?.id || 'auto'}>`, inline: true },
      { name: '📋 Razón', value: reason || 'N/A', inline: true },
    );
    if (transcriptFile) {
      embed.addFields({ name: '📄 Transcript', value: `\`${transcriptFile}\``, inline: false });
    }
  }

  await channel.send({ embeds: [embed] }).catch(() => {});
}

// Importar warningEmbed para auto-close
const { warningEmbed } = require('../../utils/embed');
