const BotAction = require('../../models/BotAction');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');
const { EmbedBuilder } = require('discord.js');
const ticketSystem = require('../tickets/ticketSystem');

module.exports = (client) => {
  logger.info('📡 Iniciando Dashboard Action Poller...');

  setInterval(async () => {
    try {
      const pendingActions = await BotAction.find({ status: 'PENDING' }).sort({ createdAt: 1 }).limit(5);
      
      for (const action of pendingActions) {
        try {
          let result = {};
          
          if (action.action === 'PING') {
            result = { ok: true };
          } 
          else if (action.action === 'SET_PRESENCE') {
            const { status, activity } = action.payload;
            const activities = activity ? [{ name: activity, type: 4 }] : [];
            client.user.setPresence({
              status: status || 'online',
              activities
            });
            result = { success: true };
          }
          else if (['KICK', 'BAN', 'TIMEOUT'].includes(action.action)) {
            const guild = client.guilds.cache.get(action.guildId);
            if (!guild) throw new Error('Guild not found');
            const member = await guild.members.fetch(action.payload.userId).catch(() => null);
            if (!member) throw new Error('Member not found');

            const reason = action.payload.reason || 'Acción desde el dashboard';

            if (action.action === 'KICK') {
              await member.kick(reason);
            } else if (action.action === 'BAN') {
              await member.ban({ reason });
            } else if (action.action === 'TIMEOUT') {
              const ms = action.payload.duration || 60000;
              await member.timeout(ms, reason);
            }
            result = { success: true };
          }
          else if (action.action === 'SEND_EMBED') {
            const guild = client.guilds.cache.get(action.guildId);
            if (!guild) throw new Error('Guild not found');
            const channel = guild.channels.cache.get(action.payload.channelId);
            if (!channel || !channel.isTextBased()) throw new Error('Channel not found or not text based');

            const embedData = action.payload.embed;
            const embed = new EmbedBuilder();
            if (embedData.title) embed.setTitle(embedData.title);
            if (embedData.description) embed.setDescription(embedData.description);
            if (embedData.color) embed.setColor(embedData.color);
            if (embedData.imageUrl) embed.setImage(embedData.imageUrl);
            
            const payload = { embeds: [embed] };

            if (embedData.imageBase64) {
              const buffer = Buffer.from(embedData.imageBase64.split(',')[1], 'base64');
              const { AttachmentBuilder } = require('discord.js');
              const attachment = new AttachmentBuilder(buffer, { name: 'image.png' });
              embed.setImage('attachment://image.png');
              payload.files = [attachment];
            }
            
            const msg = await channel.send(payload);
            result = { messageId: msg.id };
          }
          else if (action.action === 'SEND_TICKET_PANEL') {
            const guild = client.guilds.cache.get(action.guildId);
            if (!guild) throw new Error('Guild not found');
            const guildConfig = await Guild.findOne({ guildId: action.guildId });
            if (!guildConfig || !guildConfig.tickets || !guildConfig.tickets.panelChannelId) {
              throw new Error('Panel channel not configured in dashboard');
            }
            const channel = guild.channels.cache.get(guildConfig.tickets.panelChannelId);
            if (!channel || !channel.isTextBased()) throw new Error('Panel channel not found or not text based');
            
            const msg = await ticketSystem.sendPanel(channel, guild, guildConfig);
            if (msg) {
              guildConfig.tickets.panelMessageId = msg.id;
              await guildConfig.save();
              result = { messageId: msg.id };
            }
          }
          else {
            throw new Error('Acción desconocida');
          }

          action.status = 'COMPLETED';
          action.result = result;
          await action.save();
        } catch (err) {
          action.status = 'ERROR';
          action.result = { error: err.message };
          await action.save();
          logger.error(`Error en acción del dashboard ${action._id}: ${err.message}`);
        }
      }
    } catch (e) {
      // Ignorar errores de red temporales
    }
  }, 2000); // Poll cada 2 segundos
};
