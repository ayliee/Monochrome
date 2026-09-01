# Monochrome

Open-source, privacy-respecting web music player. Search, queue, library, and **live synced lyrics**.

Made by **Ayle** (@alyfinnn) · [AeroX](https://discord.gg/aerox)

## How it works

The browser never talks to Lavalink. All catalog and stream requests go through this Node server.

1. **Lavalink** (server-side) — search + metadata (`spsearch`, `ytmsearch`, albums, artists)
2. **yt-dlp** (server-side) — resolve a full-length audio URL
3. **`/api/stream`** — proxy that audio with HTTP range so seeking works
4. **LRCLIB** — synced lyrics via `/api/lyrics`

Put Lavalink host, port, and password in `.env` only. Do not commit `.env`.

## Setup

Needs **Node 20+** and **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** on `PATH`.

```bash
cp .env.example .env
# edit .env with your Lavalink node

npm install
npm run build
npm start
```

Open http://localhost:3000

| Variable | Meaning |
|---|---|
| `LAVALINK_HOST` | Lavalink hostname or IP |
| `LAVALINK_PORT` | REST port |
| `LAVALINK_AUTH` | `Authorization` password |
| `LAVALINK_SECURE` | `true` if HTTPS |

## Scripts

- `npm run build` — Vite production build into `client/www`
- `npm start` — serve API + UI on `PORT` (default 3000)

## Layout

```
server/index.js          API, Lavalink client, stream proxy
client/src/              React UI
client/vite.config.js
.env.example             Lavalink placeholders
```

## License

See [LICENSE](LICENSE). Made by Ayle (@alyfinnn). All rights reserved by AeroX Development.

## Credits

This web has been made by Ayle (@alyfinnn) By [AeroX](https://discord.gg/aerox).
