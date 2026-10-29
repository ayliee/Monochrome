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

`GET /api/health` reports whether a Lavalink node is configured, so the client
knows when to fall back to the offline catalogue.

## Scripts

- `npm run build` — Vite production build into `client/www`
- `npm start` — serve API + UI on `PORT` (default 3000)

## Hosting the frontend separately

By default the frontend calls the API on its own origin. To publish the static
build on a CDN and point it at a backend running elsewhere:

```bash
VITE_API_BASE=https://your-backend.example npm run build
```

The API sends permissive CORS headers, so a cross-origin frontend works
without extra setup. If the backend is unreachable the client falls back to the
bundled offline catalogue instead of showing an empty page.

## Layout

```
server/index.js          API, Lavalink client, stream proxy
client/src/App.jsx       App shell, views, player state
client/src/components.jsx  Header, Hero, rails, cards, footer, timeline
client/src/styles.css    Design system
client/src/demo.js       Offline catalogue fallback
client/src/api.js        API client + fallback wiring
client/vite.config.js
.env.example             Lavalink placeholders
```

## Interface

The UI follows a near-black, warm-peach design language: a floating glass
header that condenses on scroll, a featured carousel, horizontal rails with
arrow navigation, a dense release grid, and a persistent bottom player with a
scrubbable timeline.

### Offline fallback

The client talks to the Node server for everything. If that backend is
unreachable — or if no Lavalink node is configured — it falls back to the
bundled offline catalogue in `client/src/demo.js` so the interface still
renders and can be explored. The server reports its Lavalink status via
`GET /api/health` (`lavalink.configured`). Live streaming requires a working
Lavalink node.

## License

See [LICENSE](LICENSE). Made by Ayle (@alyfinnn). All rights reserved by AeroX Development.

## Credits

This web has been made by Ayle (@alyfinnn) By [AeroX](https://discord.gg/aerox).
