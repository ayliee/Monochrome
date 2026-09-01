import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  browseHome,
  coverUrl,
  fetchLyrics,
  formatTime,
  loadCollection,
  parseLrc,
  prefetch,
  searchCatalog,
  streamUrl,
  trackKey,
} from "./api.js";
import {
  BackIcon,
  ClockIcon,
  CloseIcon,
  GearIcon,
  HeartIcon,
  HomeIcon,
  LibraryIcon,
  MicIcon,
  MoreIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  QueueIcon,
  RepeatIcon,
  SearchIcon,
  ShuffleIcon,
  VolumeIcon,
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

function Art({ src, alt, className, onClick }) {
  const url = src ? coverUrl(src) : "";
  if (!url) return <div className={className} onClick={onClick} />;
  return <img className={className} src={url} alt={alt || ""} onClick={onClick} draggable={false} />;
}

function NavButton({ id, current, onClick, children, label }) {
  return (
    <button className={`nav-btn ${current === id ? "active" : ""}`} onClick={() => onClick(id)} title={label} aria-label={label}>
      {children}
    </button>
  );
}

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

  const current = index >= 0 ? queue[index] : null;

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
          setView("search");
        })
        .catch(() => setResults({ tracks: [], albums: [], artists: [], playlists: [] }))
        .finally(() => setSearching(false));
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  const isLiked = useCallback((t) => liked.some((x) => trackKey(x) === trackKey(t)), [liked]);

  const toggleLike = useCallback((t) => {
    if (!t) return;
    setLiked((prev) => {
      const k = trackKey(t);
      if (prev.some((x) => trackKey(x) === k)) return prev.filter((x) => trackKey(x) !== k);
      return [t, ...prev];
    });
  }, []);

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
        return;
      }
      if (!typing && (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"))) {
        e.preventDefault();
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
      const y = active.offsetTop - view.clientHeight * 0.2;
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
        g.fillStyle = "#f5f5f5";
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

  return (
    <div className={`app ${panel === "lyrics" ? "lyrics-open" : ""}`} onClick={() => ctxMenu && setCtxMenu(null)}>
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onTimeUpdate={() => {
          const a = audioRef.current;
          setCurrentTime(a.currentTime);
          setDuration(a.duration || (current?.duration || 0) / 1000);
        }}
        onLoadedMetadata={() => setDuration(audioRef.current.duration || 0)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => {
          setBuffering(false);
          setPlaying(true);
        }}
        onEnded={onEnded}
        onError={() => setBuffering(false)}
      />

      <aside className="sidebar">
        <div className="brand" title="Monochrome">
          <img src="/logo.svg" alt="Monochrome" />
        </div>
        <NavButton id="home" current={view} onClick={goHome} label="Home">
          <HomeIcon />
        </NavButton>
        <NavButton id="search" current={view} onClick={setView} label="Search">
          <SearchIcon />
        </NavButton>
        <NavButton id="library" current={view} onClick={setView} label="Library">
          <LibraryIcon />
        </NavButton>
        <NavButton id="recent" current={view} onClick={setView} label="Recently played">
          <ClockIcon />
        </NavButton>
        <div className="spacer" />
        <NavButton id="settings" current={view} onClick={setView} label="Settings">
          <GearIcon />
        </NavButton>
      </aside>

      <main className="main">
        <div className="topbar">
          {view === "collection" && (
            <button className="icon-btn" onClick={() => setView("home")} aria-label="Back">
              <BackIcon />
            </button>
          )}
          <div className="search-wrap">
            <SearchIcon size={18} />
            <input
              ref={searchRef}
              placeholder="Search songs, albums, artists…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.trim() && setView("search")}
            />
          </div>
        </div>
        <div className="content">
          {view === "home" && (
            <Home
              browse={browse}
              recent={recent}
              onPlayTrack={playTrack}
              onOpen={openCollection}
              onContext={setCtxMenu}
            />
          )}
          {view === "search" && (
            <SearchPage
              query={query}
              searching={searching}
              results={results}
              tab={searchTab}
              setTab={setSearchTab}
              onPlayTrack={playTrack}
              onOpen={openCollection}
              onContext={setCtxMenu}
            />
          )}
          {view === "library" && (
            <>
              <h1 className="page-title">Library</h1>
              <p className="page-sub">Liked tracks saved on this device.</p>
              {liked.length ? (
                <TrackList
                  tracks={liked}
                  current={current}
                  playing={playing}
                  onPlay={playTrack}
                  onLike={toggleLike}
                  isLiked={isLiked}
                  onContext={setCtxMenu}
                />
              ) : (
                <div className="empty">Like songs while you listen — they’ll land here.</div>
              )}
            </>
          )}
          {view === "recent" && (
            <>
              <h1 className="page-title">Recently played</h1>
              {recent.length ? (
                <TrackList
                  tracks={recent}
                  current={current}
                  playing={playing}
                  onPlay={playTrack}
                  onLike={toggleLike}
                  isLiked={isLiked}
                  onContext={setCtxMenu}
                />
              ) : (
                <div className="empty">Nothing yet. Search for a song to get started.</div>
              )}
            </>
          )}
          {view === "collection" && collection && (
            <CollectionPage
              data={collection}
              loading={collectionLoading}
              current={current}
              playing={playing}
              onPlay={playTrack}
              onLike={toggleLike}
              isLiked={isLiked}
              onContext={setCtxMenu}
            />
          )}
          {view === "settings" && (
            <Settings theme={theme} setTheme={setTheme} />
          )}
        </div>
      </main>

      <footer className="player">
        <div className="now">
          {current?.artwork ? (
            <Art src={current.artwork} alt="" onClick={() => setFullscreen(true)} />
          ) : (
            <div className="ph" onClick={() => current && setFullscreen(true)}>
              <LibraryIcon size={18} />
            </div>
          )}
          <div className="txt">
            <div className="t">{current?.title || "Nothing playing"}</div>
            <div className="a">{current?.author || "Search to start listening"}</div>
          </div>
          {current && (
            <button className={`icon-btn ${isLiked(current) ? "on" : ""}`} onClick={() => toggleLike(current)}>
              <HeartIcon filled={isLiked(current)} size={18} />
            </button>
          )}
        </div>
        <div className="controls">
          <div className="ctrl-row">
            <button className={`icon-btn ${shuffle ? "on" : ""}`} onClick={() => setShuffle((s) => !s)} title="Shuffle">
              <ShuffleIcon size={18} />
            </button>
            <button className="icon-btn" onClick={() => skip(-1)} title="Previous">
              <PrevIcon size={20} />
            </button>
            <button className="play-main" onClick={() => current && setPlaying((p) => !p)} title="Play/Pause">
              {playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
            </button>
            <button className="icon-btn" onClick={() => skip(1)} title="Next">
              <NextIcon size={20} />
            </button>
            <button
              className={`icon-btn ${repeat !== "off" ? "on" : ""}`}
              onClick={() => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"))}
              title="Repeat"
            >
              <RepeatIcon size={18} one={repeat === "one"} />
            </button>
          </div>
          <div className="seek">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (audioRef.current) audioRef.current.currentTime = v;
                setCurrentTime(v);
              }}
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        <div className="extras">
          <button className={`icon-btn ${panel === "lyrics" ? "on" : ""}`} onClick={() => setPanel(panel === "lyrics" ? null : "lyrics")} title="Lyrics">
            <MicIcon size={18} />
          </button>
          <button className={`icon-btn ${panel === "queue" ? "on" : ""}`} onClick={() => setPanel(panel === "queue" ? null : "queue")} title="Queue">
            <QueueIcon size={18} />
          </button>
          <div className="vol">
            <button className="icon-btn" onClick={() => setMuted((m) => !m)}>
              <VolumeIcon size={18} level={muted ? 0 : volume} />
            </button>
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
            />
          </div>
        </div>
      </footer>

      <nav className="mobile-nav">
        <NavButton id="home" current={view} onClick={goHome} label="Home"><HomeIcon size={20} /></NavButton>
        <NavButton id="search" current={view} onClick={setView} label="Search"><SearchIcon size={20} /></NavButton>
        <NavButton id="library" current={view} onClick={setView} label="Library"><LibraryIcon size={20} /></NavButton>
        <NavButton id="recent" current={view} onClick={setView} label="Recent"><ClockIcon size={20} /></NavButton>
      </nav>

      {panel === "lyrics" && (
        <aside className="lyrics-stage" aria-label="Lyrics">
          <div
            className="lyrics-bg"
            style={{ backgroundImage: current?.artwork ? `url(${coverUrl(current.artwork)})` : "none" }}
          />
          <div className="lyrics-veil" />
          <button className="icon-btn lyrics-close" onClick={() => setPanel(null)} aria-label="Close lyrics">
            <CloseIcon />
          </button>
          <div className="lyrics-viewport">
            {!current && <div className="empty">Play a song to see lyrics.</div>}
            {current && lyricsStatus === "loading" && <div className="empty">Fetching lyrics…</div>}
            {current && lyricsStatus === "empty" && <div className="empty">No lyrics found for this track.</div>}
            {lyrics?.instrumental && <div className="empty">Instrumental</div>}
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
        </aside>
      )}

      {panel === "queue" && (
        <aside className="drawer">
          <header>
            <h3>Queue</h3>
            <button className="icon-btn" onClick={() => setPanel(null)}><CloseIcon /></button>
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
                onContext={setCtxMenu}
                dense
              />
            ) : (
              <div className="empty">Queue is empty.</div>
            )}
          </div>
        </aside>
      )}

      {fullscreen && current && (
        <div className="fs" onClick={() => setFullscreen(false)}>
          <div className="bg" style={{ backgroundImage: current.artwork ? `url(${coverUrl(current.artwork)})` : "none" }} />
          <div className="inner" onClick={(e) => e.stopPropagation()}>
            <button className="icon-btn" style={{ alignSelf: "flex-end" }} onClick={() => setFullscreen(false)}>
              <CloseIcon />
            </button>
            <div className="art"><Art src={current.artwork} alt="" /></div>
            <h2>{current.title}</h2>
            <p>{current.author}</p>
            <canvas ref={canvasRef} />
            <div className="ctrl-row">
              <button className="icon-btn" onClick={() => skip(-1)}><PrevIcon /></button>
              <button className="play-main" onClick={() => setPlaying((p) => !p)}>
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button className="icon-btn" onClick={() => skip(1)}><NextIcon /></button>
            </div>
            <div className="seek" style={{ width: "100%" }}>
              <span>{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={Math.min(currentTime, duration || 0)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (audioRef.current) audioRef.current.currentTime = v;
                  setCurrentTime(v);
                }}
              />
              <span>{formatTime(duration)}</span>
            </div>
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
    </div>
  );
}

function Home({ browse, recent, onPlayTrack, onOpen, onContext }) {
  if (!browse) {
    return (
      <>
        <div className="skel" style={{ height: 36, width: 280, margin: "12px 0 24px" }} />
        <div className="h-scroll">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card"><div className="skel" style={{ width: 168, height: 168 }} /></div>
          ))}
        </div>
      </>
    );
  }
  return (
    <>
      <h1 className="page-title">Welcome to Monochrome</h1>
      <p className="page-sub">
        {recent.length ? "Pick up where you left off, or find something new." : "You haven’t listened to anything yet. Search for your favorite songs to get started!"}
      </p>
      {recent.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>Jump Back In</h2></div>
          <div className="h-scroll">
            {recent.slice(0, 12).map((t) => (
              <MediaCard key={trackKey(t)} title={t.title} subtitle={t.author} art={t.artwork} onClick={() => onPlayTrack(t, recent)} onPlay={() => onPlayTrack(t, recent)} />
            ))}
          </div>
        </section>
      )}
      {browse.songs?.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>Recommended Songs</h2></div>
          <TrackList tracks={browse.songs} onPlay={onPlayTrack} onContext={onContext} compact />
        </section>
      )}
      {browse.picks?.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>Editor’s Picks</h2></div>
          <div className="h-scroll">
            {browse.picks.map((a) => (
              <MediaCard key={a.url} title={a.name} subtitle={a.author} art={a.artwork} onClick={() => onOpen(a)} onPlay={() => a.tracks?.[0] && onPlayTrack(a.tracks[0], a.tracks)} />
            ))}
          </div>
        </section>
      )}
      {browse.albums?.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>Recommended Albums</h2></div>
          <div className="h-scroll">
            {browse.albums.map((a) => (
              <MediaCard key={a.url} title={a.name} subtitle={a.author} art={a.artwork} onClick={() => onOpen(a)} />
            ))}
          </div>
        </section>
      )}
      {browse.artists?.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>Recommended Artists</h2></div>
          <div className="h-scroll">
            {browse.artists.map((a) => (
              <MediaCard key={a.url} title={a.author || a.name} subtitle="Artist" art={a.artwork} artist onClick={() => onOpen(a)} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function SearchPage({ query, searching, results, tab, setTab, onPlayTrack, onOpen, onContext }) {
  if (!query.trim()) return <div className="empty">Search for songs, albums, and artists.</div>;
  if (searching && !results) return <div className="empty">Searching…</div>;
  const r = results || { tracks: [], albums: [], artists: [], playlists: [] };
  const tabs = [
    ["tracks", `Tracks (${r.tracks.length})`],
    ["albums", `Albums (${r.albums.length})`],
    ["artists", `Artists (${r.artists.length})`],
    ["playlists", `Playlists (${r.playlists.length})`],
  ];
  return (
    <>
      <h1 className="page-title">Search Results</h1>
      <div className="tabs">
        {tabs.map(([id, label]) => (
          <button key={id} className={`tab ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === "tracks" && (
        r.tracks.length ? <TrackList tracks={r.tracks} onPlay={onPlayTrack} onContext={onContext} /> : <div className="empty">No tracks.</div>
      )}
      {tab === "albums" && (
        <div className="h-scroll" style={{ flexWrap: "wrap" }}>
          {r.albums.map((a) => (
            <MediaCard key={a.url} title={a.name} subtitle={a.author} art={a.artwork} onClick={() => onOpen(a)} />
          ))}
          {!r.albums.length && <div className="empty">No albums.</div>}
        </div>
      )}
      {tab === "artists" && (
        <div className="h-scroll" style={{ flexWrap: "wrap" }}>
          {r.artists.map((a) => (
            <MediaCard key={a.url} title={a.author || a.name} subtitle="Artist" art={a.artwork} artist onClick={() => onOpen(a)} />
          ))}
          {!r.artists.length && <div className="empty">No artists.</div>}
        </div>
      )}
      {tab === "playlists" && (
        <div className="h-scroll" style={{ flexWrap: "wrap" }}>
          {r.playlists.map((a) => (
            <MediaCard key={a.url} title={a.name || "Playlist"} subtitle={a.author} art={a.artwork} onClick={() => onOpen(a)} />
          ))}
          {!r.playlists.length && <div className="empty">No playlists.</div>}
        </div>
      )}
    </>
  );
}

function CollectionPage({ data, loading, current, playing, onPlay, onLike, isLiked, onContext }) {
  const info = data.info || {};
  const tracks = data.tracks || [];
  return (
    <>
      <div className="hero">
        <div className={`cover ${info.type === "artist" ? "circle" : ""}`}>
          <Art src={info.artwork} alt="" />
        </div>
        <div>
          <div className="kicker">{info.type || "Collection"}</div>
          <h1>{info.name}</h1>
          <p>
            {info.author}
            {info.totalTracks ? ` · ${info.totalTracks} tracks` : tracks.length ? ` · ${tracks.length} tracks` : ""}
          </p>
          <div className="row-actions">
            <button className="btn" disabled={!tracks.length} onClick={() => tracks[0] && onPlay(tracks[0], tracks)}>
              Play
            </button>
            <button className="btn ghost" disabled={!tracks.length} onClick={() => tracks[0] && onPlay(tracks[0], shuffleCopy(tracks))}>
              Shuffle play
            </button>
          </div>
        </div>
      </div>
      {loading && <div className="empty">Loading tracks…</div>}
      {!!tracks.length && (
        <TrackList tracks={tracks} current={current} playing={playing} onPlay={onPlay} onLike={onLike} isLiked={isLiked} onContext={onContext} />
      )}
    </>
  );
}

function shuffleCopy(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Settings({ theme, setTheme }) {
  return (
    <>
      <h1 className="page-title">Settings</h1>
      <div className="settings">
        <div className="row">
          <div>
            <div style={{ fontWeight: 600 }}>Theme</div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Choose your preferred color scheme</div>
          </div>
          <div className="pill">
            <button className={theme === "monochrome" ? "on" : ""} onClick={() => setTheme("monochrome")}>Black</button>
            <button className={theme === "white" ? "on" : ""} onClick={() => setTheme("white")}>White</button>
          </div>
        </div>
        <div className="row">
          <div>
            <div style={{ fontWeight: 600 }}>Streaming</div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
              Full tracks are resolved server-side. Lavalink credentials never leave the server.
            </div>
          </div>
        </div>
        <div className="row">
          <div>
            <div style={{ fontWeight: 600 }}>Lyrics</div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Live synced lyrics provided by LRCLIB.</div>
          </div>
        </div>
        <div className="row">
          <div>
            <div style={{ fontWeight: 600 }}>Shortcuts</div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
              Space play/pause · ←/→ seek · Shift+←/→ skip · S shuffle · R repeat · L lyrics · Q queue · / search
            </div>
          </div>
        </div>
        <div className="row">
          <div>
            <div style={{ fontWeight: 600 }}>Credits</div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 4, lineHeight: 1.55 }}>
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

function MediaCard({ title, subtitle, art, artist, onClick, onPlay }) {
  return (
    <div className={`card ${artist ? "artist" : ""}`} onClick={onClick}>
      <div className="art">
        <Art src={art} alt="" />
        {onPlay && (
          <button
            className="play"
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
          >
            <PlayIcon size={18} />
          </button>
        )}
      </div>
      <div className="meta">
        <div className="t">{title}</div>
        <div className="a">{subtitle}</div>
      </div>
    </div>
  );
}

function TrackList({ tracks, current, playing, onPlay, onLike, isLiked, onContext, compact }) {
  const show = compact ? tracks.slice(0, 8) : tracks;
  return (
    <div>
      {show.map((t, i) => {
        const active = current && trackKey(current) === trackKey(t);
        return (
          <div
            key={trackKey(t) + i}
            className={`track-row ${active ? "active" : ""}`}
            onDoubleClick={() => onPlay(t, tracks)}
            onContextMenu={(e) => {
              e.preventDefault();
              onContext?.({ x: e.clientX, y: e.clientY, track: t, list: tracks });
            }}
          >
            <div className="idx">{active && playing ? "♪" : i + 1}</div>
            <div className="art" onClick={() => onPlay(t, tracks)} style={{ cursor: "pointer" }}>
              <Art src={t.artwork} alt="" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="title">{t.title}</div>
              <div className="sub">{t.author}</div>
            </div>
            <div className="album">{t.album || ""}</div>
            <div className="dur">{formatTime(t.duration || 0, true)}</div>
            <button
              className={`icon-btn ${isLiked?.(t) ? "on" : ""}`}
              onClick={() => onLike?.(t)}
            >
              <HeartIcon filled={!!isLiked?.(t)} size={16} />
            </button>
            <button
              className="icon-btn more"
              onClick={(e) => {
                e.stopPropagation();
                onContext?.({ x: e.clientX, y: e.clientY, track: t, list: tracks });
              }}
            >
              <MoreIcon size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
