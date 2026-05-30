/**
 * Middleware de Autenticación JWT
 */

const jwt = require('jsonwebtoken');

/**
 * Verifica el token JWT del dashboard
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado: Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

/**
 * Verifica que el usuario tenga acceso al guild solicitado
 */
async function guildMiddleware(req, res, next) {
  const { guildId } = req.params;
  const userId = req.user.id;

  // Verificar que el usuario gestiona ese guild (vía Discord API)
  const userGuilds = req.user.guilds || [];
  const hasAccess = userGuilds.some(g => {
    if (g.id !== guildId) return false;
    try {
      const perms = BigInt(g.permissions);
      const isAdmin = (perms & BigInt(0x8)) === BigInt(0x8);
      const isManager = (perms & BigInt(0x20)) === BigInt(0x20);
      return isAdmin || isManager || g.owner;
    } catch {
      return false;
    }
  });

  if (!hasAccess) {
    return res.status(403).json({ error: 'No tienes permisos para gestionar este servidor' });
  }

  next();
}

module.exports = { authMiddleware, guildMiddleware };
