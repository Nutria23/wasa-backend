# 🛡️ Wasa Bot — Discord Bot Premium

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)
![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**Bot de Discord avanzado con sistema de tickets, anti-raid, anti-nuke, moderación completa y dashboard web.**

</div>

---

## ✨ Características

| Módulo | Descripción |
|--------|-------------|
| 🎫 **Tickets** | Sistema completo con categorías, prioridades, transcripts HTML, auto-cierre |
| 🚨 **Anti-Raid** | Detección de joins masivos, lockdown automático, alertas en tiempo real |
| 💣 **Anti-Nuke** | Protección contra eliminación de canales/roles, mass bans/kicks |
| 🛡️ **Anti-Spam** | Flood, duplicados, menciones masivas, sanciones progresivas |
| ⚖️ **Moderación** | ban, kick, timeout, warn, purge con logs y DM automático |
| 🤖 **AutoMod** | Filtro de palabras, Zalgo, invitaciones no autorizadas |
| 👋 **Bienvenidas** | Mensajes personalizados, DM de bienvenida, auto-roles |
| 💾 **Backups** | Snapshots automáticos diarios del servidor |
| 🌐 **Dashboard** | Panel web con OAuth2, tiempo real vía WebSocket |
| 📊 **Estadísticas** | Analytics de tickets, moderación y seguridad |

---

## 📁 Estructura del Proyecto

```
discord-bot-wasa/
├── bot/                          # Core del bot
│   ├── index.js                  # Punto de entrada
│   └── src/
│       ├── commands/             # Comandos slash por categoría
│       │   ├── admin/            # config, lockdown, backup
│       │   ├── moderation/       # ban, kick, timeout, warn, purge
│       │   ├── tickets/          # ticket (setup, panel, stats)
│       │   └── utility/          # userinfo, serverinfo, help
│       ├── events/               # Eventos de Discord
│       ├── handlers/             # Cargadores automáticos
│       ├── systems/              # Lógica de sistemas
│       │   ├── antiraid/
│       │   ├── antinuke/
│       │   ├── antispam/
│       │   ├── tickets/
│       │   ├── automod/
│       │   └── welcome/
│       ├── models/               # Modelos MongoDB
│       ├── utils/                # Logger, Embeds
│       └── config/               # Configuración centralizada
│
├── api/                          # Backend REST + WebSocket
│   ├── index.js
│   └── src/
│       ├── routes/               # auth, guilds, tickets, security, stats
│       ├── middleware/           # JWT, rate limit, error handler
│       └── socket/               # Socket.IO handler
│
├── dashboard/                    # Frontend (GitHub Pages)
│   └── public/
│       ├── index.html            # Dashboard SPA
│       ├── css/dashboard.css     # Estilos premium
│       └── js/
│           ├── config.js         # URL de la API
│           ├── api.js            # Cliente REST
│           └── dashboard.js      # Lógica del panel
│
├── .env.example                  # Variables de entorno
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Instalación

### Prerrequisitos
- Node.js >= 18
- MongoDB Atlas (gratis en [mongodb.com](https://mongodb.com))
- Bot de Discord creado en [Discord Developer Portal](https://discord.com/developers)

### 1. Clonar y configurar

```bash
git clone https://github.com/tuusuario/wasa-bot.git
cd wasa-bot
cp .env.example .env
```

### 2. Configurar variables de entorno

Edita `.env` con tus datos:

```env
DISCORD_TOKEN=tu_token_del_bot
DISCORD_CLIENT_ID=tu_client_id
DISCORD_CLIENT_SECRET=tu_client_secret
MONGODB_URI=mongodb+srv://...
JWT_SECRET=cadena_aleatoria_segura_de_64_chars
GUILD_ID=tu_servidor_de_prueba (solo para desarrollo)
```

### 3. Instalar dependencias

```bash
# Instalar deps del bot
cd bot && npm install && cd ..

# Instalar deps de la API
cd api && npm install && cd ..
```

### 4. Desplegar comandos slash

```bash
cd bot
npm run deploy
```

> 💡 En desarrollo (`NODE_ENV=development`), los comandos se despliegan solo en tu `GUILD_ID` (instantáneo).

### 5. Iniciar el bot y la API

```bash
# Desde la raíz del proyecto:
npm run dev        # Ambos en modo desarrollo
# O por separado:
npm run dev:bot
npm run dev:api
```

---

## 🌐 Configurar el Dashboard

### Desarrollo local
1. Abre `dashboard/public/index.html` en un servidor local (ej: VS Code Live Server en el puerto 5500)
2. El dashboard se conectará a `http://localhost:3000` automáticamente

### Producción — GitHub Pages
1. Sube la carpeta `dashboard/public/` a tu repositorio
2. Activa GitHub Pages en **Settings > Pages**
3. Edita `dashboard/public/js/config.js`:

```javascript
const CONFIG = {
  API_URL: 'https://tu-api.railway.app',
  WS_URL:  'wss://tu-api.railway.app',
};
```

4. Configura el OAuth2 Redirect URI en el Developer Portal:
   - `https://tu-api.railway.app/auth/callback`

---

## ☁️ Deploy en Producción

### Railway (Bot + API)

1. Crea cuenta en [railway.app](https://railway.app)
2. Conecta tu repositorio de GitHub
3. Agrega las variables de entorno en el panel de Railway
4. Railway detecta automáticamente Node.js y hace el deploy

### Render (alternativa gratuita)

1. Crea cuenta en [render.com](https://render.com)
2. **New Web Service** → conecta tu repo
3. Build command: `cd api && npm install`
4. Start command: `node api/index.js`
5. Agrega variables de entorno

---

## 🔒 Configuración del Bot en Discord

### Permisos necesarios del bot
- `Administrator` (recomendado para todas las funciones)
- O individualmente: `Manage Channels`, `Manage Roles`, `Kick Members`, `Ban Members`, `Moderate Members`, `Manage Messages`, `View Audit Log`

### Scopes del OAuth2 (Developer Portal)
- `bot`
- `applications.commands`

### Intents requeridos (Developer Portal → Bot → Privileged Gateway Intents)
- ✅ `Presence Intent`
- ✅ `Server Members Intent`  
- ✅ `Message Content Intent`

---

## ⚙️ Comandos Disponibles

### Moderación
| Comando | Descripción |
|---------|-------------|
| `/ban` | Banea a un usuario |
| `/kick` | Expulsa a un usuario |
| `/timeout` | Silencia temporalmente |
| `/warn` | Emite una advertencia |
| `/purge` | Elimina mensajes en masa |

### Tickets
| Comando | Descripción |
|---------|-------------|
| `/ticket setup` | Configura el sistema de tickets |
| `/ticket panel` | Envía el panel de tickets |
| `/ticket stats` | Estadísticas de tickets |
| `/ticket blacklist` | Gestiona la lista negra |

### Administración
| Comando | Descripción |
|---------|-------------|
| `/config ver` | Ver configuración del servidor |
| `/config modulo` | Activar/desactivar módulos |
| `/config logs` | Configurar canales de logs |
| `/lockdown on/off` | Control manual del lockdown |
| `/userinfo` | Info de un usuario |

---

## 🛡️ Sistemas de Seguridad

### Anti-Raid
- Detecta X joins en Y segundos
- Activa lockdown automático (bloquea `@everyone` en todos los canales)
- Se desactiva automáticamente tras el tiempo configurado
- Envía alerta al canal de seguridad con mención al dueño

### Anti-Nuke
- Monitorea: eliminación de canales, roles, mass bans/kicks, webhooks
- Usa Discord Audit Log para identificar al atacante
- Sanciona al atacante: quitar permisos, timeout, kick o ban
- Whitelist de usuarios/bots de confianza

### Anti-Spam
- Detección de flood (X mensajes en Y segundos)
- Detección de mensajes duplicados
- Flood de menciones y emojis
- Sanciones progresivas: warn → mute → kick → ban

---

## 🗄️ Estructura de Base de Datos

| Colección | Descripción |
|-----------|-------------|
| `guilds` | Configuración por servidor |
| `tickets` | Tickets y su historial de mensajes |
| `users` | Perfil de usuario por servidor (warns, infracciones) |
| `securitylogs` | Log de todos los eventos de seguridad |
| `backups` | Snapshots del servidor para restauración |

---

## 📝 Variables de Entorno

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `DISCORD_TOKEN` | Token del bot | ✅ |
| `DISCORD_CLIENT_ID` | Client ID de la aplicación | ✅ |
| `DISCORD_CLIENT_SECRET` | Client Secret (OAuth2) | ✅ |
| `MONGODB_URI` | URI de conexión MongoDB Atlas | ✅ |
| `JWT_SECRET` | Clave secreta para JWT | ✅ |
| `API_PORT` | Puerto de la API (default: 3000) | ❌ |
| `GUILD_ID` | Guild de desarrollo | ❌ |
| `DASHBOARD_URL` | URL del dashboard | ❌ |
| `NODE_ENV` | `development` o `production` | ❌ |

---

## 🤝 Contribuir

1. Fork el repositorio
2. Crea tu branch: `git checkout -b feature/nueva-funcion`
3. Commit: `git commit -m 'feat: nueva función'`
4. Push: `git push origin feature/nueva-funcion`
5. Abre un Pull Request

---

## 📄 Licencia

MIT © Wasa Bot Team

---

<div align="center">
Hecho con ❤️ para la comunidad de Discord
</div>
