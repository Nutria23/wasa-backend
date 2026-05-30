/**
 * Rutas: Autenticación Discord OAuth2
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const DISCORD_API = 'https://discord.com/api/v10';

/**
 * GET /auth/login
 * Redirige al OAuth2 de Discord
 */
router.get('/login', (req, res) => {
  if (!process.env.DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID.includes('PON_AQUI')) {
    // DEV BYPASS: Generate fake JWT
    const token = jwt.sign({
      id: '123456789',
      username: 'Test Admin',
      avatar: null,
      guilds: [{ id: '999999999', name: 'Servidor de Prueba Local', icon: null, permissions: 0x20 }]
    }, process.env.JWT_SECRET || 'test', { expiresIn: '7d' });
    const dashUrl = process.env.DASHBOARD_URL || 'http://localhost:5500';
    return res.redirect(`${dashUrl}/?token=${token}`);
  }

  const params = new URLSearchParams({
    client_id:     process.env.DISCORD_CLIENT_ID,
    redirect_uri:  process.env.DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope:         'identify guilds',
  });

  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

/**
 * GET /auth/callback
 * Callback de Discord OAuth2 → devuelve JWT
 */
router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Código de autorización no proporcionado' });
  }

  try {
    // 1. Intercambiar código por access_token
    const tokenResponse = await axios.post(`${DISCORD_API}/oauth2/token`, new URLSearchParams({
      client_id:     process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type:    'authorization_code',
      code,
      redirect_uri:  process.env.DISCORD_REDIRECT_URI,
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token, refresh_token } = tokenResponse.data;

    // 2. Obtener información del usuario
    const [userResponse, guildsResponse] = await Promise.all([
      axios.get(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bearer ${access_token}` },
      }),
      axios.get(`${DISCORD_API}/users/@me/guilds`, {
        headers: { Authorization: `Bearer ${access_token}` },
      }),
    ]);

    const user = userResponse.data;
    const guilds = guildsResponse.data;

    // 3. Filtrar solo los guilds donde el usuario es admin/manager/owner
    const managedGuilds = guilds.filter(g => {
      try {
        const perms = BigInt(g.permissions);
        const isAdmin = (perms & BigInt(0x8)) === BigInt(0x8);
        const isManager = (perms & BigInt(0x20)) === BigInt(0x20);
        return isAdmin || isManager || g.owner;
      } catch {
        return false;
      }
    });

    // 4. Generar JWT
    const token = jwt.sign(
      {
        id:       user.id,
        username: user.username,
        avatar:   user.avatar,
        guilds:   managedGuilds.map(g => ({
          id:          g.id,
          name:        g.name,
          icon:        g.icon,
          permissions: g.permissions,
        })),
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info(`Login exitoso: ${user.username} (${user.id})`);

    // 5. Redirigir al dashboard con el token
    const dashUrl = process.env.DASHBOARD_URL || 'http://localhost:5500';
    res.redirect(`${dashUrl}/?token=${token}`);

  } catch (err) {
    const detail = err.response?.data || err.message;
    logger.error(`Error en OAuth2 callback: ${JSON.stringify(detail)}`);
    res.status(500).json({ error: 'Error en la autenticación', detail });
  }
});

/**
 * GET /auth/me
 * Devuelve el usuario autenticado
 */
router.get('/me', require('../middleware/auth').authMiddleware, (req, res) => {
  res.json({ 
    user: req.user,
    clientId: process.env.DISCORD_CLIENT_ID && !process.env.DISCORD_CLIENT_ID.includes('PON_AQUI') 
      ? process.env.DISCORD_CLIENT_ID 
      : null
  });
});

module.exports = router;
