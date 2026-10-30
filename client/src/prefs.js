/**
 * User preferences.
 *
 * Everything the Settings page exposes lives here: the options, their
 * defaults, how they are persisted and how they are pushed onto the
 * document element so the stylesheet can react to them.
 */

export const THEMES = [
  { id: "lunar", name: "Lunar Peach", blurb: "Warm peach accents on near-black." },
  { id: "monochrome", name: "Monochrome", blurb: "Pure greyscale — every hue removed." },
];

export const ACCENTS = [
  { id: "peach", name: "Peach", swatch: "#ffe0bf" },
  { id: "rose", name: "Rose", swatch: "#ffbac9" },
  { id: "sky", name: "Sky", swatch: "#b0d6ff" },
  { id: "mint", name: "Mint", swatch: "#a8f0d0" },
  { id: "lilac", name: "Lilac", swatch: "#cebfff" },
  { id: "amber", name: "Amber", swatch: "#ffce8a" },
];

export const LYRIC_SIZES = [
  { id: "sm", name: "Small" },
  { id: "md", name: "Normal" },
  { id: "lg", name: "Large" },
];

export const PLAYER_SIZES = [
  { id: "sm", name: "Compact" },
  { id: "md", name: "Normal" },
  { id: "lg", name: "Large" },
];

export const DEFAULT_PREFS = {
  theme: "lunar",
  accent: "peach",
  lyricSize: "md",
  playerSize: "md",
  autoplay: true,
  shuffleOnPlay: false,
  autoLyrics: false,
  reduceMotion: false,
};

const KEY = "mc-prefs";

const pick = (list, value, fallback) => (list.some((x) => x.id === value) ? value : fallback);

export function loadPrefs() {
  try {
    // The old theme switcher never had any styling behind it — drop the
    // stale key so the two schemes start from the default look.
    localStorage.removeItem("mc-theme");
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const saved = JSON.parse(raw) || {};
    const p = { ...DEFAULT_PREFS, ...saved };
    // Guard against a hand-edited or stale payload.
    p.theme = pick(THEMES, p.theme, DEFAULT_PREFS.theme);
    p.accent = pick(ACCENTS, p.accent, DEFAULT_PREFS.accent);
    p.lyricSize = pick(LYRIC_SIZES, p.lyricSize, DEFAULT_PREFS.lyricSize);
    p.playerSize = pick(PLAYER_SIZES, p.playerSize, DEFAULT_PREFS.playerSize);
    p.autoplay = !!p.autoplay;
    p.shuffleOnPlay = !!p.shuffleOnPlay;
    p.autoLyrics = !!p.autoLyrics;
    p.reduceMotion = !!p.reduceMotion;
    return p;
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* private mode / quota — preferences just won't persist */
  }
}

/** Push the preferences onto <html> so the stylesheet can react to them. */
export function applyPrefs(prefs) {
  const el = document.documentElement;
  el.setAttribute("data-theme", prefs.theme);
  el.setAttribute("data-accent", prefs.accent);
  el.setAttribute("data-lyric-size", prefs.lyricSize);
  el.setAttribute("data-player-size", prefs.playerSize);
  el.setAttribute("data-motion", prefs.reduceMotion ? "reduced" : "full");
}
