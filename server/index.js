import http from "http";
import https from "https";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Readable } from "stream";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const WWW = path.join(ROOT, "client", "www");

function loadEnvFile() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const text = line.trim();
    if (!text || text.startsWith("#")) continue;
    const i = text.indexOf("=");
    if (i < 1) continue;
    const key = text.slice(0, i).trim();
    let val = text.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = val;
  }
}
loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const LL_HOST = process.env.LAVALINK_HOST || "";
const LL_PORT = Number(process.env.LAVALINK_PORT || 2333);
const LL_AUTH = process.env.LAVALINK_AUTH || "";
const LL_SECURE = String(process.env.LAVALINK_SECURE || "false") === "true";
const LL_BASE = `${LL_SECURE ? "https" : "http"}://${LL_HOST}:${LL_PORT}`;
const LRCLIB = "https://lrclib.net";
const CLIENT_UA = "MonochromePlayer/1.0 (local-player)";

const trackCache = new Map();
const ytResolveCache = new Map();
const audioUrlCache = new Map();
const browseCache = { data: null, at: 0 };
const lyricsCache = new Map();

const COVER_HOSTS = [
  "i.scdn.co",
  "scdn.co",
  "mosaic.scdn.co",
  "i.ytimg.com",
  "yt3.googleusercontent.com",
  "lh3.googleusercontent.com",
  "images.genius.com",
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function send(res, status, body, headers = {}) {
  const data = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Content-Type": typeof body === "object" && !Buffer.isBuffer(body) ? "application/json" : "text/plain",
    ...headers,
  });
  res.end(data);
}

function json(res, status, obj) {
  send(res, status, obj, { "Content-Type": "application/json; charset=utf-8" });
}

function parseUrl(req) {
  return new URL(req.url, `http://${req.headers.host || "localhost"}`);
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function llHeaders() {
  return { Authorization: LL_AUTH, "User-Agent": CLIENT_UA };
}

async function llGet(pathname, params) {
  const url = new URL(pathname, LL_BASE);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: llHeaders(), signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error("catalog_error");
  return res.json();
}

function rememberTrack(track) {
  if (!track?.id) return;
  trackCache.set(`${track.source}:${track.id}`, track);
  trackCache.set(track.id, track);
  if (trackCache.size > 4000) trackCache.delete(trackCache.keys().next().value);
}

function normalizeTrack(t) {
  if (!t?.info) return null;
  const info = t.info;
  const plugin = t.pluginInfo || {};
  const id = info.identifier;
  const source = info.sourceName || "unknown";
  let artwork = info.artworkUrl;
  if (!artwork && source === "youtube" && id) artwork = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const track = {
    id,
    encoded: t.encoded,
    title: info.title,
    author: info.author,
    duration: info.length,
    artwork,
    uri: info.uri,
    source,
    isrc: info.isrc || null,
    album: plugin.albumName || "",
    albumUrl: plugin.albumUrl || "",
    artistUrl: plugin.artistUrl || "",
    artistArtwork: plugin.artistArtworkUrl || null,
  };
  rememberTrack(track);
  return track;
}

function normalizeCollection(item) {
  if (!item) return null;
  const plugin = item.pluginInfo || {};
  const info = item.info || {};
  return {
    name: info.name || plugin.author || "Unknown",
    url: plugin.url || null,
    type: plugin.type || "playlist",
    artwork: plugin.artworkUrl || null,
    totalTracks: plugin.totalTracks ?? (item.tracks?.length || 0),
    author: plugin.author || "",
  };
}

async function loadTracks(identifier) {
  const data = await llGet("/v4/loadtracks", { identifier });
  const type = data.loadType;
  if (type === "search") return (data.data || []).map(normalizeTrack).filter(Boolean);
  if (type === "track") {
    const t = normalizeTrack(data.data);
    return t ? [t] : [];
  }
  if (type === "playlist") return (data.data?.tracks || []).map(normalizeTrack).filter(Boolean);
  return [];
}

async function loadCollection(identifier) {
  const data = await llGet("/v4/loadtracks", { identifier });
  if (data.loadType !== "playlist") {
    return { info: null, tracks: data.loadType === "track" ? [normalizeTrack(data.data)].filter(Boolean) : [] };
  }
  return {
    info: { name: data.data?.info?.name || "", ...normalizeCollection(data.data) },
    tracks: (data.data?.tracks || []).map(normalizeTrack).filter(Boolean),
  };
}

async function lavaSearch(query) {
  const data = await llGet("/v4/loadsearch", {
    query: `spsearch:${query}`,
    types: "track,album,artist,playlist",
  });
  return {
    tracks: (data.tracks || []).map(normalizeTrack).filter(Boolean),
    albums: (data.albums || []).map(normalizeCollection).filter((a) => a?.url),
    artists: (data.artists || []).map(normalizeCollection).filter((a) => a?.url),
    playlists: (data.playlists || []).map(normalizeCollection).filter((a) => a?.url),
  };
}

async function resolveYoutubeId(track) {
  if (!track) throw new Error("no_track");
  if (track.source === "youtube") return track.id;
  const key = `${track.source}:${track.id}`;
  if (ytResolveCache.has(key)) return ytResolveCache.get(key);
  const queries = [];
  if (track.isrc) queries.push(`ytmsearch:${track.isrc}`);
  queries.push(`ytmsearch:${track.title} ${track.author}`);
  queries.push(`ytsearch:${track.title} ${track.author} audio`);
  let best = null;
  let bestScore = Infinity;
  for (const q of queries) {
    try {
      const results = await loadTracks(q);
      for (const r of results.slice(0, 8)) {
        const score = Math.abs((r.duration || 0) - (track.duration || 0));
        const titleHit =
          r.title.toLowerCase().includes(String(track.title).toLowerCase().slice(0, 18)) ||
          String(track.title).toLowerCase().includes(r.title.toLowerCase().slice(0, 18));
        const total = score + (titleHit ? 0 : 25000);
        if (total < bestScore) {
          bestScore = total;
          best = r;
        }
        if (score < 4000 && titleHit) {
          best = r;
          bestScore = score;
          break;
        }
      }
      if (best && bestScore < 8000) break;
    } catch {
      /* next */
    }
  }
  if (!best) throw new Error("resolve_failed");
  ytResolveCache.set(key, best.id);
  return best.id;
}

function runYtDlp(args, timeoutMs = 28000) {
  return new Promise((resolve, reject) => {
    const child = spawn("yt-dlp", args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    const t = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("extractor_timeout"));
    }, timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.on("error", (e) => {
      clearTimeout(t);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(t);
      if (code === 0 && out.trim()) resolve(out.trim());
      else reject(new Error("extractor_failed"));
    });
  });
}

async function getAudioUrl(videoId) {
  const hit = audioUrlCache.get(videoId);
  const now = Date.now() / 1000;
  if (hit && hit.expire - 90 > now) return hit.url;
  const raw = await runYtDlp([
    "-f",
    "bestaudio[ext=m4a]/bestaudio[acodec^=mp4a]/bestaudio/best",
    "-g",
    "--no-playlist",
    "--no-warnings",
    "--no-check-certificates",
    `https://www.youtube.com/watch?v=${videoId}`,
  ]);
  const url = raw.split("\n").filter(Boolean).pop();
  let expire = now + 60 * 60 * 4;
  try {
    const exp = new URL(url).searchParams.get("expire");
    if (exp) expire = Number(exp);
  } catch {
    /* default */
  }
  audioUrlCache.set(videoId, { url, expire });
  return url;
}

async function lookupTrack(query) {
  if (query.encoded) {
    try {
      const decoded = await llGet("/v4/decodetrack", { encodedTrack: query.encoded });
      const t = normalizeTrack(decoded);
      if (t) return t;
    } catch {
      /* fall through */
    }
  }
  const key = query.src && query.id ? `${query.src}:${query.id}` : query.id;
  if (key && trackCache.has(key)) return trackCache.get(key);
  if (query.id && trackCache.has(query.id)) return trackCache.get(query.id);
  if (query.title && query.author) {
    return {
      id: query.id,
      title: query.title,
      author: query.author,
      duration: Number(query.duration || 0),
      source: query.src || "spotify",
      isrc: query.isrc || null,
      artwork: query.artwork || null,
    };
  }
  return null;
}

function serveStatic(req, res) {
  const u = parseUrl(req);
  let rel = decodeURIComponent(u.pathname);
  if (rel === "/") rel = "/index.html";
  const file = path.normalize(path.join(WWW, rel));
  if (!file.startsWith(WWW)) return json(res, 403, { error: "Forbidden" });
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      const index = path.join(WWW, "index.html");
      return fs.readFile(index, (e2, buf) => {
        if (e2) return json(res, 404, { error: "Not built" });
        send(res, 200, buf, { "Content-Type": "text/html; charset=utf-8" });
      });
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=3600",
    });
    fs.createReadStream(file).pipe(res);
  });
}

function pipeWeb(res, up, extra = {}) {
  const headers = { ...extra };
  const type = up.headers.get("content-type");
  const len = up.headers.get("content-length");
  const range = up.headers.get("content-range");
  const ranges = up.headers.get("accept-ranges");
  if (type) headers["Content-Type"] = type;
  if (len) headers["Content-Length"] = len;
  if (range) headers["Content-Range"] = range;
  if (ranges) headers["Accept-Ranges"] = ranges;
  res.writeHead(up.status, headers);
  if (!up.body) return res.end();
  const stream = Readable.fromWeb(up.body);
  stream.on("error", () => res.end());
  stream.pipe(res);
}

async function handleApi(req, res) {
  const u = parseUrl(req);
  const p = u.pathname;
  const q = Object.fromEntries(u.searchParams.entries());

  if (p === "/api/health") return json(res, 200, { ok: true, player: "monochrome" });

  if (p === "/api/search") {
    const query = String(q.q || "").trim();
    if (!query) return json(res, 200, { tracks: [], albums: [], artists: [], playlists: [] });
    if (/^https?:\/\//i.test(query)) {
      const col = await loadCollection(query);
      if (col.info) {
        const payload = { tracks: col.tracks, albums: [], artists: [], playlists: [] };
        if (col.info.type === "album") payload.albums = [col.info];
        else if (col.info.type === "artist") payload.artists = [col.info];
        else payload.playlists = [col.info];
        return json(res, 200, payload);
      }
      return json(res, 200, { tracks: col.tracks, albums: [], artists: [], playlists: [] });
    }
    const [sp, catalog, ytm] = await Promise.allSettled([
      lavaSearch(query),
      loadTracks(`spsearch:${query}`),
      loadTracks(`ytmsearch:${query}`),
    ]);
    const result =
      sp.status === "fulfilled" ? sp.value : { tracks: [], albums: [], artists: [], playlists: [] };
    const extra = [];
    if (catalog.status === "fulfilled") extra.push(...catalog.value);
    if (ytm.status === "fulfilled") extra.push(...ytm.value);
    const seen = new Set(result.tracks.map((t) => t.id));
    for (const t of extra) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      result.tracks.push(t);
    }
    return json(res, 200, result);
  }

  if (p === "/api/browse") {
    if (browseCache.data && Date.now() - browseCache.at < 5 * 60 * 1000) return json(res, 200, browseCache.data);
    const seeds = ["The Weeknd", "Billie Eilish", "Kendrick Lamar", "SZA", "Daft Punk", "Arctic Monkeys", "Frank Ocean", "Tyler the Creator"];
    const albumUrls = [
      "https://open.spotify.com/album/4yP0hdKOZPNshxUOjY0cZj",
      "https://open.spotify.com/album/7aJuG4TFXa2hmE4z1sxplt",
      "https://open.spotify.com/album/07w0rG5TETcyihsEIZR3qG",
      "https://open.spotify.com/album/3RQQmkQEvNCY4prGKE6oc5",
      "https://open.spotify.com/album/4m2880jivSbbyEGAKfITCa",
      "https://open.spotify.com/album/3mH6qwIy9wRZv8tSJdWqvK",
      "https://open.spotify.com/album/7ycBtnsMtyVbbwTfJwRjSP",
      "https://open.spotify.com/album/2fYhqwDwH7XHiCGZqKD3MP",
    ];
    const searches = await Promise.allSettled(seeds.map((s) => lavaSearch(s)));
    const albums = await Promise.allSettled(albumUrls.map((x) => loadCollection(x)));
    const tracks = [];
    const albumCards = [];
    const artists = [];
    const seenT = new Set();
    const seenA = new Set();
    const seenR = new Set();
    for (const s of searches) {
      if (s.status !== "fulfilled") continue;
      for (const t of s.value.tracks) {
        if (seenT.has(t.id)) continue;
        seenT.add(t.id);
        tracks.push(t);
      }
      for (const a of s.value.albums) {
        if (!a.url || seenA.has(a.url)) continue;
        seenA.add(a.url);
        albumCards.push(a);
      }
      for (const a of s.value.artists) {
        if (!a.url || seenR.has(a.url)) continue;
        seenR.add(a.url);
        artists.push(a);
      }
    }
    const picks = [];
    for (const a of albums) {
      if (a.status !== "fulfilled" || !a.value.info) continue;
      picks.push({ ...a.value.info, tracks: a.value.tracks });
    }
    const data = { songs: tracks.slice(0, 24), albums: albumCards.slice(0, 18), artists: artists.slice(0, 16), picks };
    browseCache.data = data;
    browseCache.at = Date.now();
    return json(res, 200, data);
  }

  if (p === "/api/collection") {
    const url = String(q.url || "").trim();
    if (!url) return json(res, 400, { error: "Missing url" });
    return json(res, 200, await loadCollection(url));
  }

  if (p === "/api/lyrics") {
    const title = String(q.title || "").trim();
    const artist = String(q.artist || "").trim();
    const album = String(q.album || "").trim();
    const duration = Number(q.duration || 0);
    if (!title || !artist) return json(res, 400, { error: "Missing track" });
    const key = `${artist}|${title}|${duration || ""}`.toLowerCase();
    if (lyricsCache.has(key)) return json(res, 200, lyricsCache.get(key));
    const headers = { "User-Agent": CLIENT_UA, "Lrclib-Client": CLIENT_UA };
    const getUrl = new URL("/api/get", LRCLIB);
    getUrl.searchParams.set("track_name", title);
    getUrl.searchParams.set("artist_name", artist);
    if (album) getUrl.searchParams.set("album_name", album);
    if (duration > 0) getUrl.searchParams.set("duration", String(Math.round(duration)));
    let payload = null;
    let r = await fetch(getUrl, { headers, signal: AbortSignal.timeout(12000) });
    if (r.ok) payload = await r.json();
    if (!payload) {
      const sUrl = new URL("/api/search", LRCLIB);
      sUrl.searchParams.set("track_name", title);
      sUrl.searchParams.set("artist_name", artist);
      r = await fetch(sUrl, { headers, signal: AbortSignal.timeout(12000) });
      if (r.ok) {
        const arr = await r.json();
        if (Array.isArray(arr) && arr.length) payload = arr.find((x) => x.syncedLyrics) || arr[0];
      }
    }
    if (!payload) return json(res, 404, { error: "No lyrics" });
    const out = {
      id: payload.id,
      trackName: payload.trackName || payload.name,
      artistName: payload.artistName,
      albumName: payload.albumName,
      duration: payload.duration,
      instrumental: payload.instrumental,
      plainLyrics: payload.plainLyrics,
      syncedLyrics: payload.syncedLyrics,
    };
    lyricsCache.set(key, out);
    return json(res, 200, out);
  }

  if (p === "/api/cover") {
    const raw = String(q.u || "");
    const url = new URL(raw);
    if (!/^https?:$/.test(url.protocol)) return send(res, 400, "bad url");
    if (!COVER_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))) return send(res, 400, "bad host");
    const up = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { "User-Agent": CLIENT_UA } });
    if (!up.ok) return send(res, up.status, "cover failed");
    return pipeWeb(res, up, { "Cache-Control": "public, max-age=86400" });
  }

  if (p === "/api/prefetch" && req.method === "POST") {
    const body = await readBody(req);
    const track = await lookupTrack(body);
    if (!track) return json(res, 200, { ok: false });
    const videoId = await resolveYoutubeId(track);
    getAudioUrl(videoId).catch(() => {});
    return json(res, 200, { ok: true });
  }

  if (p === "/api/stream") {
    const track = await lookupTrack(q);
    if (!track) return json(res, 404, { error: "Unknown track" });
    const videoId = await resolveYoutubeId(track);
    const audioUrl = await getAudioUrl(videoId);
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "*/*",
    };
    if (req.headers.range) headers.Range = req.headers.range;
    const up = await fetch(audioUrl, { headers, signal: AbortSignal.timeout(30000) });
    if (!up.ok && up.status !== 206) {
      audioUrlCache.delete(videoId);
      return json(res, 502, { error: "Stream failed" });
    }
    return pipeWeb(res, up, {
      "Content-Type": up.headers.get("content-type") || "audio/mp4",
      "Accept-Ranges": up.headers.get("accept-ranges") || "bytes",
      "Cache-Control": "no-store",
    });
  }

  json(res, 404, { error: "Not found" });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/")) await handleApi(req, res);
    else serveStatic(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) json(res, 500, { error: "Server error" });
    else res.end();
  }
});

process.on("uncaughtException", (e) => console.error("uncaught", e));
process.on("unhandledRejection", (e) => console.error("unhandled", e));

if (!LL_HOST || !LL_AUTH) {
  console.warn("Missing LAVALINK_HOST or LAVALINK_AUTH. Copy .env.example to .env");
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Monochrome listening on ${PORT}`);
});

void https;
