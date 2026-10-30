import * as demo from "./demo.js";

/* Real-backend state. `online` starts optimistic and flips false only when a
   request actually fails, so the live Lavalink path is never shadowed. */
let online = true;
let probed = false;

/* Where the API lives. Empty means same-origin (the Node server serves both
   the UI and the API). Set VITE_API_BASE at build time to point a separately
   hosted frontend at a remote backend — e.g. the published static build
   talking to a Lavalink-proxied server. */
const API_BASE = (import.meta.env?.VITE_API_BASE || "").replace(/\/$/, "");

export function apiOrigin() {
  return API_BASE;
}

export function isOnline() {
  return online;
}

function markOffline() {
  if (!online) return;
  online = false;
  console.warn("[monochrome] backend unreachable — serving the offline catalogue");
}

export function coverUrl(url) {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  if (!online) return url;
  return `${API_BASE}/api/cover?u=${encodeURIComponent(url)}`;
}

export function streamUrl(track) {
  const p = new URLSearchParams();
  p.set("id", track.id);
  p.set("src", track.source || "spotify");
  if (track.title) p.set("title", track.title);
  if (track.author) p.set("author", track.author);
  if (track.duration) p.set("duration", String(Math.round(track.duration / 1000)));
  if (track.isrc) p.set("isrc", track.isrc);
  if (track.encoded) p.set("encoded", track.encoded);
  return `${API_BASE}/api/stream?${p.toString()}`;
}

export async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const err = new Error("request_failed");
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/** Runs a live request; on network failure falls back to the offline catalogue. */
async function withFallback(live, offline, isEmpty) {
  try {
    const value = await live();
    probed = true;
    // A live backend that reports no Lavalink node has nothing to search.
    if (value && typeof value === "object" && value.lavalink && value.lavalink.configured === false) {
      markOffline();
      return typeof offline === "function" ? offline() : offline;
    }
    // An empty catalogue means the same thing: prefer the bundled data so the
    // UI is never a blank screen.
    if (isEmpty && isEmpty(value)) {
      markOffline();
      return typeof offline === "function" ? offline() : offline;
    }
    online = true;
    return value;
  } catch (err) {
    markOffline();
    probed = true;
    return typeof offline === "function" ? offline() : offline;
  }
}

export const searchCatalog = (q) =>
  withFallback(
    () => apiGet(`/api/search?q=${encodeURIComponent(q)}`),
    () => demo.demoSearch(q),
    (r) => r && !r.tracks?.length && !r.albums?.length && !r.artists?.length && !r.playlists?.length
  );

export const browseHome = () =>
  withFallback(
    () => apiGet("/api/browse"),
    () => demo.demoBrowse(),
    (r) => r && !r.songs?.length && !r.albums?.length && !r.artists?.length && !r.picks?.length
  );

export const loadCollection = (url) =>
  withFallback(() => apiGet(`/api/collection?url=${encodeURIComponent(url)}`), () => demo.demoCollection(url));

export const loadGenres = () =>
  withFallback(() => apiGet("/api/genres"), () => demo.demoGenres(), (r) => r && !r.genres?.length);

export const loadGenre = (id) =>
  withFallback(() => apiGet(`/api/genre?id=${encodeURIComponent(id)}`), () => demo.demoGenre(id));

export const loadGenreMeta = (id) =>
  withFallback(() => apiGet(`/api/genre-meta?id=${encodeURIComponent(id)}`), () => {
    const g = demo.demoGenre(id);
    return { ok: g.genre.trackCount > 0, genre: g.genre };
  });

/** Probes the backend once so the UI can label its state accurately. */
export async function probeHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) throw new Error("health");
    const data = await res.json();
    // The server tells us whether a Lavalink node is configured. If it isn't,
    // the live catalogue is empty, so run in offline mode from the start.
    if (data?.lavalink && data.lavalink.configured === false) {
      online = false;
    } else {
      online = true;
    }
  } catch {
    online = false;
  }
  probed = true;
  return online;
}

export const hasProbed = () => probed;

export async function fetchLyrics(track) {
  const p = new URLSearchParams({
    title: track.title || "",
    artist: track.author || "",
  });
  if (track.album) p.set("album", track.album);
  if (track.duration) p.set("duration", String(Math.round(track.duration / 1000)));
  try {
    const res = await fetch(`${API_BASE}/api/lyrics?${p}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("lyrics");
    const data = await res.json();
    // The server answers 200 with `{ missing: true }` when LRCLIB has no
    // entry — treat that the same as a 404.
    if (!data || data.missing) return null;
    return data;
  } catch {
    markOffline();
    return demo.demoLyrics(track.title, track.author);
  }
}

export function prefetch(track) {
  if (!track) return;
  if (!online) return;
  fetch(`${API_BASE}/api/prefetch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: track.id,
      src: track.source,
      title: track.title,
      author: track.author,
      duration: track.duration,
      isrc: track.isrc,
      encoded: track.encoded,
    }),
  }).catch(() => {});
}

export function formatTime(msOrSec, isMs = false) {
  let sec = isMs ? Math.floor(msOrSec / 1000) : Math.floor(msOrSec);
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function parseLrc(text) {
  if (!text) return [];
  const lines = [];
  for (const raw of text.split("\n")) {
    const matches = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    if (!matches.length) continue;
    const content = raw.replace(/\[\d+:\d+(?:\.\d+)?\]/g, "").trim();
    for (const m of matches) {
      lines.push({ t: Number(m[1]) * 60 + Number(m[2]), text: content });
    }
  }
  lines.sort((a, b) => a.t - b.t);
  return lines;
}

export function trackKey(t) {
  return `${t.source || ""}:${t.id}`;
}
