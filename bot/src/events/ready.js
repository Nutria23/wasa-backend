/**
 * Evento: ready
 * Se ejecuta cuando el bot conecta con Discord
 */

const { ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const Guild = require('../models/Guild');
const cron = require('node-cron');

module.exports = {
  name: 'ready',
  once: true,

  async execute(client) {
    logger.success(`✅ Bot conectado como: ${client.user.tag}`);
    logger.info(`📊 Sirviendo ${client.guilds.cache.size} servidores`);
    logger.info(`👥 ${client.users.cache.size} usuarios en caché`);

    // ─── SINCRONIZAR GUILDS EN DB ──────────────────────────────────
    await syncGuilds(client);

    // ─── ACTIVIDADES ROTATIVAS ─────────────────────────────────────
    const activities = [
      { name: `${client.guilds.cache.size} servidores`, type: ActivityType.Watching },
      { name: '🛡️ Protegiendo servidores', type: ActivityType.Custom },
      { name: '/help para ayuda', type: ActivityType.Listening },
      { name: '🎫 Sistema de Tickets', type: ActivityType.Playing },
      { name: '📩 DMs abiertos', type: ActivityType.Listening },
    ];

    let activityIndex = 0;
    const setActivity = () => {
      const act = activities[activityIndex % activities.length];
      client.user.setPresence({
        activities: [{ name: act.name, type: act.type }],
        status: 'online',
      });
      activityIndex++;
    };

    setActivity();
    setInterval(setActivity, 30_000); // Rotar cada 30 segundos

    // ─── TAREAS PROGRAMADAS ────────────────────────────────────────
    // Auto-cerrar tickets inactivos cada hora
    cron.schedule('0 * * * *', () => {
      require('../systems/tickets/ticketSystem').autoCloseInactive(client);
    });

    // Backup automático diario a las 3:00 AM
    cron.schedule('0 3 * * *', () => {
      require('../systems/antiraid/antiRaid').autoBackupAll(client);
    });

    // Limpiar caché anti-spam cada 5 minutos
    cron.schedule('*/5 * * * *', () => {
      client.antiSpam.clear();
      client.antiRaid.clear();
    });

    logger.info('⏰ Tareas programadas iniciadas');
  },
};

/**
 * Sincroniza todos los servidores en la base de datos
 */
async function syncGuilds(client) {
  let synced = 0;
  for (const [guildId, guild] of client.guilds.cache) {
    await Guild.findOneAndUpdate(
      { guildId },
      {
        guildName: guild.name,
        guildIcon: guild.iconURL(),
        ownerId: guild.ownerId,
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    synced++;
  }
  logger.info(`🔄 ${synced} servidores sincronizados en DB`);
}
