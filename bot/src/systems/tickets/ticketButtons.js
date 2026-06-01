/**
 * Manejador de Botones, Selectores y Modales del Sistema de Tickets
 */

const {
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, MessageFlags
} = require('discord.js');
const Ticket = require('../../models/Ticket');
const Guild = require('../../models/Guild');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embed');
const ticketSystem = require('./ticketSystem');
const config = require('../../config/config');

module.exports = {
  /**
   * Maneja clics en botones de tickets
   */
  async handle(interaction, client, action, args) {
    const ticketObjectId = args[0];

    switch (action) {
      // ─── ABRIR TICKET ──────────────────────────────────────────────
      case 'create': {
        // Mostrar modal para elegir categoría y asunto
        const modal = new ModalBuilder()
          .setCustomId('ticket:submit')
          .setTitle('🎫 Abrir Ticket de Soporte');

        const categoryInput = new TextInputBuilder()
          .setCustomId('category')
          .setLabel('Categoría')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Soporte General, Reporte, Sugerencia, Otro...')
          .setRequired(false)
          .setMaxLength(50);

        const subjectInput = new TextInputBuilder()
          .setCustomId('subject')
          .setLabel('Asunto (describe brevemente tu problema)')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Explica aquí tu problema o consulta...')
          .setRequired(true)
          .setMinLength(10)
          .setMaxLength(500);

        modal.addComponents(
          new ActionRowBuilder().addComponents(categoryInput),
          new ActionRowBuilder().addComponents(subjectInput),
        );

        await interaction.showModal(modal);
        break;
      }

      // ─── TOMAR TICKET ──────────────────────────────────────────────
      case 'claim': {
        const ticket = await Ticket.findById(ticketObjectId);
        if (!ticket) return interaction.reply({ embeds: [errorEmbed('Error', 'Ticket no encontrado.')], flags: MessageFlags.Ephemeral });

        if (ticket.claimedBy) {
          return interaction.reply({
            embeds: [errorEmbed('Ya Tomado', `Este ticket ya fue tomado por <@${ticket.claimedBy}>`)],
            flags: MessageFlags.Ephemeral,
          });
        }

        // Verificar permiso de soporte
        const guildConfig = await Guild.findOne({ guildId: interaction.guild.id });
        const isSupport = isSupportMember(interaction.member, guildConfig);
        if (!isSupport) {
          return interaction.reply({
            embeds: [errorEmbed('Sin Permisos', 'Solo el personal de soporte puede tomar tickets.')],
            flags: MessageFlags.Ephemeral,
          });
        }

        await Ticket.findByIdAndUpdate(ticketObjectId, {
          claimedBy: interaction.user.id,
          claimedAt: new Date(),
          status: 'claimed',
        });

        const embed = new EmbedBuilder()
          .setColor(config.bot.successColor)
          .setDescription(`📌 **${interaction.user.tag}** ha tomado este ticket.`)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        break;
      }

      // ─── CERRAR TICKET ─────────────────────────────────────────────
      case 'close': {
        // Modal para razón de cierre
        const modal = new ModalBuilder()
          .setCustomId(`ticket:closesubmit:${ticketObjectId}`)
          .setTitle('🔒 Cerrar Ticket');

        const reasonInput = new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Razón de cierre')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Problema resuelto, sin respuesta, etc...')
          .setRequired(false)
          .setMaxLength(200);

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        await interaction.showModal(modal);
        break;
      }

      // ─── CAMBIAR PRIORIDAD ────────────────────────────────────────
      case 'priority': {
        const select = new StringSelectMenuBuilder()
          .setCustomId(`ticket:setpriority:${ticketObjectId}`)
          .setPlaceholder('Selecciona la prioridad')
          .addOptions([
            { label: '🟢 Baja', value: 'low', description: 'Sin urgencia' },
            { label: '🟡 Media', value: 'medium', description: 'Atención normal' },
            { label: '🔴 Alta', value: 'high', description: 'Requiere atención pronto' },
            { label: '⚫ Crítica', value: 'critical', description: '¡Urgente!' },
          ]);

        const row = new ActionRowBuilder().addComponents(select);
        await interaction.reply({ components: [row], flags: MessageFlags.Ephemeral });
        break;
      }

      // ─── ELIMINAR TICKET ──────────────────────────────────────────
      case 'delete': {
        const guildConfig = await Guild.findOne({ guildId: interaction.guild.id });
        if (!isSupportMember(interaction.member, guildConfig) && !interaction.member.permissions.has('Administrator')) {
          return interaction.reply({
            embeds: [errorEmbed('Sin Permisos', 'Solo administradores pueden eliminar tickets directamente.')],
            flags: MessageFlags.Ephemeral,
          });
        }

        await interaction.reply({ embeds: [successEmbed('Eliminando', 'El canal será eliminado en 3 segundos.')], flags: MessageFlags.Ephemeral });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
        break;
      }

      // ─── MIS ESTADÍSTICAS ─────────────────────────────────────────
      case 'mystats': {
        const myTickets = await Ticket.find({ guildId: interaction.guild.id, authorId: interaction.user.id });
        const open = myTickets.filter(t => ['open', 'claimed'].includes(t.status)).length;
        const closed = myTickets.filter(t => t.status === 'closed').length;

        const embed = infoEmbed('📊 Mis Tickets', `Estadísticas de tickets en **${interaction.guild.name}**`)
          .addFields(
            { name: '🟢 Abiertos', value: `${open}`, inline: true },
            { name: '🔒 Cerrados', value: `${closed}`, inline: true },
            { name: '📊 Total', value: `${myTickets.length}`, inline: true },
          );

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        break;
      }
    }
  },

  /**
   * Maneja cambios en select menus de tickets
   */
  async handleSelect(interaction, client, action, args) {
    if (action === 'setpriority') {
      const ticketObjectId = args[0];
      const priority = interaction.values[0];
      const priorityMap = {
        low: '🟢 Baja',
        medium: '🟡 Media',
        high: '🔴 Alta',
        critical: '⚫ Crítica',
      };

      await Ticket.findByIdAndUpdate(ticketObjectId, { priority: priorityMap[priority] });

      const embed = new EmbedBuilder()
        .setColor(config.bot.infoColor)
        .setDescription(`⚡ Prioridad cambiada a **${priorityMap[priority]}** por <@${interaction.user.id}>`)
        .setTimestamp();

      await interaction.update({ content: '✅ Prioridad actualizada.', components: [] });
      await interaction.channel.send({ embeds: [embed] });
    }
  },

  /**
   * Maneja envío de modales de tickets
   */
  async handleModal(interaction, client, action, args) {
    if (action === 'submit') {
      // Crear ticket desde modal
      const category = interaction.fields.getTextInputValue('category') || 'General';
      const subject = interaction.fields.getTextInputValue('subject');

      const guildConfig = await Guild.findOne({ guildId: interaction.guild.id });
      await ticketSystem.createTicket(interaction, guildConfig, category, subject);
    }

    if (action === 'closesubmit') {
      const ticketObjectId = args[0];
      const reason = interaction.fields.getTextInputValue('reason') || 'Sin razón';
      await ticketSystem.closeTicket(interaction, ticketObjectId, reason);
    }
  },
};

/**
 * Verifica si un miembro es personal de soporte
 */
function isSupportMember(member, guildConfig) {
  if (member.permissions.has('Administrator')) return true;
  if (member.permissions.has('ManageChannels')) return true;
  const supportRoles = guildConfig?.tickets?.supportRoles || [];
  return supportRoles.some(roleId => member.roles.cache.has(roleId));
}
