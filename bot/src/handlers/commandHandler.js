/**
 * Handler de Comandos Slash
 * Carga automáticamente todos los comandos de la carpeta commands/
 */

const { REST, Routes } = require('discord.js');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

/**
 * Carga todos los comandos slash desde las subcarpetas de /commands
 * @param {Client} client - Cliente de Discord.js
 */
async function loadCommands(client) {
  const commandsPath = path.join(__dirname, '../commands');
  const categories = fs.readdirSync(commandsPath);

  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));

    for (const file of commandFiles) {
      try {
        const command = require(path.join(categoryPath, file));

        // Validar estructura del comando
        if (!command.data || !command.execute) {
          logger.warn(`⚠️  El comando ${file} no tiene 'data' o 'execute'`);
          continue;
        }

        client.commands.set(command.data.name, command);
        logger.discord(`  Comando cargado: /${command.data.name} [${category}]`);
      } catch (err) {
        logger.error(`Error al cargar comando ${file}: ${err.message}`);
      }
    }
  }
}

/**
 * Despliega los comandos slash en Discord (dev: guild específico, prod: global)
 * Ejecutar con: node src/handlers/deployCommands.js
 */
async function deployCommands() {
  require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

  const commands = [];
  const commandsPath = path.join(__dirname, '../commands');
  const categories = fs.readdirSync(commandsPath);

  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
      try {
        const command = require(path.join(categoryPath, file));
        if (command.data) commands.push(command.data.toJSON());
      } catch (err) {
        logger.error(`Error al leer comando ${file}: ${err.message}`);
      }
    }
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    logger.info(`📤 Desplegando ${commands.length} comandos...`);

    // En desarrollo: solo en el guild configurado (instantáneo)
    if (process.env.NODE_ENV === 'development' && process.env.GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      logger.success(`Comandos desplegados en guild [desarrollo]`);
    } else {
      // En producción: global (puede tardar hasta 1 hora)
      await rest.put(
        Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
        { body: commands }
      );
      logger.success(`Comandos desplegados globalmente [producción]`);
    }
  } catch (err) {
    logger.error(`Error al desplegar comandos: ${err.message}`);
  }
}

module.exports = { loadCommands, deployCommands };

// Permite ejecutar directamente: node deployCommands.js
if (require.main === module) {
  deployCommands();
}
