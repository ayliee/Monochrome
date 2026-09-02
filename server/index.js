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
const browseCache = { data: null, at: 0 };
const lyricsCache = new Map();

const GENRES = [
  { id: "music", name: "Music", color: "#d81b60", query: "Today's Top Hits" },
  { id: "live", name: "Live Events", color: "#7c2bff", query: "live concert hits" },
  { id: "foryou", name: "Made For You", color: "#1e3a5f", query: "pop mix hits" },
  { id: "new", name: "New Releases", color: "#5a7a14", query: "new music friday" },
  { id: "desi", name: "Desi", color: "#e85d04", query: "desi hits" },
  { id: "pop", name: "Pop", color: "#4a8aa3", query: "pop hits" },
  { id: "hiphop", name: "Hip-Hop", color: "#4a6d7c", query: "hip hop rap caviar" },
  { id: "punjabi", name: "Punjabi", color: "#c2185b", query: "punjabi hits" },
  { id: "charts", name: "Charts", color: "#9b6bb0", query: "top songs global" },
  { id: "educational", name: "Educational", color: "#5b8fa8", query: "study music focus" },
  { id: "documentary", name: "Documentary", color: "#4a3d4a", query: "documentary soundtrack" },
  { id: "comedy", name: "Comedy", color: "#c2186b", query: "comedy songs" },
  { id: "rock", name: "Rock", color: "#b71c1c", query: "rock hits" },
  { id: "rnb", name: "R&B", color: "#6a1b9a", query: "r&b soul hits" },
  { id: "electronic", name: "Electronic", color: "#1565c0", query: "electronic dance hits" },
  { id: "indie", name: "Indie", color: "#37474f", query: "indie pop hits" },
  { id: "latin", name: "Latin", color: "#ef6c00", query: "latin hits" },
  { id: "kpop", name: "K-Pop", color: "#ec407a", query: "k-pop hits" },
  { id: "country", name: "Country", color: "#8d6e63", query: "country hits" },
  { id: "metal", name: "Metal", color: "#263238", query: "metal hits" },
  { id: "jazz", name: "Jazz", color: "#455a64", query: "jazz classics" },
  { id: "classical", name: "Classical", color: "#5d4037", query: "classical music" },
  { id: "bollywood", name: "Bollywood", color: "#ff6f00", query: "bollywood hits" },
  { id: "pakistan", name: "Pakistani", color: "#00897b", query: "pakistani hits" },
  { id: "chill", name: "Chill", color: "#0277bd", query: "chill hits lo-fi" },
  { id: "workout", name: "Workout", color: "#e53935", query: "workout hits" },
  { id: "romance", name: "Romance", color: "#ad1457", query: "love songs" },
  { id: "party", name: "Party", color: "#f9a825", query: "party hits" },
  { id: "folk", name: "Folk", color: "#6d4c41", query: "folk acoustic" },
  { id: "reggae", name: "Reggae", color: "#2e7d32", query: "reggae hits" },
];

async function mapPool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  const worker = async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

const genreProbeCache = new Map();

async function probeGenre(g) {
  const hit = genreProbeCache.get(g.id);
  if (hit && Date.now() - hit.at < 8 * 60 * 1000) return hit.data;
  let tracks = [];
  let art = null;
  try {
    tracks = await loadTracks(`spsearch:${g.query}`);
  } catch {
    tracks = [];
  }
  if (!tracks.length) {
    try {
      const s = await lavaSearch(g.query);
      tracks = s.tracks || [];
      art = s.playlists?.[0]?.artwork || s.albums?.[0]?.artwork || null;
    } catch {
      tracks = [];
    }
  }
  if (!art && tracks[0]?.artwork) art = tracks[0].artwork;
  const data = { ...g, artwork: art, trackCount: tracks.length };
  genreProbeCache.set(g.id, { at: Date.now(), data });
  return data;
}

async function genresWithArt() {
  const data = await mapPool(GENRES, 8, async (g) => {
    try {
      return await probeGenre(g);
    } catch {
      return null;
    }
  });
  return data.filter((g) => g && g.trackCount > 0);
}

const COVER_HOSTS = [
  "i.scdn.co",
  "scdn.co",
  "mosaic.scdn.co",
  "spotifycdn.com",
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

async function resolveYoutubeCandidates(track) {
  if (!track) throw new Error("no_track");
  if (track.source === "youtube" && isVideoId(track.id)) return [track.id];
  const key = `${track.source}:${track.id}`;
  if (ytResolveCache.has(key)) return ytResolveCache.get(key);
  const queries = [];
  if (track.isrc) queries.push(`ytmsearch:${track.isrc}`);
  queries.push(`ytmsearch:${track.title} ${track.author}`);
  queries.push(`ytsearch:${track.title} ${track.author} audio`);
  queries.push(`ytsearch:${track.title} ${track.author} official`);
  const ranked = [];
  for (const q of queries) {
    try {
      const results = await loadTracks(q);
      for (const r of results.slice(0, 8)) {
        if (!isVideoId(r.id)) continue;
        const score = Math.abs((r.duration || 0) - (track.duration || 0));
        const titleHit =
          r.title.toLowerCase().includes(String(track.title).toLowerCase().slice(0, 18)) ||
          String(track.title).toLowerCase().includes(r.title.toLowerCase().slice(0, 18));
        ranked.push({ id: r.id, score: score + (titleHit ? 0 : 25000) });
      }
    } catch {
      /* next */
    }
  }
  ranked.sort((a, b) => a.score - b.score);
  const ids = [];
  for (const r of ranked) if (!ids.includes(r.id)) ids.push(r.id);
  if (!ids.length) throw new Error("resolve_failed");
  ytResolveCache.set(key, ids.slice(0, 6));
  return ytResolveCache.get(key);
}

const audioBufCache = new Map();
const audioPending = new Map();

function isVideoId(id) {
  return typeof id === "string" && /^[\w-]{6,20}$/.test(id);
}

function llGetRaw(pathname, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathname, LL_BASE);
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      url,
      { method: "GET", headers: llHeaders(), timeout: timeoutMs },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 0,
            mime: res.headers["content-type"] || "",
            buf: Buffer.concat(chunks),
          });
        });
      }
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("ll_timeout"));
    });
    req.on("error", reject);
    req.end();
  });
}

function remuxToMp4(buf) {
  return new Promise((resolve, reject) => {
    const dir = fs.mkdtempSync(path.join("/tmp", "mc-"));
    const inn = path.join(dir, "in.bin");
    const out = path.join(dir, "out.m4a");
    const cleanup = () => {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    };
    try {
      fs.writeFileSync(inn, buf);
    } catch (e) {
      cleanup();
      reject(e);
      return;
    }
    const child = spawn("ffmpeg", [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      inn,
      "-vn",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      "-movflags",
      "+faststart",
      out,
    ]);
    const t = setTimeout(() => {
      child.kill("SIGKILL");
      cleanup();
      reject(new Error("remux_timeout"));
    }, 45000);
    child.on("error", (e) => {
      clearTimeout(t);
      cleanup();
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(t);
      try {
        if (code === 0 && fs.existsSync(out)) {
          const result = fs.readFileSync(out);
          cleanup();
          if (result.length > 2000) return resolve(result);
        }
      } catch (e) {
        cleanup();
        reject(e);
        return;
      }
      cleanup();
      reject(new Error("remux_failed"));
    });
  });
}

async function fetchYoutubeAudio(videoId) {
  if (!isVideoId(videoId)) throw new Error("bad_id");
  const queries = ["itag=140", "itag=139", "", "itag=251"];
  let lastErr = "no_stream";
  for (const q of queries) {
    const path = `/youtube/stream/${encodeURIComponent(videoId)}${q ? `?${q}` : ""}`;
    try {
      const r = await llGetRaw(path);
      if (r.status === 200 && r.buf.length > 2000) {
        let buf = r.buf;
        let mime = "audio/mp4";
        try {
          buf = await remuxToMp4(r.buf);
        } catch {
          mime = r.mime.split(";")[0].trim() || (r.buf[4] === 0x66 ? "audio/mp4" : "audio/webm");
        }
        return { buf, mime, at: Date.now() };
      }
      lastErr = `status_${r.status}`;
    } catch (e) {
      lastErr = e.message || "fetch_failed";
    }
  }
  throw new Error(lastErr);
}

async function loadAudioForTrack(track) {
  const ids = await resolveYoutubeCandidates(track);
  let last = null;
  for (const id of ids) {
    try {
      return await loadAudio(id);
    } catch (e) {
      last = e;
    }
  }
  throw last || new Error("no_stream");
}

async function loadAudio(videoId) {
  const hit = audioBufCache.get(videoId);
  if (hit && Date.now() - hit.at < 25 * 60 * 1000) return hit;
  if (audioPending.has(videoId)) return audioPending.get(videoId);
  const p = fetchYoutubeAudio(videoId)
    .then((rec) => {
      audioBufCache.set(videoId, rec);
      if (audioBufCache.size > 10) {
        const oldest = audioBufCache.keys().next().value;
        audioBufCache.delete(oldest);
      }
      return rec;
    })
    .finally(() => audioPending.delete(videoId));
  audioPending.set(videoId, p);
  return p;
}

function sendAudioRange(req, res, rec) {
  const size = rec.buf.length;
  const mime = rec.mime || "audio/mp4";
  const range = req.headers.range;
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", mime);
  if (!range) {
    res.writeHead(200, { "Content-Length": size });
    res.end(rec.buf);
    return;
  }
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(range));
  if (!m) {
    res.writeHead(416, { "Content-Range": `bytes */${size}` });
    res.end();
    return;
  }
  let start = m[1] ? Number(m[1]) : 0;
  let end = m[2] ? Number(m[2]) : size - 1;
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
    res.writeHead(416, { "Content-Range": `bytes */${size}` });
    res.end();
    return;
  }
  end = Math.min(end, size - 1);
  const slice = rec.buf.subarray(start, end + 1);
  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${size}`,
    "Content-Length": slice.length,
  });
  res.end(slice);
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

  if (p === "/api/genres") {
    return json(res, 200, { genres: await genresWithArt() });
  }

  if (p === "/api/genre-meta") {
    const id = String(q.id || "").trim();
    const g = GENRES.find((x) => x.id === id);
    if (!g) return json(res, 404, { error: "Unknown genre" });
    const rec = await probeGenre(g);
    if (!rec.trackCount) return json(res, 200, { ok: false, genre: rec });
    return json(res, 200, { ok: true, genre: rec });
  }

  if (p === "/api/genre") {
    const id = String(q.id || "").trim();
    const g = GENRES.find((x) => x.id === id);
    if (!g) return json(res, 404, { error: "Unknown genre" });
    const search = await lavaSearch(g.query);
    let tracks = [...(search.tracks || [])];
    const pl = (search.playlists || [])[0];
    if (pl?.url) {
      try {
        const col = await loadCollection(pl.url);
        if (col.tracks?.length) tracks = col.tracks;
      } catch {
        /* keep search tracks */
      }
    }
    if (tracks.length < 12) {
      try {
        const extra = await loadTracks(`spsearch:${g.query}`);
        const seen = new Set(tracks.map((t) => t.id));
        for (const t of extra) {
          if (seen.has(t.id)) continue;
          seen.add(t.id);
          tracks.push(t);
        }
      } catch {
        /* ignore */
      }
    }
    return json(res, 200, { genre: g, tracks });
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
    loadAudioForTrack(track).catch(() => {});
    return json(res, 200, { ok: true });
  }

  if (p === "/api/stream") {
    const track = await lookupTrack(q);
    if (!track) return json(res, 404, { error: "Unknown track" });
    const rec = await loadAudioForTrack(track);
    return sendAudioRange(req, res, rec);
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
