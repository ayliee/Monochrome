import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { coverUrl, formatTime } from "./api.js";
import {
  BoltIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DiscIcon,
  EqualizerIcon,
  ExternalIcon,
  FlameIcon,
  GridIcon,
  HeartIcon,
  HistoryIcon,
  LayersIcon,
  ListIcon,
  MicIcon,
  MusicNoteIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  QueueIcon,
  SearchIcon,
  ShuffleIcon,
  SparklesIcon,
  StarIcon,
  VolumeIcon,
  WaveIcon,
} from "./icons.jsx";

/* ------------------------------------------------------------------ helpers */

export function cls(...parts) {
  return parts.filter(Boolean).join(" ");
}

/** Cover art with a fade-in on load and a graceful placeholder. */
export function Art({ src, alt = "", className, onClick, round }) {
  const url = src ? coverUrl(src) : "";
  const [loaded, setLoaded] = useState(false);

  // A data-URI or cached image can be `complete` before React attaches onLoad,
  // so we also check the ref on mount rather than relying on the event alone.
  const ref = useRef(null);
  useEffect(() => {
    setLoaded(false);
    const el = ref.current;
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true);
  }, [url]);

  if (!url) {
    return (
      <div className={cls(className, "ph")} onClick={onClick}>
        <MusicNoteIcon size={20} />
      </div>
    );
  }
  return (
    <img
      ref={ref}
      className={cls(className, loaded && "is-loaded")}
      src={url}
      alt={alt}
      onClick={onClick}
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(true)}
      draggable={false}
    />
  );
}

/* ------------------------------------------------------------------- brand */

export function Brand({ footer, onClick }) {
  return (
    <button className={cls("brand", footer && "brand--footer")} onClick={onClick} aria-label="Monochrome home">
      <span className="brand__mark" aria-hidden="true">
        <svg viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="0.6" width="4" height="2" fill="currentColor" />
          <rect x="4.6" y="2.6" width="2" height="2" fill="currentColor" />
          <rect x="1" y="2.6" width="2" height="2" fill="currentColor" />
          <rect x="1" y="4.6" width="4" height="2" fill="currentColor" />
        </svg>
      </span>
      <span className="brand__text">
        Monochrome<span className="brand__dot">.</span>
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ header */

export function Header({
  nav,
  active,
  onNav,
  query,
  onQuery,
  onSubmit,
  suggestions,
  searching,
  searchOpen,
  setSearchOpen,
  searchRef,
  onSurprise,
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("nav-open", menuOpen);
    return () => document.body.classList.remove("nav-open");
  }, [menuOpen]);

  const items = [
    { id: "home", label: "Home" },
    { id: "browse", label: "Browse" },
    { id: "library", label: "Library" },
    { id: "recent", label: "Recent" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <header className={cls("header", scrolled && "is-scrolled", searching && "is-loading")} id="header">
      <div className="header__inner">
        <Brand onClick={() => onNav("home")} />

        <nav className="nav" id="nav" aria-label="Primary">
          {items.map((it) => (
            <button
              key={it.id}
              className={cls(active === it.id && "is-active")}
              onClick={() => {
                onNav(it.id);
                setMenuOpen(false);
              }}
            >
              {it.label}
            </button>
          ))}
        </nav>

        <div className="header__actions">
          <form
            className={cls("search", searchOpen && "is-open")}
            id="search-form"
            role="search"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            <SearchIcon size={15} className="search__icon" />
            <input
              ref={searchRef}
              className="search__input"
              id="search-input"
              name="q"
              type="search"
              placeholder="Search songs…"
              aria-label="Search songs"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
            />
            <kbd className="search__kbd">/</kbd>
            <div className="search__panel" id="search-panel" hidden={!searchOpen || !query.trim()}>
              <SearchPanel query={query} suggestions={suggestions} searching={searching} onPick={onSubmit} />
            </div>
          </form>

          <button className="icon-btn" id="random-btn" title="Surprise me" aria-label="Surprise me" onClick={onSurprise}>
            <ShuffleIcon size={17} />
          </button>
          <button
            className="icon-btn menu-btn"
            id="menu-btn"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <ListIcon size={17} />
          </button>
        </div>
      </div>
      <div className="header__progress" id="route-progress" />
    </header>
  );
}

function SearchPanel({ query, suggestions, searching, onPick }) {
  if (searching && !suggestions.length) {
    return <div className="search-empty">Searching…</div>;
  }
  if (!suggestions.length) {
    return <div className="search-empty">No matches for “{query}”</div>;
  }
  const total = suggestions.length;
  return (
    <>
      <div className="search-head">
        <span>Top results</span>
        <span>{total} result{total === 1 ? "" : "s"}</span>
      </div>
      {suggestions.map((s, i) => (
        <button key={s.key} className={cls("search-item", i === 0 && "is-focus")} onClick={onPick}>
          <Art src={s.art} alt="" />
          <div style={{ minWidth: 0 }}>
            <div className="search-item__title">{s.title}</div>
            <div className="search-item__meta">{s.meta}</div>
          </div>
        </button>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------- hero */

export function Hero({ items, onOpen, onPlay, onShuffle }) {
  const [index, setIndex] = useState(0);
  const timer = useRef(0);
  const count = items.length;

  const show = useCallback(
    (next) => {
      if (!count) return;
      setIndex((next + count) % count);
    },
    [count]
  );

  useEffect(() => {
    if (count < 2) return undefined;
    const start = () => {
      clearInterval(timer.current);
      timer.current = setInterval(() => setIndex((i) => (i + 1) % count), 7600);
    };
    start();
    return () => clearInterval(timer.current);
  }, [count]);

  if (!count) return null;
  const current = items[index] || items[0];

  return (
    <section className="hero fade-in" data-hero onMouseEnter={() => clearInterval(timer.current)}>
      <div className="hero__backdrop">
        {items.map((it, i) => (
          <img key={it.key} src={coverUrl(it.art)} alt="" className={cls(i === index && "is-active")} loading={i < 2 ? "eager" : "lazy"} />
        ))}
      </div>

      <div className="hero__inner">
        <div className="hero__slides">
          {items.map((it, i) => (
            <div className="hero__copy" key={it.key} hidden={i !== index}>
              <div className="hero__meta-row">
                <span className="chip chip--brand">
                  <SparklesIcon size={12} /> Featured
                </span>
                <span className="chip">
                  <DiscIcon size={12} /> {it.kind || "Album"}
                </span>
                {it.count ? (
                  <span className="chip chip--live">
                    <span className="chip__dot" /> {it.count} tracks
                  </span>
                ) : null}
              </div>
              <h1 className="hero__title">{it.title}</h1>
              <div className="hero__facts">
                <span>{it.author}</span>
                {it.meta ? (
                  <>
                    <span className="sep" />
                    <span>{it.meta}</span>
                  </>
                ) : null}
              </div>
              <p className="hero__synopsis">{it.synopsis}</p>
              <div className="hero__actions">
                <button className="btn btn--primary" onClick={() => onPlay(it)}>
                  <PlayIcon size={16} /> Play
                </button>
                <button className="btn btn--ghost" onClick={() => onShuffle(it)}>
                  <ShuffleIcon size={16} /> Shuffle
                </button>
                <button className="btn btn--icon btn--ghost" onClick={() => onOpen(it)} title="More info" aria-label="More info">
                  <ExternalIcon size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="hero__aside">
          <div className="hero__poster" onClick={() => onOpen(current)} role="button" tabIndex={0}>
            <Art src={current.art} alt={current.title} />
          </div>
        </div>
      </div>

      <div className="hero__dots">
        {items.map((_, i) => (
          <button
            key={i}
            className={cls("hero__dot", i === index && "is-active")}
            onClick={() => show(i)}
            aria-label={`Feature ${i + 1}`}
          />
        ))}
      </div>
      <div className="hero__thumbs">
        {items.map((it, i) => (
          <button
            key={it.key}
            className={cls("hero__thumb", i === index && "is-active")}
            onClick={() => show(i)}
            aria-label={it.title}
          >
            <Art src={it.art} alt="" />
          </button>
        ))}
      </div>
      <div className="hero__nav">
        <button className="hero__nav-btn" onClick={() => show(index - 1)} aria-label="Previous featured">
          <ChevronLeftIcon size={17} />
        </button>
        <button className="hero__nav-btn" onClick={() => show(index + 1)} aria-label="Next featured">
          <ChevronRightIcon size={17} />
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- search strip */

export function SearchStrip({ value, onChange, onSubmit, onBrowse }) {
  return (
    <div className="search-strip">
      <div className="search-strip__inner">
        <form
          className="search-strip__field"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          role="search"
        >
          <SearchIcon size={15} />
          <input
            type="search"
            name="q"
            placeholder="Search songs, albums, artists…"
            aria-label="Search songs"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </form>
        <button className="search-strip__filter" onClick={onBrowse}>
          <GridIcon size={14} /> Browse genres
        </button>
        <button className="search-strip__filter" onClick={onSubmit}>
          <ListIcon size={14} /> Search
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- rails */

export function Row({ title, subtitle, icon, cta, onCta, children }) {
  const ref = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft < 12);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 12);
  }, []);

  useEffect(() => {
    sync();
    const el = ref.current;
    if (!el) return undefined;
    el.addEventListener("scroll", sync, { passive: true });
    const t = setTimeout(sync, 60);
    return () => {
      el.removeEventListener("scroll", sync);
      clearTimeout(t);
    };
  }, [sync, children]);

  const scroll = (dir) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 240), behavior: "smooth" });
  };

  return (
    <section className="section">
      <div className="section__head">
        <div>
          <h2 className="section__title">
            {icon}
            {title}
          </h2>
          {subtitle ? <div className="section__sub">{subtitle}</div> : null}
        </div>
        {cta ? (
          <button className="section__link" onClick={onCta}>
            {cta} <ChevronRightIcon size={13} />
          </button>
        ) : null}
      </div>
      <div className="row-wrap">
        <button
          className="row-nav row-nav--prev"
          aria-label="Scroll left"
          onClick={() => scroll(-1)}
          disabled={atStart}
        >
          <ChevronLeftIcon size={16} />
        </button>
        <button
          className="row-nav row-nav--next"
          aria-label="Scroll right"
          onClick={() => scroll(1)}
          disabled={atEnd}
        >
          <ChevronRightIcon size={16} />
        </button>
        <div className="row" ref={ref}>
          {children}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- cards */

export function PosterCard({ item, onOpen, onPlay, badge, ranked, rank, wide, desc }) {
  if (wide) {
    return (
      <div className="card card--wide" onClick={() => onOpen(item)} title={item.name || item.author}>
        <div className="card__poster">
          <Art src={item.artwork || item.art} alt={item.name || item.author || ""} />
        </div>
        <div className="card__body">
          <div className="card__title">{item.name || item.author || item.title}</div>
          <div className="card__meta">
            <span>{item.author || item.subtitle || "Artist"}</span>
            {item.meta ? (
              <>
                <span className="sep" />
                <span>{item.meta}</span>
              </>
            ) : null}
          </div>
          {desc ? <div className="card__desc">{desc}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={cls("card", ranked && "card--ranked")} onClick={() => onOpen(item)} title={item.name || item.author}>
      <div className="card__poster">
        <Art src={item.artwork || item.art} alt={item.name || item.author || ""} />
        {badge ? (
          <div className="card__badges">
            <span className={cls("badge", badge.className)}>{badge.text}</span>
          </div>
        ) : null}
        {onPlay ? (
          <button
            className="card__play"
            onClick={(e) => {
              e.stopPropagation();
              onPlay(item);
            }}
            aria-label={`Play ${item.name || item.title}`}
          >
            <PlayIcon size={16} />
          </button>
        ) : null}
        {ranked ? <span className="card__rank">{rank}</span> : null}
      </div>
      <div className="card__body">
        <div className="card__title">{item.name || item.author || item.title}</div>
        <div className="card__meta">
          <span>{item.author || item.subtitle || "Artist"}</span>
          {item.meta ? (
            <>
              <span className="sep" />
              <span>{item.meta}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ArtistCard({ item, onOpen }) {
  return (
    <div className="card card--artist" onClick={() => onOpen(item)} title={item.author || item.name}>
      <div className="card__poster">
        <Art src={item.artwork || item.art} alt={item.author || item.name || ""} />
      </div>
      <div className="card__body">
        <div className="card__title">{item.author || item.name}</div>
        <div className="card__meta">
          <span>Artist</span>
        </div>
      </div>
    </div>
  );
}

export function ReleaseTile({ item, onOpen }) {
  return (
    <div className="release-tile" onClick={() => onOpen(item)} title={item.name}>
      <div className="release-tile__art">
        <Art src={item.artwork || item.art} alt={item.name || ""} />
        {item.badge ? <span className="release-tile__ep">{item.badge}</span> : null}
      </div>
      <div className="release-tile__title">{item.name}</div>
      <div className="release-tile__meta">{item.author || item.subtitle || ""}</div>
    </div>
  );
}

/* -------------------------------------------------------------- track rows */

export function TrackRow({
  track,
  index,
  active,
  playing,
  liked,
  onPlay,
  onLike,
  onMore,
  list,
  showAlbum = true,
}) {
  return (
    <div
      className={cls("track-row", active && "is-active")}
      onDoubleClick={() => onPlay(track, list)}
      onContextMenu={(e) => {
        e.preventDefault();
        onMore?.(track, e.clientX, e.clientY, list);
      }}
    >
      <div className="track-row__idx">{active && playing ? <EqualizerIcon size={13} /> : index + 1}</div>
      <div className="track-row__art" onClick={() => onPlay(track, list)} role="button" tabIndex={-1}>
        <Art src={track.artwork} alt="" />
      </div>
      <div className="track-row__body">
        <div className="track-row__title">{track.title}</div>
        <div className="track-row__meta">{track.author}</div>
      </div>
      {showAlbum && track.album ? <div className="track-row__album">{track.album}</div> : null}
      <div className="track-row__dur">{formatTime(track.duration || 0, true)}</div>
      <div className="track-row__actions">
        {onLike ? (
          <button className={cls("icon-btn", liked && "on")} onClick={() => onLike(track)} aria-label={liked ? "Unlike" : "Like"}>
            <HeartIcon filled={liked} size={16} />
          </button>
        ) : null}
        <button
          className="icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            onMore?.(track, e.clientX, e.clientY, list);
          }}
          aria-label="More options"
        >
          <GridIcon size={15} />
        </button>
      </div>
    </div>
  );
}

export function TrackList({
  tracks,
  current,
  playing,
  onPlay,
  onLike,
  isLiked,
  onMore,
  limit,
}) {
  const show = limit ? tracks.slice(0, limit) : tracks;
  if (!show.length) return null;
  return (
    <div className="track-list">
      {show.map((t, i) => (
        <TrackRow
          key={`${t.source || ""}:${t.id}:${i}`}
          track={t}
          index={i}
          list={tracks}
          active={!!current && current.id === t.id && current.source === t.source}
          playing={playing}
          liked={isLiked ? isLiked(t) : false}
          onPlay={onPlay}
          onLike={onLike}
          onMore={onMore}
        />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- timeline */

export function Timeline({ value, max, buffered = 0, onSeek }) {
  const ref = useRef(null);
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const bufPct = max > 0 ? Math.min(100, (buffered / max) * 100) : 0;

  const seekFrom = (clientX) => {
    const el = ref.current;
    if (!el || !max) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onSeek(ratio * max);
  };

  return (
    <div
      className="timeline"
      ref={ref}
      onClick={(e) => seekFrom(e.clientX)}
      onMouseDown={(e) => {
        const move = (ev) => seekFrom(ev.clientX);
        const up = () => {
          window.removeEventListener("mousemove", move);
          window.removeEventListener("mouseup", up);
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
      }}
      role="slider"
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
    >
      <div className="timeline__track">
        <div className="timeline__buffered" style={{ width: `${bufPct}%` }} />
        <div className="timeline__played" style={{ width: `${pct}%` }} />
        <div className="timeline__knob" style={{ left: `${pct}%` }} />
      </div>
      <div className="timeline__tooltip" style={{ left: `${pct}%` }}>
        {formatTime(value)}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ footer */

export function Footer({ onNav, onGenre, status }) {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="footer__glow" aria-hidden="true" />
      <div className="wrap footer__inner">
        <div className="footer__brand">
          <Brand footer onClick={() => onNav("home")} />
          <p className="footer__blurb">
            A privacy-respecting web music player — search, queue and stream full tracks, with live
            synced lyrics. Lavalink and yt-dlp run on the server, your browser only ever sees this
            origin.
          </p>
          <div className="footer__social">
            <a href="https://github.com/ayliee/Monochrome" aria-label="GitHub" className="social" target="_blank" rel="noreferrer">
              <ExternalIcon size={14} />
            </a>
            <button className="social" aria-label="About Monochrome" onClick={() => onNav("settings")}>
              <WaveIcon size={14} />
            </button>
            <button className="social" aria-label="Queue" onClick={() => onNav("home")}>
              <QueueIcon size={14} />
            </button>
          </div>
        </div>

        <nav className="footer__cols" aria-label="Footer">
          <div className="footer__col">
            <h4>Browse</h4>
            <button onClick={() => onNav("home")}>Home</button>
            <button onClick={() => onNav("browse")}>Discover</button>
            <button onClick={() => onNav("recent")}>Recently played</button>
            <button onClick={() => onNav("library")}>Liked songs</button>
          </div>
          <div className="footer__col">
            <h4>Genres</h4>
            <button onClick={() => onGenre("pop")}>Pop</button>
            <button onClick={() => onGenre("hiphop")}>Hip-Hop</button>
            <button onClick={() => onGenre("rock")}>Rock</button>
            <button onClick={() => onGenre("electronic")}>Electronic</button>
            <button onClick={() => onGenre("rnb")}>R&amp;B</button>
          </div>
          <div className="footer__col">
            <h4>Monochrome</h4>
            <button onClick={() => onNav("settings")}>About</button>
            <button onClick={() => onNav("settings")}>Settings</button>
            <a href="/api/health" target="_blank" rel="noopener">
              Service status
            </a>
            <button onClick={() => onNav("settings")}>Shortcuts</button>
          </div>
        </nav>

        <div className="footer__meta">
          <div className="footer__note">
            <span className={cls("dot-live", !status?.ok && "is-off")} aria-hidden="true" />
            <span>{status?.label || "Checking service…"}</span>
          </div>
          <p className="footer__legal">
            Monochrome does not host any audio. Catalogue metadata and streams are resolved on the
            server via <strong>Lavalink</strong> and <strong>yt-dlp</strong>; lyrics by{" "}
            <strong>LRCLIB</strong>. © {year} Monochrome. Built by Ayle (@alyfinnn) and{" "}
            <a className="credit-link" href="https://discord.gg/aerox" target="_blank" rel="noreferrer">
              AeroX
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ toasts */

export function Toasts({ items }) {
  return (
    <div className="toasts" id="toasts" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toast">
          <span className="toast__icon">{t.icon || <CheckIconFallback />}</span>
          <span className="toast__msg">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

function CheckIconFallback() {
  return <BoltIcon size={15} />;
}

/* ------------------------------------------------------------ section head */

export function SectionHead({ title, subtitle, icon, cta, onCta }) {
  return (
    <div className="section__head">
      <div>
        <h2 className="section__title">
          {icon || <FlameIcon size={16} />}
          {title}
        </h2>
        {subtitle ? <div className="section__sub">{subtitle}</div> : null}
      </div>
      {cta ? (
        <button className="section__link" onClick={onCta}>
          {cta} <ChevronRightIcon size={13} />
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ misc */

export function PageHead({ title, sub }) {
  return (
    <div className="page-head">
      <h1 className="page-title">{title}</h1>
      {sub ? <p className="page-sub">{sub}</p> : null}
    </div>
  );
}

export function Empty({ title, message, icon }) {
  return (
    <div className="empty">
      {icon || <MusicNoteIcon size={34} />}
      {title ? <h3>{title}</h3> : null}
      {message ? <p>{message}</p> : null}
    </div>
  );
}

export function SourceNote({ title, message }) {
  return (
    <div className="source-note">
      <StarIcon size={17} />
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}

export function SkeletonRow({ count = 7 }) {
  return (
    <div className="row">
      {Array.from({ length: count }).map((_, i) => (
        <div className="sk-card" key={i}>
          <div className="sk sk-card__poster" />
          <div className="sk sk-card__line" />
        </div>
      ))}
    </div>
  );
}

/* helper to build hero items from picks/albums */
export function useHeroItems(browse) {
  return useMemo(() => {
    const picks = browse?.picks || [];
    const pool = picks.length ? picks : browse?.albums || [];
    return pool.slice(0, 6).map((p, i) => ({
      key: p.url || `p${i}`,
      title: p.name || "Unknown album",
      author: p.author || "",
      art: p.artwork,
      kind: "Album",
      count: p.totalTracks || p.tracks?.length || 0,
      meta: p.totalTracks ? `${p.totalTracks} tracks` : "",
      synopsis:
        p.tracks?.length
          ? `${p.tracks.slice(0, 4).map((t) => t.title).join(" · ")}`
          : "Stream it in full quality with live synced lyrics.",
      item: p,
    }));
  }, [browse]);
}

export { HistoryIcon, LayersIcon, MicIcon, PauseIcon, PlayIcon, StarIcon };
