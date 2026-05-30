/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    WASA BOT - CORE ENTRY                    ║
 * ║           Bot de Discord Premium con Arquitectura            ║
 * ║                    Modular y Escalable                       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const mongoose = require('mongoose');
const logger = require('./src/utils/logger');
const { loadCommands } = require('./src/handlers/commandHandler');
const { loadEvents } = require('./src/handlers/eventHandler');
const { loadSystems } = require('./src/handlers/systemHandler');

// ─── CREAR CLIENTE DE DISCORD ────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User,
  ],
  allowedMentions: {
    parse: ['users', 'roles'],
    repliedUser: false,
  },
});

// ─── COLECCIONES DEL CLIENTE ─────────────────────────────────────────────────
client.commands     = new Collection(); // Comandos slash registrados
client.cooldowns    = new Collection(); // Sistema de cooldowns
client.antiRaid     = new Collection(); // Cache anti-raid por guild
client.antiSpam     = new Collection(); // Cache anti-spam por usuario
client.antiNuke     = new Collection(); // Cache anti-nuke por acción
client.tickets      = new Collection(); // Tickets activos en cache
client.blacklist    = new Collection(); // Usuarios en lista negra
client.config       = require('./src/config/config');

// ─── CONECTAR A MONGODB ───────────────────────────────────────────────────────
async function connectDatabase() {
  try {
    if (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('PON_AQUI')) {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      logger.success('✅ Conectado a MongoDB exitosamente');
    } else {
      logger.warn('⚠️ Base de datos no conectada: URI de MongoDB no configurada.');
    }
  } catch (error) {
    logger.error(`❌ Error al conectar MongoDB: ${error.message}`);
    // process.exit(1);
  }
}

// ─── INICIALIZACIÓN PRINCIPAL ─────────────────────────────────────────────────
async function initialize() {
  logger.info('🚀 Iniciando Wasa Bot...');

  // 1. Conectar base de datos
  await connectDatabase();

  // 2. Cargar comandos slash
  await loadCommands(client);
  logger.info(`📋 ${client.commands.size} comandos cargados`);

  // 3. Cargar eventos
  await loadEvents(client);
  logger.info('🎯 Eventos cargados');

  // 4. Cargar sistemas (anti-raid, tickets, etc.)
  await loadSystems(client);
  logger.info('🛡️  Sistemas de protección cargados');

  // 5. Login en Discord
  if (process.env.DISCORD_TOKEN && !process.env.DISCORD_TOKEN.includes('PON_AQUI')) {
    await client.login(process.env.DISCORD_TOKEN);
  } else {
    logger.warn('⚠️ Bot de Discord no conectado: Token no configurado.');
  }
}

// ─── MANEJO DE ERRORES GLOBALES ───────────────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Promesa rechazada sin manejar: ${reason}`);
});

process.on('uncaughtException', (error) => {
  logger.error(`Excepción no capturada: ${error.message}`);
  // No cerramos el proceso para mantener el bot activo
});

// Manejo limpio al cerrar
process.on('SIGINT', async () => {
  logger.warn('⚠️  Apagando bot...');
  client.destroy();
  await mongoose.disconnect();
  process.exit(0);
});

// ─── ARRANCAR ─────────────────────────────────────────────────────────────────
initialize().catch((err) => {
  logger.error(`Error fatal al inicializar: ${err.message}`);
  process.exit(1);
});

module.exports = client;
