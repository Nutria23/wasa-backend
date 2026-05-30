/**
 * Evento: interactionCreate
 * Maneja comandos slash, botones, selectmenus y modales
 */

const { InteractionType, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');
const { errorEmbed } = require('../utils/embed');
const config = require('../config/config');

module.exports = {
  name: 'interactionCreate',
  once: false,

  async execute(interaction, client) {
    // ─── COMANDOS SLASH ─────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction, client);
    }

    // ─── BOTONES ────────────────────────────────────────────────────
    else if (interaction.isButton()) {
      await handleButton(interaction, client);
    }

    // ─── SELECT MENUS ───────────────────────────────────────────────
    else if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(interaction, client);
    }

    // ─── MODALES ────────────────────────────────────────────────────
    else if (interaction.isModalSubmit()) {
      await handleModal(interaction, client);
    }

    // ─── CONTEXT MENUS ──────────────────────────────────────────────
    else if (interaction.isContextMenuCommand()) {
      await handleSlashCommand(interaction, client);
    }
  },
};

// ─── HANDLER: SLASH COMMANDS ─────────────────────────────────────────────────
async function handleSlashCommand(interaction, client) {
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  // Verificar cooldown
  const onCooldown = checkCooldown(interaction, client, command);
  if (onCooldown) {
    return interaction.reply({
      embeds: [errorEmbed('Cooldown', `Espera **${onCooldown}** segundos antes de volver a usar este comando.`)],
      flags: MessageFlags.Ephemeral,
    });
  }

  // Verificar permisos del usuario
  if (command.userPermissions) {
    const missing = interaction.member.permissions.missing(command.userPermissions);
    if (missing.length > 0) {
      return interaction.reply({
        embeds: [errorEmbed('Sin Permisos', `Necesitas los siguientes permisos:\n\`${missing.join(', ')}\``)],
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  // Verificar permisos del bot
  if (command.botPermissions) {
    const missing = interaction.guild.members.me.permissions.missing(command.botPermissions);
    if (missing.length > 0) {
      return interaction.reply({
        embeds: [errorEmbed('Permisos del Bot', `Necesito los permisos:\n\`${missing.join(', ')}\``)],
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  // Ejecutar comando
  try {
    await command.execute(interaction, client);
  } catch (err) {
    logger.error(`Error en comando /${interaction.commandName}: ${err.message}\n${err.stack}`);
    const errEmbed = errorEmbed('Error Inesperado', 'Ocurrió un error al ejecutar este comando. El equipo fue notificado.');

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [errEmbed] }).catch(() => {});
    } else {
      await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
}

// ─── HANDLER: BOTONES ────────────────────────────────────────────────────────
async function handleButton(interaction, client) {
  const [system, action, ...args] = interaction.customId.split(':');

  try {
    switch (system) {
      case 'ticket':
        await require('../systems/tickets/ticketButtons').handle(interaction, client, action, args);
        break;
      case 'confirm':
        // Sistema de confirmaciones genérico
        break;
      default:
        logger.debug(`Botón sin handler: ${interaction.customId}`);
    }
  } catch (err) {
    logger.error(`Error en botón ${interaction.customId}: ${err.message}`);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [errorEmbed('Error', 'Ocurrió un error al procesar esta acción.')],
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  }
}

// ─── HANDLER: SELECT MENUS ───────────────────────────────────────────────────
async function handleSelectMenu(interaction, client) {
  const [system, action, ...args] = interaction.customId.split(':');

  try {
    switch (system) {
      case 'ticket':
        await require('../systems/tickets/ticketButtons').handleSelect(interaction, client, action, args);
        break;
    }
  } catch (err) {
    logger.error(`Error en selectMenu ${interaction.customId}: ${err.message}`);
  }
}

// ─── HANDLER: MODALES ────────────────────────────────────────────────────────
async function handleModal(interaction, client) {
  const [system, action, ...args] = interaction.customId.split(':');

  try {
    switch (system) {
      case 'ticket':
        await require('../systems/tickets/ticketButtons').handleModal(interaction, client, action, args);
        break;
    }
  } catch (err) {
    logger.error(`Error en modal ${interaction.customId}: ${err.message}`);
  }
}

// ─── COOLDOWN ────────────────────────────────────────────────────────────────
function checkCooldown(interaction, client, command) {
  if (!client.cooldowns.has(command.data.name)) {
    client.cooldowns.set(command.data.name, new Map());
  }

  const now = Date.now();
  const timestamps = client.cooldowns.get(command.data.name);
  const cooldownAmount = (command.cooldown || config.cooldowns.default) * 1000;
  const userId = interaction.user.id;

  if (timestamps.has(userId)) {
    const expirationTime = timestamps.get(userId) + cooldownAmount;
    if (now < expirationTime) {
      const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
      return timeLeft;
    }
  }

  timestamps.set(userId, now);
  setTimeout(() => timestamps.delete(userId), cooldownAmount);
  return null;
}
