import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  browseHome,
  coverUrl,
  fetchLyrics,
  formatTime,
  hasProbed,
  isOnline,
  loadCollection,
  loadGenre,
  loadGenreMeta,
  parseLrc,
  prefetch,
  probeHealth,
  searchCatalog,
  streamUrl,
  trackKey,
} from "./api.js";
import { GENRES } from "./genres.js";
import {
  ArtistCard,
  Art,
  Empty,
  Footer,
  Header,
  Hero,
  PageHead,
  PosterCard,
  ReleaseTile,
  Row,
  SearchStrip,
  SectionHead,
  SkeletonRow,
  SourceNote,
  Timeline,
  Toasts,
  TrackList,
  cls,
  useHeroItems,
} from "./components.jsx";
import {
  BackIcon,
  BoltIcon,
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  DiscIcon,
  EqualizerIcon,
  ExpandIcon,
  FlameIcon,
  GearIcon,
  GridIcon,
  HeartIcon,
  HistoryIcon,
  LayersIcon,
  MicIcon,
  MoreIcon,
  MusicNoteIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  QueueIcon,
  RepeatIcon,
  SearchIcon,
  ShuffleIcon,
  SparklesIcon,
  StarIcon,
  VolumeIcon,
  WaveIcon,
} from "./icons.jsx";

const LS_LIKED = "mc-liked";
const LS_RECENT = "mc-recent";
const LS_VOL = "mc-vol";
const LS_THEME = "mc-theme";

function loadJson(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

const NAV_ACTIVE = {
  home: "home",
  search: "browse",
  browse: "browse",
  genre: "browse",
  collection: "browse",
  library: "library",
  recent: "recent",
  settings: "settings",
};

export default function App() {
  const audioRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(0);
  const canvasRef = useRef(null);
  const lyricsRef = useRef(null);
  const searchRef = useRef(null);

  const [view, setView] = useState("home");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [searchTab, setSearchTab] = useState("tracks");
  const [browse, setBrowse] = useState(null);
  const [collection, setCollection] = useState(null);
  const [collectionLoading, setCollectionLoading] = useState(false);

  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState("off");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(() => Number(localStorage.getItem(LS_VOL) ?? 0.85));
  const [muted, setMuted] = useState(false);
  const [liked, setLiked] = useState(() => loadJson(LS_LIKED, []));
  const [recent, setRecent] = useState(() => loadJson(LS_RECENT, []));
  const [panel, setPanel] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [lyrics, setLyrics] = useState(null);
  const [lyricsStatus, setLyricsStatus] = useState("idle");
  const [ctxMenu, setCtxMenu] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem(LS_THEME) || "monochrome");
  const [buffering, setBuffering] = useState(false);
  const [genres, setGenres] = useState([]);
  const [genresLoading, setGenresLoading] = useState(false);
  const [genrePage, setGenrePage] = useState(null);
  const [genreLoading, setGenreLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [service, setService] = useState({ ok: true, label: "All sources operational" });
  const streamRetry = useRef(0);
  const genreProbe = useRef(0);

  const current = index >= 0 ? queue[index] : null;

  const toast = useCallback((message, icon) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, icon }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(LS_THEME, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(LS_LIKED, JSON.stringify(liked.slice(0, 400)));
  }, [liked]);
  useEffect(() => {
    localStorage.setItem(LS_RECENT, JSON.stringify(recent.slice(0, 80)));
  }, [recent]);
  useEffect(() => {
    localStorage.setItem(LS_VOL, String(volume));
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    browseHome()
      .then(setBrowse)
      .catch(() => setBrowse({ songs: [], albums: [], artists: [], picks: [] }));
  }, []);

  useEffect(() => {
    probeHealth().then((ok) =>
      setService({
        ok,
        label: ok ? "All sources operational" : "Offline catalogue — backend unreachable",
      })
    );
  }, []);

  // live search — the results feed both the header dropdown and the results page
  useEffect(() => {
    if (view === "browse" || view === "genre") return undefined;
    const t = setTimeout(() => {
      const q = query.trim();
      if (!q) {
        setResults(null);
        setSearching(false);
        return;
      }
      setSearching(true);
      searchCatalog(q)
        .then((r) => {
          setResults(r);
        })
        .catch(() => setResults({ tracks: [], albums: [], artists: [], playlists: [] }))
        .finally(() => setSearching(false));
    }, 280);
    return () => clearTimeout(t);
  }, [query, view]);

  const isLiked = useCallback((t) => liked.some((x) => trackKey(x) === trackKey(t)), [liked]);

  const toggleLike = useCallback(
    (t) => {
      if (!t) return;
      const wasLiked = liked.some((x) => trackKey(x) === trackKey(t));
      setLiked((prev) => {
        const k = trackKey(t);
        if (prev.some((x) => trackKey(x) === k)) return prev.filter((x) => trackKey(x) !== k);
        return [t, ...prev];
      });
      toast(wasLiked ? "Removed from your library" : "Added to your library", <HeartIcon filled={!wasLiked} size={15} />);
    },
    [liked, toast]
  );

  const pushRecent = useCallback((t) => {
    setRecent((prev) => [t, ...prev.filter((x) => trackKey(x) !== trackKey(t))].slice(0, 80));
  }, []);

  const playAt = useCallback(
    (list, i) => {
      setQueue(list);
      setIndex(i);
      setPlaying(true);
      const t = list[i];
      if (t) {
        pushRecent(t);
        prefetch(list[i + 1]);
      }
    },
    [pushRecent]
  );

  const playTrack = useCallback(
    (track, list) => {
      const src = list && list.length ? list : [track];
      const i = Math.max(0, src.findIndex((x) => trackKey(x) === trackKey(track)));
      playAt(src, i);
    },
    [playAt]
  );

  const addToQueue = (track) => {
    setQueue((q) => (q.length ? [...q, track] : [track]));
    if (index < 0) {
      setIndex(0);
      setPlaying(true);
    }
    toast("Added to queue", <QueueIcon size={15} />);
  };

  const playNext = (track) => {
    setQueue((q) => {
      if (!q.length) {
        setIndex(0);
        setPlaying(true);
        return [track];
      }
      const next = [...q];
      next.splice(index + 1, 0, track);
      return next;
    });
    toast("Playing next", <NextIcon size={15} />);
  };

  const skip = useCallback(
    (dir) => {
      if (!queue.length) return;
      if (dir < 0 && currentTime > 3) {
        if (audioRef.current) audioRef.current.currentTime = 0;
        return;
      }
      setIndex((i) => {
        if (shuffle && queue.length > 1) {
          let n = i;
          while (n === i) n = Math.floor(Math.random() * queue.length);
          return n;
        }
        const n = i + dir;
        if (n < 0) return repeat === "all" ? queue.length - 1 : 0;
        if (n >= queue.length) return repeat === "all" ? 0 : i;
        return n;
      });
      setPlaying(true);
    },
    [queue, shuffle, repeat, currentTime]
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    const url = streamUrl(current);
    if (audio.src !== new URL(url, window.location.href).href) {
      audio.src = url;
      setBuffering(true);
    }
    audio.volume = muted ? 0 : volume;
    const p = audio.play();
    if (p) p.catch(() => setPlaying(false));
    setLyrics(null);
    setLyricsStatus("loading");
    fetchLyrics(current)
      .then((l) => {
        setLyrics(l);
        setLyricsStatus(l ? "ok" : "empty");
      })
      .catch(() => setLyricsStatus("empty"));
    prefetch(queue[index + 1]);
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.author,
        album: current.album || "",
        artwork: current.artwork ? [{ src: coverUrl(current.artwork), sizes: "512x512" }] : [],
      });
      navigator.mediaSession.setActionHandler("play", () => {
        setPlaying(true);
        audio.play();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        setPlaying(false);
        audio.pause();
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => skip(-1));
      navigator.mediaSession.setActionHandler("nexttrack", () => skip(1));
    }
  }, [current && trackKey(current)]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.play().catch(() => {});
    else audio.pause();
  }, [playing]);

  const onEnded = () => {
    if (repeat === "one") {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }
    if (index < queue.length - 1 || repeat === "all") skip(1);
    else setPlaying(false);
  };

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if (e.key === "Escape") {
        setPanel(null);
        setFullscreen(false);
        setCtxMenu(null);
        setSearchOpen(false);
        return;
      }
      if (!typing && (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"))) {
        e.preventDefault();
        setSearchOpen(true);
        searchRef.current?.focus();
        return;
      }
      if (typing) return;
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowRight" && e.shiftKey) skip(1);
      else if (e.key === "ArrowLeft" && e.shiftKey) skip(-1);
      else if (e.key === "ArrowRight") {
        if (audioRef.current) audioRef.current.currentTime += 10;
      } else if (e.key === "ArrowLeft") {
        if (audioRef.current) audioRef.current.currentTime -= 10;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setVolume((v) => Math.min(1, v + 0.05));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setVolume((v) => Math.max(0, v - 0.05));
      } else if (e.key.toLowerCase() === "m") setMuted((m) => !m);
      else if (e.key.toLowerCase() === "s") setShuffle((s) => !s);
      else if (e.key.toLowerCase() === "r")
        setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));
      else if (e.key.toLowerCase() === "q") setPanel((p) => (p === "queue" ? null : "queue"));
      else if (e.key.toLowerCase() === "l") setPanel((p) => (p === "lyrics" ? null : "lyrics"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [skip]);

  const openCollection = async (item) => {
    if (!item?.url) return;
    setCollectionLoading(true);
    setView("collection");
    setCollection({ info: item, tracks: [] });
    try {
      const data = await loadCollection(item.url);
      setCollection(data);
    } catch {
      /* keep header */
    } finally {
      setCollectionLoading(false);
    }
  };

  const lrc = useMemo(() => parseLrc(lyrics?.syncedLyrics || ""), [lyrics]);
  const lyricIndex = useMemo(() => {
    if (!lrc.length) return -1;
    let i = 0;
    for (let n = 0; n < lrc.length; n++) if (lrc[n].t <= currentTime + 0.15) i = n;
    return i;
  }, [lrc, currentTime]);

  useEffect(() => {
    if (panel !== "lyrics") return;
    let raf = 0;
    const align = () => {
      const track = lyricsRef.current;
      if (!track) return;
      const active = track.querySelector("[data-active='1']");
      const view = track.parentElement;
      if (!active || !view) return;
      // `.lyrics-track` is the offset parent, so `offsetTop` is measured from
      // the top of the track. Shift it so the active line sits at the focus
      // point (a fraction of the viewport height, set in CSS) — that keeps it
      // and the lines around it in frame.
      const focus = parseFloat(getComputedStyle(view).getPropertyValue("--lyric-focus")) || 0.4;
      const y = active.offsetTop - view.clientHeight * focus;
      track.style.transform = `translate3d(0, ${-y}px, 0)`;
    };
    raf = requestAnimationFrame(() => {
      align();
      raf = requestAnimationFrame(align);
    });
    return () => cancelAnimationFrame(raf);
  }, [lyricIndex, panel, lrc.length, lyricsStatus]);

  useEffect(() => {
    if (!fullscreen || !audioRef.current) return;
    try {
      if (!analyserRef.current) {
        const ctx = new AudioContext();
        const src = ctx.createMediaElementSource(audioRef.current);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analyser.connect(ctx.destination);
        analyserRef.current = { ctx, analyser };
      }
      analyserRef.current.ctx.resume();
      const analyser = analyserRef.current.analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        rafRef.current = requestAnimationFrame(draw);
        const c = canvasRef.current;
        if (!c) return;
        const g = c.getContext("2d");
        const w = (c.width = c.clientWidth * devicePixelRatio);
        const h = (c.height = c.clientHeight * devicePixelRatio);
        analyser.getByteFrequencyData(data);
        g.clearRect(0, 0, w, h);
        const bars = 48;
        const step = Math.floor(data.length / bars);
        const bw = w / bars;
        g.fillStyle = "#ffcf97";
        for (let i = 0; i < bars; i++) {
          const v = data[i * step] / 255;
          const bh = v * h;
          g.globalAlpha = 0.35 + v * 0.65;
          g.fillRect(i * bw + 1, h - bh, bw - 2, bh);
        }
      };
      draw();
      return () => cancelAnimationFrame(rafRef.current);
    } catch {
      /* visualizer optional */
    }
  }, [fullscreen]);

  const goHome = () => {
    setView("home");
    setPanel(null);
  };

  const openBrowse = () => {
    setView("browse");
    setGenrePage(null);
    setQuery("");
    setGenres([]);
    setGenresLoading(true);
    const token = ++genreProbe.current;
    const queue = [...GENRES];
    const workers = Array.from({ length: 6 }, async () => {
      while (queue.length) {
        if (genreProbe.current !== token) return;
        const g = queue.shift();
        try {
          const d = await loadGenreMeta(g.id);
          if (genreProbe.current !== token) return;
          if (d?.ok && d.genre && (d.genre.trackCount || 0) > 0) {
            setGenres((prev) => (prev.some((x) => x.id === d.genre.id) ? prev : [...prev, d.genre]));
          }
        } catch {
          /* skip */
        }
      }
    });
    Promise.all(workers).then(() => {
      if (genreProbe.current === token) setGenresLoading(false);
    });
  };

  const openGenre = (g) => {
    setView("genre");
    setGenrePage({ info: g, tracks: [] });
    setGenreLoading(true);
    loadGenre(g.id)
      .then((d) => setGenrePage({ info: d.genre || g, tracks: d.tracks || [] }))
      .catch(() => setGenrePage({ info: g, tracks: [] }))
      .finally(() => setGenreLoading(false));
  };

  const openGenreById = useCallback(
    (id) => {
      const g = GENRES.find((x) => x.id === id);
      if (g) openGenre(g);
    },
    []
  );

  const onNav = (id) => {
    if (id === "browse") {
      openBrowse();
      return;
    }
    if (id === "home") {
      goHome();
      return;
    }
    setView(id);
    setPanel(null);
  };

  const runSearch = () => {
    if (!query.trim()) return;
    setView("search");
    setSearchOpen(false);
  };

  const onSurprise = () => {
    const pool = browse?.songs?.length ? browse.songs : results?.tracks?.length ? results.tracks : [];
    if (!pool.length) {
      toast("Nothing to shuffle yet", <SparklesIcon size={15} />);
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    playTrack(pick, pool);
    toast(`Playing ${pick.title}`, <ShuffleIcon size={15} />);
  };

  const suggestions = useMemo(() => {
    if (!results) return [];
    const out = [];
    (results.tracks || []).slice(0, 5).forEach((t) =>
      out.push({ key: `t:${t.id}`, title: t.title, meta: `Song · ${t.author}`, art: t.artwork, track: t })
    );
    (results.albums || []).slice(0, 3).forEach((a) =>
      out.push({ key: `a:${a.url}`, title: a.name, meta: `Album · ${a.author}`, art: a.artwork, collection: a })
    );
    (results.artists || []).slice(0, 3).forEach((a) =>
      out.push({ key: `r:${a.url}`, title: a.author || a.name, meta: "Artist", art: a.artwork, collection: a })
    );
    return out.slice(0, 8);
  }, [results]);

  const onSuggestion = (s) => {
    setSearchOpen(false);
    if (s.track) {
      playTrack(s.track, results?.tracks || [s.track]);
      return;
    }
    if (s.collection) openCollection(s.collection);
  };

  const heroItems = useHeroItems(browse);

  const onHeroPlay = (it) => {
    const tracks = it.item?.tracks?.length ? it.item.tracks : browse?.songs || [];
    if (tracks.length) playTrack(tracks[0], tracks);
    else toast("No tracks loaded yet", <DiscIcon size={15} />);
  };

  const onHeroShuffle = (it) => {
    const tracks = it.item?.tracks?.length ? it.item.tracks : browse?.songs || [];
    if (!tracks.length) return;
    const shuffled = shuffleCopy(tracks);
    playTrack(shuffled[0], shuffled);
  };

  return (
    <div className={cls("app", panel === "lyrics" && "lyrics-open")} onClick={() => ctxMenu && setCtxMenu(null)}>
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onTimeUpdate={() => {
          const a = audioRef.current;
          setCurrentTime(a.currentTime);
          setDuration(a.duration || (current?.duration || 0) / 1000);
          try {
            if (a.buffered && a.buffered.length) setBuffered(a.buffered.end(a.buffered.length - 1));
          } catch {
            /* ignore */
          }
        }}
        onLoadedMetadata={() => setDuration(audioRef.current.duration || 0)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => {
          setBuffering(false);
          setPlaying(true);
        }}
        onEnded={onEnded}
        onError={() => {
          setBuffering(false);
          const audio = audioRef.current;
          if (!audio || !current || streamRetry.current >= 3) return;
          streamRetry.current += 1;
          audio.src = `${streamUrl(current)}&retry=${streamRetry.current}&t=${Date.now()}`;
          audio.play().catch(() => setPlaying(false));
        }}
      />

      <Header
        nav="header"
        active={NAV_ACTIVE[view] || view}
        onNav={onNav}
        query={query}
        onQuery={setQuery}
        onSubmit={runSearch}
        suggestions={suggestions}
        searching={searching}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        searchRef={searchRef}
        onSurprise={onSurprise}
      />

      <main id="view" className="view" tabIndex={-1}>
        {view === "home" && (
          <Home
            browse={browse}
            recent={recent}
            heroItems={heroItems}
            query={query}
            onQuery={setQuery}
            onSearch={runSearch}
            onBrowse={openBrowse}
            onGoRecent={() => setView("recent")}
            onHeroPlay={onHeroPlay}
            onHeroShuffle={onHeroShuffle}
            onPlayTrack={playTrack}
            onOpen={openCollection}
            onMore={onContext}
            isLiked={isLiked}
            onLike={toggleLike}
            online={service.ok}
            current={current}
            playing={playing}
          />
        )}

        {view === "search" && (
          <div className="wrap">
            <SearchPage
              query={query}
              searching={searching}
              results={results}
              tab={searchTab}
              setTab={setSearchTab}
              onPlayTrack={playTrack}
              onOpen={openCollection}
              onMore={onContext}
              current={current}
              playing={playing}
              isLiked={isLiked}
              onLike={toggleLike}
            />
          </div>
        )}

        {view === "library" && (
          <div className="wrap">
            <PageHead
              title="Library"
              sub={
                liked.length
                  ? `${liked.length} song${liked.length === 1 ? "" : "s"} saved on this device.`
                  : "Like songs while you listen — they’ll land here."
              }
            />
            {liked.length ? (
              <TrackList
                tracks={liked}
                current={current}
                playing={playing}
                onPlay={playTrack}
                onLike={toggleLike}
                isLiked={isLiked}
                onMore={onContext}
              />
            ) : (
              <Empty
                icon={<HeartIcon size={34} />}
                title="Nothing saved yet"
                message="Tap the heart on any song to keep it here for later."
              />
            )}
          </div>
        )}

        {view === "recent" && (
          <div className="wrap">
            <PageHead
              title="Recently played"
              sub={recent.length ? `${recent.length} track${recent.length === 1 ? "" : "s"} in your history.` : undefined}
            />
            {recent.length ? (
              <TrackList
                tracks={recent}
                current={current}
                playing={playing}
                onPlay={playTrack}
                onLike={toggleLike}
                isLiked={isLiked}
                onMore={onContext}
              />
            ) : (
              <Empty
                icon={<HistoryIcon size={34} />}
                title="No history yet"
                message="Search for a song to get started."
              />
            )}
          </div>
        )}

        {view === "collection" && collection && (
          <div className="wrap">
            <CollectionPage
              data={collection}
              loading={collectionLoading}
              current={current}
              playing={playing}
              onPlay={playTrack}
              onLike={toggleLike}
              isLiked={isLiked}
              onMore={onContext}
              onBack={() => setView("search")}
            />
          </div>
        )}

        {view === "browse" && (
          <div className="wrap">
            <BrowsePage genres={genres} loading={genresLoading} onOpen={openGenre} />
          </div>
        )}

        {view === "genre" && genrePage && (
          <div className="wrap">
            <GenrePage
              data={genrePage}
              loading={genreLoading}
              filter={query}
              current={current}
              playing={playing}
              onPlay={playTrack}
              onLike={toggleLike}
              isLiked={isLiked}
              onMore={onContext}
              onBack={openBrowse}
            />
          </div>
        )}

        {view === "settings" && (
          <div className="wrap">
            <Settings theme={theme} setTheme={setTheme} online={isOnline()} probed={hasProbed()} />
          </div>
        )}
      </main>

      <Footer onNav={onNav} onGenre={openGenreById} status={service} />

      <footer className="player">
        <div className="player__now">
          {current?.artwork ? (
            <div className="player__art" onClick={() => setFullscreen(true)} role="button" tabIndex={0}>
              <Art src={current.artwork} alt="" />
            </div>
          ) : (
            <div className="player__art" onClick={() => current && setFullscreen(true)} role="button" tabIndex={0}>
              <div className="ph">
                <MusicNoteIcon size={18} />
              </div>
            </div>
          )}
          <div className="player__txt">
            <div className="player__title">{current?.title || "Nothing playing"}</div>
            <div className="player__artist">{current?.author || "Search to start listening"}</div>
          </div>
          {current && (
            <button
              className={cls("icon-btn", isLiked(current) && "on")}
              onClick={() => toggleLike(current)}
              aria-label={isLiked(current) ? "Unlike" : "Like"}
            >
              <HeartIcon filled={isLiked(current)} size={17} />
            </button>
          )}
        </div>

        <div className="player__center">
          <div className="ctrl-row">
            <button
              className={cls("icon-btn", shuffle && "on")}
              onClick={() => setShuffle((s) => !s)}
              title="Shuffle"
              aria-label="Shuffle"
            >
              <ShuffleIcon size={17} />
            </button>
            <button className="icon-btn" onClick={() => skip(-1)} title="Previous" aria-label="Previous">
              <PrevIcon size={19} />
            </button>
            <button className="play-main" onClick={() => current && setPlaying((p) => !p)} title="Play/Pause" aria-label="Play or pause">
              {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
            </button>
            <button className="icon-btn" onClick={() => skip(1)} title="Next" aria-label="Next">
              <NextIcon size={19} />
            </button>
            <button
              className={cls("icon-btn", repeat !== "off" && "on")}
              onClick={() => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"))}
              title="Repeat"
              aria-label="Repeat"
            >
              <RepeatIcon size={17} one={repeat === "one"} />
            </button>
          </div>
          <Timeline
            value={currentTime}
            max={duration || 0}
            buffered={buffered}
            onSeek={(v) => {
              if (audioRef.current) audioRef.current.currentTime = v;
              setCurrentTime(v);
            }}
          />
          <div className="player__times">
            <span>{formatTime(currentTime)}</span>
            <span className="total">/ {formatTime(duration)}</span>
          </div>
        </div>

        <div className="player__right">
          {buffering ? <span className="spinner" style={{ width: 16, height: 16, margin: 0, borderWidth: 2 }} /> : null}
          <button
            className={cls("icon-btn", panel === "lyrics" && "on")}
            onClick={() => setPanel(panel === "lyrics" ? null : "lyrics")}
            title="Lyrics"
            aria-label="Lyrics"
          >
            <MicIcon size={17} />
          </button>
          <button
            className={cls("icon-btn", panel === "queue" && "on")}
            onClick={() => setPanel(panel === "queue" ? null : "queue")}
            title="Queue"
            aria-label="Queue"
          >
            <QueueIcon size={17} />
          </button>
          <button className="icon-btn" onClick={() => current && setFullscreen(true)} title="Fullscreen" aria-label="Fullscreen">
            <ExpandIcon size={17} />
          </button>
          <div className="volume">
            <button className="icon-btn" onClick={() => setMuted((m) => !m)} aria-label="Mute">
              <VolumeIcon size={17} level={muted ? 0 : volume} />
            </button>
            <div className="volume__slider">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  setMuted(false);
                  setVolume(Number(e.target.value));
                }}
                aria-label="Volume"
              />
            </div>
          </div>
        </div>
      </footer>

      {panel === "lyrics" && (
        <aside className="lyrics-stage" aria-label="Lyrics">
          <div
            className="lyrics-bg"
            style={{ backgroundImage: current?.artwork ? `url(${coverUrl(current.artwork)})` : "none" }}
          />
          <div className="lyrics-veil" />
          <button className="icon-btn lyrics-close" onClick={() => setPanel(null)} aria-label="Close lyrics">
            <CloseIcon size={17} />
          </button>

          <div className="lyrics-panel">
            <div className="lyrics-side">
              <div className="lyrics-art">
                <Art src={current?.artwork} alt="" />
              </div>
              <div className="lyrics-meta">
                <div className="eyebrow">Now playing</div>
                <h2 className="lyrics-title">{current?.title || "Nothing playing"}</h2>
                <p className="lyrics-artist">
                  {current?.author || "Search to start listening"}
                  {current?.album ? <span className="lyrics-album">{current.album}</span> : null}
                </p>
              </div>
              {current && (
                <div className="lyrics-progress">
                  <Timeline
                    value={currentTime}
                    max={duration || 0}
                    buffered={buffered}
                    onSeek={(v) => {
                      if (audioRef.current) audioRef.current.currentTime = v;
                      setCurrentTime(v);
                    }}
                  />
                  <div className="lyrics-times">
                    <span>{formatTime(currentTime)}</span>
                    <span className="total">/ {formatTime(duration)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="lyrics-viewport">
              {!current && <Empty icon={<MicIcon size={34} />} message="Play a song to see lyrics." />}
              {current && lyricsStatus === "loading" && (
                <Empty icon={<EqualizerIcon size={34} />} message="Fetching lyrics…" />
              )}
              {current && lyricsStatus === "empty" && (
                <Empty icon={<MicIcon size={34} />} message="No lyrics found for this track." />
              )}
              {lyrics?.instrumental && <Empty icon={<WaveIcon size={34} />} message="Instrumental" />}
              {lrc.length > 0 && (
                <div className="lyrics-track" ref={lyricsRef}>
                  {lrc.map((line, i) => {
                    const dist = i - lyricIndex;
                    const kind = dist === 0 ? "on" : dist < 0 ? "past" : `next n${Math.min(dist, 6)}`;
                    return (
                      <button
                        type="button"
                        key={i}
                        data-active={dist === 0 ? "1" : "0"}
                        className={`lyric-line ${kind}`}
                        onClick={() => {
                          if (audioRef.current) audioRef.current.currentTime = line.t;
                        }}
                      >
                        {line.text || "♪"}
                      </button>
                    );
                  })}
                </div>
              )}
              {!lrc.length && lyrics?.plainLyrics && (
                <div className="lyrics-track lyrics-plain">{lyrics.plainLyrics}</div>
              )}
            </div>
          </div>
        </aside>
      )}

      {panel === "queue" && (
        <aside className="drawer" aria-label="Queue">
          <header>
            <h3>Queue</h3>
            <button className="icon-btn" onClick={() => setPanel(null)} aria-label="Close queue">
              <CloseIcon size={17} />
            </button>
          </header>
          <div className="body">
            {queue.length ? (
              <TrackList
                tracks={queue}
                current={current}
                playing={playing}
                onPlay={(t, list) => playTrack(t, list)}
                onLike={toggleLike}
                isLiked={isLiked}
                onMore={onContext}
              />
            ) : (
              <Empty icon={<QueueIcon size={34} />} message="Queue is empty." />
            )}
          </div>
        </aside>
      )}

      {fullscreen && current && (
        <div className="fs" onClick={() => setFullscreen(false)}>
          <div className="bg" style={{ backgroundImage: current.artwork ? `url(${coverUrl(current.artwork)})` : "none" }} />
          <div className="inner" onClick={(e) => e.stopPropagation()}>
            <button className="icon-btn" style={{ alignSelf: "flex-end" }} onClick={() => setFullscreen(false)} aria-label="Close">
              <CloseIcon size={17} />
            </button>
            <div className="art">
              <Art src={current.artwork} alt="" />
            </div>
            <h2>{current.title}</h2>
            <p>{current.author}</p>
            <canvas ref={canvasRef} />
            <div className="ctrl-row">
              <button className="icon-btn" onClick={() => skip(-1)} aria-label="Previous">
                <PrevIcon size={19} />
              </button>
              <button className="play-main" onClick={() => setPlaying((p) => !p)} aria-label="Play or pause">
                {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
              </button>
              <button className="icon-btn" onClick={() => skip(1)} aria-label="Next">
                <NextIcon size={19} />
              </button>
            </div>
            <Timeline
              value={currentTime}
              max={duration || 0}
              buffered={buffered}
              onSeek={(v) => {
                if (audioRef.current) audioRef.current.currentTime = v;
                setCurrentTime(v);
              }}
            />
          </div>
        </div>
      )}

      {ctxMenu && (
        <div className="ctx" style={{ left: ctxMenu.x, top: ctxMenu.y }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { playTrack(ctxMenu.track, ctxMenu.list); setCtxMenu(null); }}>Play</button>
          <button onClick={() => { playNext(ctxMenu.track); setCtxMenu(null); }}>Play next</button>
          <button onClick={() => { addToQueue(ctxMenu.track); setCtxMenu(null); }}>Add to queue</button>
          <button onClick={() => { toggleLike(ctxMenu.track); setCtxMenu(null); }}>
            {isLiked(ctxMenu.track) ? "Unlike" : "Like"}
          </button>
          {ctxMenu.track.albumUrl && (
            <button onClick={() => { openCollection({ url: ctxMenu.track.albumUrl, name: ctxMenu.track.album, type: "album" }); setCtxMenu(null); }}>
              Go to album
            </button>
          )}
          {ctxMenu.track.artistUrl && (
            <button onClick={() => { openCollection({ url: ctxMenu.track.artistUrl, name: ctxMenu.track.author, type: "artist" }); setCtxMenu(null); }}>
              Go to artist
            </button>
          )}
        </div>
      )}

      <Toasts items={toasts} />
    </div>
  );

  function onContext(track, x, y, list) {
    const source = list && list.length ? list : queue.length ? queue : [track];
    setCtxMenu({ x: Math.min(x, window.innerWidth - 210), y: Math.min(y, window.innerHeight - 220), track, list: source });
  }
}

/* -------------------------------------------------------------------- home */

function Home({
  browse,
  recent,
  heroItems,
  query,
  onQuery,
  onSearch,
  onBrowse,
  onGoRecent,
  onHeroPlay,
  onHeroShuffle,
  onPlayTrack,
  onOpen,
  onMore,
  isLiked,
  onLike,
  online,
  current,
  playing,
}) {
  if (!browse) {
    return (
      <div className="wrap">
        <div className="sk" style={{ height: "clamp(300px,36vw,420px)", borderRadius: 22, marginTop: 18 }} />
        <SkeletonRow count={8} />
      </div>
    );
  }

  const songs = browse.songs || [];
  const albums = browse.albums || [];
  const artists = browse.artists || [];
  const picks = browse.picks || [];

  return (
    <>
      <div className="wrap">
        <Hero
          items={heroItems}
          onOpen={(it) => onOpen(it.item)}
          onPlay={onHeroPlay}
          onShuffle={onHeroShuffle}
        />
      </div>

      <SearchStrip value={query} onChange={onQuery} onSubmit={onSearch} onBrowse={onBrowse} />

      <div className="wrap">
        {!online && (
          <div style={{ paddingTop: 18 }}>
            <SourceNote
              title="Offline catalogue"
              message="The Lavalink backend isn't reachable, so you're browsing the bundled catalogue. Playback and live synced lyrics return as soon as the server is connected."
            />
          </div>
        )}

        {recent.length > 0 && (
          <Row
            title="Jump back in"
            subtitle="Pick up exactly where you left off"
            icon={<HistoryIcon size={16} />}
            cta="Recent"
            onCta={onGoRecent}
          >
            {recent.slice(0, 14).map((t) => (
              <PosterCard
                key={trackKey(t)}
                item={{ name: t.title, author: t.author, artwork: t.artwork, meta: t.album }}
                onOpen={() => onPlayTrack(t, recent)}
                onPlay={() => onPlayTrack(t, recent)}
                badge={{ text: "RECENT", className: "badge--live" }}
              />
            ))}
          </Row>
        )}

        {picks.length > 0 && (
          <Row
            title="Editor's picks"
            subtitle="Albums chosen for this week"
            icon={<SparklesIcon size={16} />}
            cta="Browse"
            onCta={onBrowse}
          >
            {picks.map((a) => (
              <PosterCard
                key={a.url}
                item={{ name: a.name, author: a.author, artwork: a.artwork, meta: a.totalTracks ? `${a.totalTracks} tracks` : "" }}
                onOpen={() => onOpen(a)}
                onPlay={() => a.tracks?.[0] && onPlayTrack(a.tracks[0], a.tracks)}
                badge={{ text: "PICK", className: "badge--brand" }}
              />
            ))}
          </Row>
        )}

        {songs.length > 0 && (
          <Row
            title="Top tracks"
            subtitle="The most-played right now"
            icon={<FlameIcon size={16} />}
            cta="Search"
            onCta={onSearch}
          >
            {songs.slice(0, 14).map((t, i) => (
              <PosterCard
                key={trackKey(t)}
                ranked
                rank={i + 1}
                item={{ name: t.title, author: t.author, artwork: t.artwork, meta: t.album }}
                onOpen={() => onPlayTrack(t, songs)}
                onPlay={() => onPlayTrack(t, songs)}
              />
            ))}
          </Row>
        )}

        {songs.length > 0 && (
          <section className="section">
            <SectionHead
              title="Recommended songs"
              subtitle="Fresh tracks pulled from the catalogue"
              icon={<SparklesIcon size={16} />}
              cta="Search"
              onCta={onSearch}
            />
            <TrackList
              tracks={songs}
              limit={8}
              current={current}
              playing={playing}
              onPlay={onPlayTrack}
              onLike={onLike}
              isLiked={isLiked}
              onMore={onMore}
            />
          </section>
        )}

        {albums.length > 0 && (
          <Row
            title="Recommended albums"
            subtitle="Rotate through full records"
            icon={<DiscIcon size={16} />}
            cta="Browse"
            onCta={onBrowse}
          >
            {albums.map((a) => (
              <PosterCard
                key={a.url}
                item={{ name: a.name, author: a.author, artwork: a.artwork, meta: a.totalTracks ? `${a.totalTracks} tracks` : "" }}
                onOpen={() => onOpen(a)}
              />
            ))}
          </Row>
        )}

        {artists.length > 0 && (
          <Row
            title="Recommended artists"
            subtitle="Voices worth following"
            icon={<WaveIcon size={16} />}
            cta="Browse"
            onCta={onBrowse}
          >
            {artists.map((a) => (
              <ArtistCard key={a.url} item={{ author: a.author || a.name, artwork: a.artwork, url: a.url }} onOpen={() => onOpen(a)} />
            ))}
          </Row>
        )}

        {songs.length > 0 && (
          <section className="section">
            <SectionHead
              title="Fresh from the catalogue"
              subtitle="Everything that just landed"
              icon={<StarIcon size={16} />}
              cta="Browse all"
              onCta={onBrowse}
            />
            <div className="release-grid">
              {songs.slice(0, 18).map((t) => (
                <ReleaseTile
                  key={trackKey(t)}
                  item={{ name: t.title, author: t.author, artwork: t.artwork, badge: t.album }}
                  onOpen={() => onPlayTrack(t, songs)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ search */

function SearchPage({
  query,
  searching,
  results,
  tab,
  setTab,
  onPlayTrack,
  onOpen,
  onMore,
  current,
  playing,
  isLiked,
  onLike,
}) {
  if (!query.trim()) return <Empty icon={<SearchIcon size={34} />} message="Search for songs, albums, and artists." />;
  if (searching && !results) return <Empty icon={<EqualizerIcon size={34} />} message="Searching…" />;

  const r = results || { tracks: [], albums: [], artists: [], playlists: [] };
  const tabs = [
    ["tracks", "Tracks", r.tracks.length],
    ["albums", "Albums", r.albums.length],
    ["artists", "Artists", r.artists.length],
    ["playlists", "Playlists", r.playlists.length],
  ];

  return (
    <>
      <PageHead title="Search results" sub={`${r.tracks.length + r.albums.length + r.artists.length + r.playlists.length} matches for “${query}”`} />
      <div className="tabs">
        {tabs.map(([id, label, count]) => (
          <button key={id} className={cls("tab", tab === id && "is-active")} onClick={() => setTab(id)}>
            {label} <span className="count">{count}</span>
          </button>
        ))}
      </div>

      {tab === "tracks" &&
        (r.tracks.length ? (
          <TrackList
            tracks={r.tracks}
            current={current}
            playing={playing}
            onPlay={onPlayTrack}
            onLike={onLike}
            isLiked={isLiked}
            onMore={onMore}
          />
        ) : (
          <Empty icon={<MusicNoteIcon size={34} />} message="No tracks." />
        ))}

      {tab === "albums" &&
        (r.albums.length ? (
          <div className="grid">
            {r.albums.map((a) => (
              <PosterCard
                key={a.url}
                item={{ name: a.name, author: a.author, artwork: a.artwork }}
                onOpen={() => onOpen(a)}
              />
            ))}
          </div>
        ) : (
          <Empty icon={<DiscIcon size={34} />} message="No albums." />
        ))}

      {tab === "artists" &&
        (r.artists.length ? (
          <div className="grid">
            {r.artists.map((a) => (
              <ArtistCard key={a.url} item={{ author: a.author || a.name, artwork: a.artwork, url: a.url }} onOpen={() => onOpen(a)} />
            ))}
          </div>
        ) : (
          <Empty icon={<WaveIcon size={34} />} message="No artists." />
        ))}

      {tab === "playlists" &&
        (r.playlists.length ? (
          <div className="grid">
            {r.playlists.map((a) => (
              <PosterCard
                key={a.url}
                item={{ name: a.name || "Playlist", author: a.author, artwork: a.artwork }}
                onOpen={() => onOpen(a)}
              />
            ))}
          </div>
        ) : (
          <Empty icon={<LayersIcon size={34} />} message="No playlists." />
        ))}
    </>
  );
}

/* ------------------------------------------------------------------ browse */

function BrowsePage({ genres, loading, onOpen }) {
  return (
    <>
      <PageHead
        title="Browse all"
        sub={loading ? "Finding genres with songs…" : `${genres.length} genres with music available.`}
      />
      {loading && !genres.length && (
        <div className="grid">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="sk" style={{ aspectRatio: "1/1", borderRadius: 14 }} />
          ))}
        </div>
      )}
      {!loading && !genres.length && (
        <Empty icon={<GridIcon size={34} />} title="No genres available" message="The catalogue came back empty." />
      )}
      {genres.length > 0 && (
        <>
          <div className="genres" style={{ marginBottom: 18 }}>
            {genres.map((g) => (
              <button key={g.id} className="genre-chip" onClick={() => onOpen(g)}>
                {g.name}
              </button>
            ))}
          </div>
          <div className="grid">
            {genres.map((g) => (
              <PosterCard
                key={g.id}
                item={{ name: g.name, author: g.trackCount ? `${g.trackCount} songs` : "", artwork: g.artwork }}
                onOpen={() => onOpen(g)}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------- genre */

function GenrePage({ data, loading, filter, current, playing, onPlay, onLike, isLiked, onMore, onBack }) {
  const info = data.info || {};
  const q = String(filter || "").trim().toLowerCase();
  const tracks = (data.tracks || []).filter((t) => {
    if (!q) return true;
    return `${t.title} ${t.author} ${t.album || ""}`.toLowerCase().includes(q);
  });
  return (
    <>
      <div className="detail-hero">
        <div className="detail-hero__bg">
          {info.artwork ? <img src={coverUrl(info.artwork)} alt="" /> : null}
        </div>
        <div className="detail-grid">
          <div className="detail-poster">
            {info.artwork ? <Art src={info.artwork} alt={info.name} /> : <div className="ph" style={{ width: "100%", height: "100%" }} />}
          </div>
          <div>
            <button className="section__link" onClick={onBack} style={{ marginBottom: 10 }}>
              <BackIcon size={13} /> Back to browse
            </button>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Genre</div>
            <h1 className="detail-title">{info.name}</h1>
            <div className="detail-facts">
              <span className="chip chip--brand">
                <LayersIcon size={12} /> {tracks.length} song{tracks.length === 1 ? "" : "s"}
              </span>
              {info.query ? <span className="chip">{info.query}</span> : null}
            </div>
            <p className="detail-synopsis">
              A hand-picked shelf of {info.name?.toLowerCase()} favourites, resolved live from the
              catalogue and streamed in full quality with synced lyrics.
            </p>
            <div className="detail-actions">
              <button className="btn btn--primary" disabled={!tracks.length} onClick={() => tracks[0] && onPlay(tracks[0], tracks)}>
                <PlayIcon size={16} /> Play
              </button>
              <button className="btn btn--ghost" disabled={!tracks.length} onClick={() => tracks[0] && onPlay(tracks[0], shuffleCopy(tracks))}>
                <ShuffleIcon size={16} /> Shuffle play
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && <Empty icon={<EqualizerIcon size={34} />} message="Loading songs…" />}
      {!!tracks.length && (
        <TrackList
          tracks={tracks}
          current={current}
          playing={playing}
          onPlay={onPlay}
          onLike={onLike}
          isLiked={isLiked}
          onMore={onMore}
        />
      )}
      {!loading && !tracks.length && (
        <Empty
          icon={<MusicNoteIcon size={34} />}
          message={q ? "No songs in this genre match that filter." : "No songs found for this genre."}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------- collection */

function CollectionPage({ data, loading, current, playing, onPlay, onLike, isLiked, onMore, onBack }) {
  const info = data.info || {};
  const tracks = data.tracks || [];
  const total = info.totalTracks || tracks.length;

  return (
    <>
      <div className="detail-hero">
        <div className="detail-hero__bg">
          {info.artwork ? <img src={coverUrl(info.artwork)} alt="" /> : null}
        </div>
        <div className="detail-grid">
          <div className="detail-poster" style={info.type === "artist" ? { borderRadius: "50%" } : undefined}>
            {info.artwork ? <Art src={info.artwork} alt={info.name} /> : <div className="ph" style={{ width: "100%", height: "100%" }} />}
          </div>
          <div>
            <button className="section__link" onClick={onBack} style={{ marginBottom: 10 }}>
              <BackIcon size={13} /> Back to results
            </button>
            <div className="eyebrow" style={{ marginBottom: 6 }}>{info.type || "Collection"}</div>
            <h1 className="detail-title">{info.name || "Unknown"}</h1>
            <div className="detail-facts">
              {info.author ? <span className="chip chip--brand">{info.author}</span> : null}
              <span className="chip">
                <DiscIcon size={12} /> {total} track{total === 1 ? "" : "s"}
              </span>
            </div>
            <p className="detail-synopsis">
              Stream the complete {info.type || "collection"} in full quality — with live synced
              lyrics and gapless playback, resolved on the server so your browser stays fast.
            </p>
            <div className="detail-actions">
              <button className="btn btn--primary" disabled={!tracks.length} onClick={() => tracks[0] && onPlay(tracks[0], tracks)}>
                <PlayIcon size={16} /> Play
              </button>
              <button className="btn btn--ghost" disabled={!tracks.length} onClick={() => tracks[0] && onPlay(tracks[0], shuffleCopy(tracks))}>
                <ShuffleIcon size={16} /> Shuffle play
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && <Empty icon={<EqualizerIcon size={34} />} message="Loading tracks…" />}
      {!!tracks.length && (
        <TrackList
          tracks={tracks}
          current={current}
          playing={playing}
          onPlay={onPlay}
          onLike={onLike}
          isLiked={isLiked}
          onMore={onMore}
        />
      )}
      {!loading && !tracks.length && (
        <Empty icon={<MusicNoteIcon size={34} />} message="No tracks in this collection." />
      )}
    </>
  );
}

/* ---------------------------------------------------------------- settings */

function Settings({ theme, setTheme, online, probed }) {
  return (
    <>
      <PageHead title="Settings" sub="Tune the player to your taste." />
      <div className="settings">
        <div className="row">
          <div>
            <div className="k">Theme</div>
            <div className="d">Choose your preferred color scheme</div>
          </div>
          <div className="pill">
            <button className={theme === "monochrome" ? "on" : ""} onClick={() => setTheme("monochrome")}>
              Black
            </button>
            <button className={theme === "white" ? "on" : ""} onClick={() => setTheme("white")}>
              White
            </button>
          </div>
        </div>
        <div className="row">
          <div>
            <div className="k">Streaming</div>
            <div className="d">
              Full tracks are resolved server-side. Lavalink credentials never leave the server.
            </div>
          </div>
        </div>
        <div className="row">
          <div>
            <div className="k">Backend</div>
            <div className="d">
              {probed
                ? online
                  ? "Connected to the catalogue — searching and streaming are live."
                  : "Backend unreachable — the offline catalogue is being served instead."
                : "Checking the catalogue…"}
            </div>
          </div>
        </div>
        <div className="row">
          <div>
            <div className="k">Lyrics</div>
            <div className="d">Live synced lyrics provided by LRCLIB.</div>
          </div>
        </div>
        <div className="row">
          <div>
            <div className="k">Shortcuts</div>
            <div className="d">
              Space play/pause · ←/→ seek · Shift+←/→ skip · S shuffle · R repeat · L lyrics · Q queue · / search
            </div>
          </div>
        </div>
        <div className="row">
          <div>
            <div className="k">Credits</div>
            <div className="d">
              This web has been made by Ayle (@alyfinnn) By{" "}
              <a className="credit-link" href="https://discord.gg/aerox" target="_blank" rel="noreferrer">
                AeroX
              </a>
              .
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ helper */

function shuffleCopy(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
