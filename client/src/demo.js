import { GENRES } from "./genres.js";

/* =========================================================================
   Offline catalogue.
   The live app talks to the Node server (Lavalink + yt-dlp) for every
   request. When that backend isn't reachable — e.g. the statically
   published build — the UI falls back to this module so the whole
   interface still renders with real-shaped data.

   Everything here is deterministic: no Math.random(), so a reload always
   produces the identical catalogue.
   ========================================================================= */

/* ------------------------------------------------------------------ hash */

function hashString(str) {
  let h = 2166136261;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ---------------------------------------------------------------- artwork */

const PALETTES = [
  ["#2b1055", "#7597de"],
  ["#4a1942", "#b06cff"],
  ["#0f2027", "#2c5364"],
  ["#3a1c71", "#d76d77"],
  ["#16222a", "#3a6073"],
  ["#42275a", "#734b6d"],
  ["#1f1c2c", "#928dab"],
  ["#0b486b", "#f56217"],
  ["#232526", "#414345"],
  ["#3a1c71", "#d76d77"],
];

function escXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Deterministic abstract cover art as an inline SVG data URI. */
export function artwork(seed) {
  const key = String(seed || "monochrome");
  const h = hashString(key);
  const [c1, c2] = PALETTES[h % PALETTES.length];
  const angle = (h >> 3) % 90;
  const cx = 40 + (h % 120);
  const cy = 40 + ((h >> 5) % 120);
  const r = 60 + ((h >> 7) % 70);
  const label = key.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "MC";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
<defs><linearGradient id="g" gradientTransform="rotate(${angle})"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
<rect width="300" height="300" fill="url(#g)"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff" opacity="0.08"/>
<circle cx="${300 - cx}" cy="${300 - cy}" r="${Math.round(r * 0.55)}" fill="#000000" opacity="0.14"/>
<text x="150" y="150" font-family="Helvetica,Arial,sans-serif" font-size="104" font-weight="700" fill="#ffffff" opacity="0.26" text-anchor="middle" dominant-baseline="central">${escXml(label)}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/* ---------------------------------------------------------------- catalogue */

const RAW = [
  ["Blinding Lights", "The Weeknd", "After Hours", 200040],
  ["Save Your Tears", "The Weeknd", "After Hours", 215040],
  ["Starboy", "The Weeknd", "Starboy", 231060],
  ["As It Was", "Harry Styles", "Harry's House", 167760],
  ["Watermelon Sugar", "Harry Styles", "Fine Line", 174300],
  ["Flowers", "Miley Cyrus", "Endless Summer Vacation", 200040],
  ["As It Was", "Harry Styles", "Harry's House", 167760],
  ["Anti-Hero", "Taylor Swift", "Midnights", 200940],
  ["Cruel Summer", "Taylor Swift", "Lover", 178020],
  ["Blinding Lights", "The Weeknd", "After Hours", 200040],
  ["Levitating", "Dua Lipa", "Future Nostalgia", 203280],
  ["As It Was", "Harry Styles", "Harry's House", 167760],
  ["Good 4 U", "Olivia Rodrigo", "SOUR", 194340],
  ["drivers license", "Olivia Rodrigo", "SOUR", 232620],
  ["Bad Guy", "Billie Eilish", "WHEN WE ALL FALL ASLEEP", 194160],
  ["Ocean Eyes", "Billie Eilish", "dont smile at me", 200040],
  ["HUMBLE.", "Kendrick Lamar", "DAMN.", 177060],
  ["Money Trees", "Kendrick Lamar", "good kid, m.A.A.d city", 386460],
  ["Kill Bill", "SZA", "SOS", 153660],
  ["Cranes in the Sky", "SZA", "SOS", 200220],
  ["Instant Crush", "Daft Punk", "Random Access Memories", 337320],
  ["Get Lucky", "Daft Punk", "Random Access Memories", 369060],
  ["Do I Wanna Know?", "Arctic Monkeys", "AM", 272400],
  ["R U Mine?", "Arctic Monomials", "AM", 201780],
  ["Pink + White", "Frank Ocean", "Blonde", 184740],
  ["Nights", "Frank Ocean", "Blonde", 307140],
  ["Yonkers", "Tyler, The Creator", "GOBLIN", 174540],
  ["EARFQUAKE", "Tyler, The Creator", "IGOR", 194520],
  ["Sunflower", "Post Malone", "Spider-Man: Into the Spider-Verse", 158820],
  ["Circles", "Post Malone", "Hollywood's Bleeding", 215820],
  ["SICKO MODE", "Travis Scott", "ASTROWORLD", 312180],
  ["SICKO MODE", "Travis Scott", "ASTROWORLD", 312180],
  ["God's Plan", "Drake", "Scorpion", 198960],
  ["Hotline Bling", "Drake", "Views", 239220],
  ["Lover", "Taylor Swift", "Lover", 201420],
  ["Shape of You", "Ed Sheeran", "Divide", 233820],
  ["Perfect", "Ed Sheeran", "Divide", 263400],
  ["Clarity", "Zedd", "Clarity", 232620],
  ["The Middle", "Zedd", "Clarity", 180540],
  ["Roses", "The Chainsmokers", "Memories...Do Not Open", 189240],
  ["Closer", "The Chainsmokers", "Memories...Do Not Open", 244620],
  ["Thunder", "Imagine Dragons", "Evolve", 187020],
  ["Radioactive", "Imagine Dragons", "Night Visions", 224160],
  ["Believer", "Imagine Dragons", "Evolve", 213540],
  ["Havana", "Camila Cabello", "Camila", 215700],
  ["Con Altura", "ROSALÍA", "Con Altura", 162420],
  ["Despacito", "Luis Fonsi", "VIDA", 229140],
  ["Tusa", "ROSALÍA", "Con Altura", 175020],
  ["Giant", "Imagine Dragons", "Night Visions", 226680],
  ["Sparks", "Coldplay", "A Head Full of Dreams", 227340],
  ["Viva La Vida", "Coldplay", "Viva la Vida", 242820],
  ["Somebody To You", "The Verve", "Hymn to the West Wind", 233220],
  ["Numb", "Linkin Park", "Meteora", 214440],
  ["In The End", "Linkin Park", "Hybrid Theory", 218880],
  ["Take Five", "Dave Brubeck", "Time Out", 322620],
  ["So What", "Miles Davis", "Kind of Blue", 545460],
  ["Enter Sandman", "Metallica", "Metallica", 254520],
  ["Wonderwall", "Oasis", "(What's the Story) Morning Glory?", 258240],
  ["Mr. Brightside", "The Killers", "Hot Fuss", 221760],
  ["Dreams", "Fleetwood Mac", "Rumours", 257280],
  ["Billie Jean", "Michael Jackson", "Thriller", 293940],
  ["Purple Rain", "Prince", "Purple Rain", 286020],
  ["Redbone", "Childish Gambino", "Awaken, My Love!", 326820],
  ["Tadow", "Masego", "Lady Lady", 201780],
  ["Best Part", "Daniel Caesar", "Freudian", 213480],
];

const ALBUMS = [
  ["After Hours", "The Weeknd", 14],
  ["Harry's House", "Harry Styles", 13],
  ["Endless Summer Vacation", "Miley Cyrus", 12],
  ["Midnights", "Taylor Swift", 13],
  ["Lover", "Taylor Swift", 16],
  ["Future Nostalgia", "Dua Lipa", 11],
  ["SOUR", "Olivia Rodrigo", 13],
  ["WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?", "Billie Eilish", 13],
  ["DAMN.", "Kendrick Lamar", 16],
  ["good kid, m.A.A.d city", "Kendrick Lamar", 12],
  ["SOS", "SZA", 23],
  ["Random Access Memories", "Daft Punk", 13],
  ["AM", "Arctic Monkeys", 11],
  ["Blonde", "Frank Ocean", 17],
  ["IGOR", "Tyler, The Creator", 12],
  ["Hollywood's Bleeding", "Post Malone", 17],
  ["ASTROWORLD", "Travis Scott", 16],
  ["Scorpion", "Drake", 19],
  ["Divide", "Ed Sheeran", 16],
  ["Clarity", "Zedd", 14],
  ["Evolve", "Imagine Dragons", 12],
  ["Night Visions", "Imagine Dragons", 13],
  ["Con Altura", "ROSALÍA", 10],
  ["Camila", "Camila Cabello", 12],
  ["A Head Full of Dreams", "Coldplay", 11],
  ["Hybrid Theory", "Linkin Park", 14],
  ["Kind of Blue", "Miles Davis", 5],
  ["Hot Fuss", "The Killers", 11],
  ["Rumours", "Fleetwood Mac", 11],
];

const ARTISTS = [
  "The Weeknd",
  "Harry Styles",
  "Taylor Swift",
  "Billie Eilish",
  "Kendrick Lamar",
  "SZA",
  "Dua Lipa",
  "Olivia Rodrigo",
  "Daft Punk",
  "Arctic Monkeys",
  "Frank Ocean",
  "Tyler, The Creator",
  "Post Malone",
  "Drake",
  "Ed Sheeran",
  "Imagine Dragons",
  "ROSALÍA",
  "Camila Cabello",
  "Coldplay",
  "Linkin Park",
  "The Killers",
  "Fleetwood Mac",
];

const slug = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function buildTracks() {
  const seen = new Set();
  const out = [];
  RAW.forEach(([title, author, album, duration], i) => {
    const key = `${title}|${author}`;
    if (seen.has(key)) return;
    seen.add(key);
    const albumSlug = slug(album);
    const artistSlug = slug(author);
    out.push({
      id: `demo-t${String(i).padStart(3, "0")}`,
      encoded: "",
      title,
      author,
      duration,
      artwork: artwork(`${album}-${title}`),
      uri: `https://example.com/track/${i}`,
      source: "spotify",
      isrc: null,
      album,
      albumUrl: `https://open.spotify.com/album/demo-${albumSlug}`,
      artistUrl: `https://open.spotify.com/artist/demo-${artistSlug}`,
      artistArtwork: null,
    });
  });
  return out;
}

export const demoTracks = buildTracks();

function buildAlbums() {
  return ALBUMS.map(([name, author, totalTracks]) => ({
    name,
    url: `https://open.spotify.com/album/demo-${slug(name)}`,
    type: "album",
    artwork: artwork(name),
    totalTracks,
    author,
  }));
}

export const demoAlbums = buildAlbums();

export const demoArtists = ARTISTS.map((name) => ({
  name,
  url: `https://open.spotify.com/artist/demo-${slug(name)}`,
  type: "artist",
  artwork: artwork(name),
  totalTracks: 8 + (hashString(name) % 22),
  author: "",
}));

function tracksForAlbum(albumName) {
  return demoTracks.filter((t) => t.album === albumName);
}

export const demoPicks = demoAlbums.slice(0, 8).map((a) => ({
  ...a,
  tracks: tracksForAlbum(a.name),
}));

export function demoBrowse() {
  return {
    songs: demoTracks.slice(0, 24),
    albums: demoAlbums.slice(0, 18),
    artists: demoArtists.slice(0, 16),
    picks: demoPicks,
  };
}

/* ------------------------------------------------------------------ search */

export function demoSearch(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return { tracks: [], albums: [], artists: [], playlists: [] };

  const hit = (s) => String(s || "").toLowerCase().includes(q);

  const tracks = demoTracks.filter((t) => hit(t.title) || hit(t.author) || hit(t.album)).slice(0, 30);
  const albums = demoAlbums.filter((a) => hit(a.name) || hit(a.author)).slice(0, 12);
  const artists = demoArtists.filter((a) => hit(a.name) || hit(a.author)).slice(0, 10);

  const playlists = albums.slice(0, 6).map((a, i) => ({
    ...a,
    type: "playlist",
    name: `${a.name} Mix`,
    url: `https://open.spotify.com/playlist/demo-pl-${i + 1}`,
    totalTracks: 8 + i * 3,
  }));

  return { tracks, albums, artists, playlists };
}

/* ------------------------------------------------------------------ genres */

const GENRE_KEYWORDS = {
  pop: ["Taylor Swift", "Dua Lipa", "Ed Sheeran", "Olivia Rodrigo", "Harry Styles", "Miley Cyrus"],
  rock: ["Linkin Park", "The Killers", "Oasis", "Imagine Dragons", "Arctic Monkeys", "Fleetwood Mac"],
  electronic: ["Daft Punk", "Zedd", "The Chainsmokers"],
  hiphop: ["Kendrick Lamar", "Travis Scott", "Drake", "Tyler, The Creator", "Childish Gambino"],
  rnb: ["SZA", "Frank Ocean", "Daniel Caesar", "Masego", "The Weeknd"],
  jazz: ["Miles Davis", "Dave Brubeck"],
  latin: ["ROSALÍA", "Luis Fonsi", "Camila Cabello"],
  classical: ["Miles Davis", "Dave Brubeck"],
  indie: ["Arctic Monkeys", "Coldplay", "Frank Ocean", "The Killers"],
  kpop: ["BTS", "BLACKPINK", "NewJeans"],
  bollywood: ["Arijit Singh", "Pritam", "Shreya Ghoshal"],
  live: ["Daft Punk", "Coldplay", "The Weeknd", "Travis Scott"],
  workout: ["Imagine Dragons", "Travis Scott", "Zedd"],
  chill: ["Frank Ocean", "SZA", "Coldplay", "Masego"],
  romance: ["Ed Sheeran", "Adele", "Taylor Swift"],
  party: ["Daft Punk", "Travis Scott", "The Chainsmokers"],
  new: ["Travis Scott", "Tyler, The Creator", "Post Malone", "Billie Eilish"],
  charts: ["The Weeknd", "Taylor Swift", "Ed Sheeran", "Drake"],
};

function genreTracks(g) {
  const wanted = GENRE_KEYWORDS[g.id] || [];
  let picked = demoTracks.filter((t) => wanted.some((w) => t.author.includes(w)));
  if (picked.length < 8) {
    const extra = demoTracks.filter((t) => !picked.includes(t) && wanted.some((w) => t.title.toLowerCase().includes(w.toLowerCase())));
    picked = picked.concat(extra);
  }
  if (picked.length < 8) {
    const offset = hashString(g.id) % demoTracks.length;
    const rotated = demoTracks.slice(offset).concat(demoTracks.slice(0, offset));
    picked = picked.concat(rotated.filter((t) => !picked.includes(t)));
  }
  return picked.slice(0, 8 + (hashString(g.id) % 9));
}

export function demoGenre(id) {
  const g = GENRES.find((x) => x.id === id) || GENRES[0];
  const tracks = genreTracks(g);
  return {
    genre: {
      id: g.id,
      name: g.name,
      color: g.color,
      query: g.query,
      artwork: artwork(`${g.name}-genre`),
      trackCount: tracks.length,
    },
    tracks,
  };
}

export function demoGenres() {
  return { genres: GENRES.map((g) => demoGenre(g.id).genre) };
}

/* -------------------------------------------------------------- collection */

export function demoCollection(url) {
  const u = String(url || "").trim();
  if (!u) return { info: null, tracks: [] };

  const album = demoAlbums.find((a) => a.url === u);
  if (album) return { info: album, tracks: tracksForAlbum(album.name) };

  const artist = demoArtists.find((a) => a.url === u);
  if (artist) {
    const tracks = demoTracks.filter((t) => t.author === artist.name);
    return { info: artist, tracks: tracks.length ? tracks : demoTracks.slice(0, 8) };
  }

  const pick = demoPicks.find((p) => p.url === u);
  if (pick) return { info: pick, tracks: pick.tracks };

  const playlist = demoSearch(u).playlists.find((p) => p.url === u);
  if (playlist) return { info: playlist, tracks: demoTracks.slice(0, 10) };

  return { info: null, tracks: [] };
}

/* ------------------------------------------------------------------ lyrics */

const LYRIC_LINES = [
  "City lights are fading out",
  "I keep hearing your footsteps loud",
  "Nothing here is what it seems",
  "Just another quiet dream",
  "Hold the night a little longer",
  "Let the radio play our song",
  "Every echo in this room",
  "Sounds a little bit like home",
  "Turn the lights down low tonight",
  "We can make the silence right",
  "No more running from the past",
  "Just another way to last",
  "Morning comes and goes again",
  "Nothing ever really changes",
  "If you stay a little while",
  "We can turn this into style",
];

export function demoLyrics(title, artist) {
  if (!title || !artist) return null;
  const h = hashString(`${title}|${artist}`);
  if (h % 5 === 0) return null;

  const start = 4 + (h % 12);
  const gap = 7 + (h % 6);
  const count = 8 + (h % 8);
  const picked = Array.from({ length: count }, (_, i) => LYRIC_LINES[(h + i * 3) % LYRIC_LINES.length]);

  const synced = picked
    .map((text, i) => {
      const t = start + i * gap;
      const mm = String(Math.floor(t / 60)).padStart(2, "0");
      const ss = String(t % 60).padStart(2, "0");
      const cs = String(Math.floor(((t % 1) * 100))).padStart(2, "0");
      return `[${mm}:${ss}.${cs}]${text}`;
    })
    .join("\n");

  const track = demoTracks.find((t) => t.title === title && t.author === artist);

  return {
    id: `demo-lrc-${h}`,
    trackName: title,
    artistName: artist,
    albumName: track?.album || "",
    duration: Math.round((track?.duration || 200000) / 1000),
    instrumental: false,
    plainLyrics: picked.join("\n"),
    syncedLyrics: synced,
  };
}
