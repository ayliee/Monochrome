export function coverUrl(url) {
  if (!url) return "";
  return `/api/cover?u=${encodeURIComponent(url)}`;
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
  return `/api/stream?${p.toString()}`;
}

export async function apiGet(path) {
  const res = await fetch(path);
  if (!res.ok) {
    const err = new Error("request_failed");
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const searchCatalog = (q) => apiGet(`/api/search?q=${encodeURIComponent(q)}`);
export const browseHome = () => apiGet("/api/browse");
export const loadCollection = (url) => apiGet(`/api/collection?url=${encodeURIComponent(url)}`);

export async function fetchLyrics(track) {
  const p = new URLSearchParams({
    title: track.title || "",
    artist: track.author || "",
  });
  if (track.album) p.set("album", track.album);
  if (track.duration) p.set("duration", String(Math.round(track.duration / 1000)));
  const res = await fetch(`/api/lyrics?${p}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("lyrics");
  return res.json();
}

export function prefetch(track) {
  if (!track) return;
  fetch("/api/prefetch", {
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
