/**
 * Generador de tarjeta de bienvenida estilo Nekotina
 * Usa @napi-rs/canvas para dibujar la imagen en memoria
 */

const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const axios = require('axios');

/**
 * Descarga una imagen desde una URL y la retorna como Buffer
 */
async function fetchBuffer(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(res.data);
}

/**
 * Genera una tarjeta de bienvenida estilo Nekotina
 * @param {Object} opts
 * @param {string} opts.avatarUrl - URL del avatar del usuario
 * @param {string} opts.username  - Nombre del usuario
 * @param {string} opts.bannerUrl - URL del banner del servidor (opcional)
 * @param {number} opts.memberCount - Número de miembros actual
 * @returns {Buffer} PNG buffer listo para enviar como adjunto
 */
async function generateWelcomeCard({ avatarUrl, username, bannerUrl, memberCount }) {
  const W = 700, H = 250;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ── FONDO ────────────────────────────────────────────────────────────────
  if (bannerUrl) {
    try {
      const bgBuf = await fetchBuffer(bannerUrl);
      const bg = await loadImage(bgBuf);
      ctx.drawImage(bg, 0, 0, W, H);
    } catch {
      // fallback: gradiente
      drawGradientBg(ctx, W, H);
    }
  } else {
    drawGradientBg(ctx, W, H);
  }

  // Capa oscura semitransparente para legibilidad
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.roundRect(0, 0, W, H, 16);
  ctx.fill();

  // ── AVATAR CIRCULAR ──────────────────────────────────────────────────────
  const avatarSize = 110;
  const avatarX = W / 2;
  const avatarY = 75;

  // Anillo exterior (blanco)
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarSize / 2 + 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();
  ctx.restore();

  // Avatar
  try {
    const avBuf = await fetchBuffer(avatarUrl + '?size=256');
    const avatar = await loadImage(avBuf);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
    ctx.restore();
  } catch {
    // Si falla el avatar, dibujamos un círculo de color
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#5865F2';
    ctx.fill();
    ctx.restore();
  }

  // ── TEXTO ────────────────────────────────────────────────────────────────
  const textY = avatarY + avatarSize / 2 + 28;

  // Nombre del usuario
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 8;
  // Truncar si es muy largo
  const displayName = username.length > 24 ? username.slice(0, 22) + '…' : username;
  ctx.fillText(`¡${displayName} ingresó al servidor!`, W / 2, textY);

  // Subtítulo con conteo de miembros
  ctx.font = '18px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.80)';
  ctx.shadowBlur = 4;
  ctx.fillText(`Ahora somos ${memberCount} miembros`, W / 2, textY + 34);

  ctx.shadowBlur = 0;

  return canvas.toBuffer('image/png');
}

function drawGradientBg(ctx, W, H) {
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0,   '#1a1a3e');
  grad.addColorStop(0.5, '#2d1b69');
  grad.addColorStop(1,   '#11003b');
  ctx.fillStyle = grad;
  ctx.roundRect(0, 0, W, H, 16);
  ctx.fill();
}

module.exports = { generateWelcomeCard };
