/**
 * Sistema de Bienvenida
 */
const logger = require('../../utils/logger');
module.exports = {
  init(client) {
    logger.info('Sistema de Bienvenida listo (config via /welcome setup)');
  },
};
