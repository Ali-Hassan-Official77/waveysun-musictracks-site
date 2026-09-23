"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Disc3,
  Heart,
  Home,
  Library,
  Menu,
  Moon,
  Pause,
  Play,
  Repeat2,
  Search,
  Settings2,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sun,
  TriangleAlert,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";

const FAVORITES_KEY = "waveysun-favorites";
const RECENT_KEY = "waveysun-recent";
const THEME_KEY = "waveysun-theme";
const HERO_INTERVAL = 5200;

function formatTime(seconds = 0) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

function TrackArt({ src, alt = "", className = "" }) {
  const [failedSrc, setFailedSrc] = useState(null);

  const imageSrc = useMemo(() => {
    if (!src || typeof src !== "string") return null;
    if (src.startsWith("https://") || src.startsWith("http://")) return src;
    if (src.startsWith("/")) return src;
    return null;
  }, [src]);

  const failed = failedSrc === imageSrc;

  if (!imageSrc || failed) {
    return (
      <div className={`art-fallback ${className}`} aria-label={alt || "Album artwork unavailable"}>
        <Disc3 size={30} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(imageSrc)}
    />
  );
}

function TrackCard({ track, onPlay, liked, onLike }) {
  return (
    <motion.article className="track-card" whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
      <button type="button" className="cover-wrap" onClick={() => onPlay(track)} aria-label={`Play ${track.title}`}>
        <TrackArt src={track.artwork} alt="" className="cover" />
        <span className="cover-shade" />
        <span className="cover-play">
          <Play size={17} fill="currentColor" />
        </span>
        <span className="genre-pill">{track.genre}</span>
      </button>

      <div className="track-copy">
        <div className="track-title-row">
          <div className="track-text">
            <h3 title={track.title}>{track.title}</h3>
            <p title={track.artist}>{track.artist}</p>
          </div>

          <button
            type="button"
            className={`mini-like ${liked ? "liked" : ""}`}
            onClick={() => onLike(track)}
            aria-label={liked ? `Remove ${track.title} from favorites` : `Add ${track.title} to favorites`}
          >
            <Heart size={17} fill={liked ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="track-meta">
          <span>{Number(track.playCount || 0).toLocaleString()} plays</span>
          <span>{formatTime(track.duration)}</span>
        </div>
      </div>
    </motion.article>
  );
}

const TOAST_ICONS = { success: Check, info: Zap, error: TriangleAlert };

function ToastStack({ toasts }) {
  return (
    <div className="toast-stack">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = TOAST_ICONS[toast.type] || Zap;
          return (
            <motion.div
              key={toast.id}
              className={`toast ${toast.type}`}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }}
              transition={{ duration: 0.25 }}
            >
              <span className="toast-icon">
                <Icon size={14} />
              </span>
              <span>{toast.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default function MusicApp() {
  const [tracks, setTracks] = useState([]);
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("Home");
  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [recent, setRecent] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [volume, setVolume] = useState(0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [theme, setTheme] = useState("dark");
  const [toasts, setToasts] = useState([]);

  const audioRef = useRef(null);
  const searchTimer = useRef(null);
  const railRef = useRef(null);
  const toastId = useRef(0);

  const pushToast = useCallback((message, type = "info") => {
    const id = ++toastId.current;
    setToasts((previous) => [...previous.slice(-2), { id, message, type }]);
    window.setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  const loadTrending = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/trending?limit=36&time=week", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load the catalog.");
      setTracks(Array.isArray(data.tracks) ? data.tracks : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load the catalog.");
    } finally {
      setLoading(false);
    }
  }, []);

  const searchCatalog = useCallback(async (value) => {
    const clean = value.trim();

    if (!clean) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    setError("");

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(clean)}&limit=36`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Search failed.");
      setResults(Array.isArray(data.tracks) ? data.tracks : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    try {
      const savedFavorites = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || "[]");
      const savedRecent = JSON.parse(window.localStorage.getItem(RECENT_KEY) || "[]");
      const savedTheme = window.localStorage.getItem(THEME_KEY);

      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(savedFavorites)) setFavorites(savedFavorites);
      if (Array.isArray(savedRecent)) setRecent(savedRecent);
      if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
    } catch {
      window.localStorage.removeItem(FAVORITES_KEY);
      window.localStorage.removeItem(RECENT_KEY);
    }

    void loadTrending();
  }, [loadTrending]);

  useEffect(() => {
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!tracks.length || heroPaused) return undefined;

    const timer = window.setInterval(() => {
      setHeroIndex((index) => (index + 1) % tracks.length);
    }, HERO_INTERVAL);

    return () => window.clearInterval(timer);
  }, [tracks.length, heroPaused]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const updateTime = () => setCurrentTime(audio.currentTime || 0);
    const updateDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("durationchange", updateDuration);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("durationchange", updateDuration);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || tracks.length < 2) return undefined;

    let frame;
    let last = performance.now();
    const speed = 0.035;

    const tick = (now) => {
      const delta = now - last;
      last = now;

      if (!rail.matches(":hover") && !heroPaused) {
        rail.scrollLeft += delta * speed;
        if (rail.scrollLeft >= rail.scrollWidth / 2) rail.scrollLeft = 0;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [tracks.length, heroPaused]);

  const safeHeroIndex = tracks.length > 0 ? Math.min(heroIndex, tracks.length - 1) : 0;
  const hero = tracks[safeHeroIndex] || tracks[0] || null;

  const playlistFilters = useMemo(
    () => ({
      "Sunrise Chill": ["chill", "ambient", "lofi", "acoustic"],
      "Wave Workout": ["hip hop", "edm", "dance", "electronic"],
      "Midnight Tide": ["r&b", "rnb", "soul", "jazz", "night"],
      "Golden Focus": ["classical", "ambient", "instrumental", "electronic"],
      "Coastal Drive": ["rock", "pop", "indie", "country"],
    }),
    []
  );

  const viewTracks = useMemo(() => {
    if (active === "Favorites") return favorites;
    if (active === "Library") return recent;
    if (active === "Search") return results;

    if (active === "Playlist") {
      const terms = playlistFilters[playlistName] || [];
      const filtered = tracks.filter((track) => {
        const haystack = `${track.genre} ${track.mood} ${track.title} ${track.artist}`.toLowerCase();
        return terms.some((term) => haystack.includes(term));
      });
      return filtered.length ? filtered : tracks;
    }

    return tracks;
  }, [active, favorites, playlistFilters, playlistName, recent, results, tracks]);

  const displayed = viewTracks.slice(0, 18);

  function handleSearch(event) {
    const value = event.target.value;
    setQuery(value);
    setActive(value.trim() ? "Search" : "Home");
    setPlaylistName("");

    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      void searchCatalog(value);
    }, 350);
  }

  function clearSearch() {
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    setQuery("");
    setResults([]);
    setActive("Home");
  }

  function toggleFavorite(track) {
    setFavorites((previous) => {
      const exists = previous.some((item) => item.id === track.id);
      const next = exists ? previous.filter((item) => item.id !== track.id) : [track, ...previous];
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      pushToast(exists ? `Removed “${track.title}” from favorites` : `Added “${track.title}” to favorites`, "success");
      return next;
    });
  }

  function playTrack(track) {
    if (!track?.id) return;

    setCurrent(track);
    setCurrentTime(0);
    setDuration(Number(track.duration) || 0);
    setPlaying(true);
    pushToast(`Now playing “${track.title}”`, "info");

    setRecent((previous) => {
      const next = [track, ...previous.filter((item) => item.id !== track.id)].slice(0, 30);
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current?.id) return undefined;

    audio.pause();
    audio.src = `/api/stream/${encodeURIComponent(current.id)}`;
    audio.load();
    audio.volume = volume;

    let cancelled = false;

    const start = async () => {
      try {
        await audio.play();
        if (!cancelled) setPlaying(true);
      } catch {
        if (!cancelled) setPlaying(false);
      }
    };

    void start();

    return () => {
      cancelled = true;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  function step(direction) {
    const list = viewTracks.length ? viewTracks : tracks;
    if (!list.length) return;

    const currentIndex = list.findIndex((track) => track.id === current?.id);
    let nextIndex;

    if (shuffle && list.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * list.length);
      } while (nextIndex === currentIndex);
    } else {
      const index = currentIndex < 0 ? (direction > 0 ? 0 : list.length - 1) : currentIndex;
      nextIndex = (index + direction + list.length) % list.length;
    }

    playTrack(list[nextIndex]);
  }

  function togglePlayback() {
    const audio = audioRef.current;

    if (!audio || !current) {
      if (tracks[0]) playTrack(tracks[0]);
      return;
    }

    if (audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function seek(event) {
    const value = Number(event.target.value);
    setCurrentTime(value);
    if (audioRef.current) audioRef.current.currentTime = value;
  }

  function navigate(label) {
    setMobileOpen(false);
    setPlaylistName("");
    setActive(label);

    if (label === "Explore") {
      setActive("Home");
      window.setTimeout(() => {
        document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth" });
      }, 0);
    }
  }

  function openPlaylist(name) {
    setPlaylistName(name);
    setActive("Playlist");
    setMobileOpen(false);
    pushToast(`Opened “${name}” playlist`, "info");

    window.setTimeout(() => {
      document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  }

  function moveHero(direction) {
    if (!tracks.length) return;
    setHeroIndex((index) => (index + direction + tracks.length) % tracks.length);
  }

  function toggleTheme() {
    setTheme((value) => {
      const next = value === "dark" ? "light" : "dark";
      window.localStorage.setItem(THEME_KEY, next);
      pushToast(`Switched to ${next} mode`, "success");
      return next;
    });
  }

  function toggleShuffle() {
    setShuffle((value) => {
      pushToast(!value ? "Shuffle on" : "Shuffle off", "info");
      return !value;
    });
  }

  function toggleRepeat() {
    setRepeat((value) => {
      pushToast(!value ? "Repeat on" : "Repeat off", "info");
      return !value;
    });
  }

  return (
    <div className="app-shell">
      <ToastStack toasts={toasts} />

      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setError("This track could not be streamed. Please try another track.");
          pushToast("Playback failed for this track", "error");
        }}
        onEnded={() => {
          if (repeat && current) {
            playTrack(current);
          } else {
            step(1);
          }
        }}
      />

      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Image src="/logo.svg" alt="WaveySun" width={44} height={44} unoptimized />
          </div>

          <div>
            <strong>WaveySun</strong>
            <span>Streaming Music</span>
          </div>
        </div>

        <nav>
          <div className="nav-label">Menu</div>

          {[
            [Home, "Home"],
            [Search, "Explore"],
            [Heart, "Favorites"],
            [Library, "Library"],
          ].map(([Icon, label]) => (
            <button
              type="button"
              key={label}
              className={`nav-item ${active === label ? "active" : ""}`}
              onClick={() => navigate(label)}
            >
              <Icon size={19} />
              <span>{label}</span>

              {label === "Favorites" && favorites.length > 0 ? <b>{favorites.length}</b> : null}
              {label === "Library" && recent.length > 0 ? <b>{recent.length}</b> : null}
            </button>
          ))}
        </nav>

        <div className="nav-section">
          <div className="nav-label">Your Playlists</div>

          {Object.keys(playlistFilters).map((name, index) => (
            <button
              type="button"
              className={`playlist-item ${active === "Playlist" && playlistName === name ? "selected" : ""}`}
              key={name}
              onClick={() => openPlaylist(name)}
            >
              <span className={`playlist-dot dot-${index}`} />
              <span>{name}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-bottom">
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label="Toggle dark mode">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>

          <div className="plan-card">
            <Zap size={17} />
            <div>
              <strong>WaveySun Pro</strong>
              <span>Curated listening, made simple.</span>
            </div>
          </div>
        </div>
      </aside>

      {mobileOpen ? (
        <button type="button" className="sidebar-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
      ) : null}

      <main className="main">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label="Open menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="search-box">
            <Search size={18} />
            <input
              value={query}
              onChange={handleSearch}
              placeholder="Search songs, artists, albums..."
              aria-label="Search songs, artists, albums"
            />
            {query ? (
              <button type="button" onClick={clearSearch} aria-label="Clear search">
                <X size={16} />
              </button>
            ) : null}
          </div>

          <div className="user-actions">
            <button
              type="button"
              className="icon-btn"
              aria-label="Toggle dark mode"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>

            <button type="button" className="icon-btn" aria-label="Notifications" onClick={() => pushToast("You're all caught up", "info")}>
              <Bell size={19} />
            </button>

            <button type="button" className="icon-btn" aria-label="Settings" onClick={() => pushToast("Settings coming soon", "info")}>
              <Settings2 size={19} />
            </button>

            <div className="avatar">WS</div>
          </div>
        </header>

        {error ? (
          <div className="error-banner">
            <span>{error}</span>
            <button type="button" onClick={() => void loadTrending()}>
              Retry
            </button>
          </div>
        ) : null}

        {active === "Home" && hero ? (
          <motion.section
            className="hero"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            onMouseEnter={() => setHeroPaused(true)}
            onMouseLeave={() => setHeroPaused(false)}
          >
            <Image src="/hero_banner.png" alt="WaveySun" fill priority unoptimized className="hero-art" />
            <div className="hero-image-tint" />
            <div className="hero-overlay" />

            <div className="hero-content">
              <span className="hero-tag">
                <Zap size={12} />
                Trending on WaveySun
              </span>

              <AnimatePresence mode="wait">
                <motion.div
                  key={hero.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="hero-kicker">
                    #{String(safeHeroIndex + 1).padStart(2, "0")} · {hero.genre}
                  </div>

                  <h1>{hero.title}</h1>

                  <p>
                    Ride the wave of independent sound — a premium discovery
                    experience built on the Audius catalog.
                  </p>

                  <div className="hero-actions">
                    <button type="button" className="btn primary" onClick={() => playTrack(hero)}>
                      <Play size={17} fill="currentColor" />
                      Play now
                    </button>

                    <button type="button" className="btn secondary" onClick={() => toggleFavorite(hero)}>
                      <Heart size={17} fill={favorites.some((favorite) => favorite.id === hero.id) ? "currentColor" : "none"} />
                      Save
                    </button>
                  </div>

                  <div className="hero-byline">
                    <span>{hero.artist}</span>
                    <i />
                    <span>{formatTime(hero.duration)}</span>
                    <i />
                    <span>{Number(hero.playCount || 0).toLocaleString()} plays</span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="hero-controls">
              <button type="button" onClick={() => moveHero(-1)} aria-label="Previous featured track">
                <ChevronLeft size={18} />
              </button>

              <button
                type="button"
                className="hero-pause"
                onClick={() => setHeroPaused((value) => !value)}
                aria-label={heroPaused ? "Resume hero rotation" : "Pause hero rotation"}
              >
                {heroPaused ? <Play size={13} fill="currentColor" /> : <Pause size={13} fill="currentColor" />}
              </button>

              <button type="button" onClick={() => moveHero(1)} aria-label="Next featured track">
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="hero-rail-wrap">
              <div className="hero-rail" ref={railRef}>
                {[...tracks, ...tracks].map((track, index) => (
                  <button
                    type="button"
                    className={`hero-rail-card ${track.id === hero.id ? "active" : ""}`}
                    key={`${track.id}-${index}`}
                    onClick={() => {
                      setHeroIndex(index % tracks.length);
                      playTrack(track);
                    }}
                  >
                    <TrackArt src={track.artwork} alt="" className="hero-rail-art" />
                    <span>
                      <strong>{track.title}</strong>
                      <small>{track.artist}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.section>
        ) : null}

        <section id="catalog" className="section">
          <div className="section-header">
            <div>
              <span className="eyebrow">
                {active === "Search"
                  ? "Catalog search"
                  : active === "Favorites"
                    ? "Your collection"
                    : active === "Library"
                      ? "Listening history"
                      : active === "Playlist"
                        ? "Curated playlist"
                        : "Fresh from Audius"}
              </span>

              <h2>
                {active === "Search"
                  ? `Results for “${query}”`
                  : active === "Favorites"
                    ? "Your favorites"
                    : active === "Library"
                      ? "Recently played"
                      : active === "Playlist"
                        ? playlistName
                        : "Trending now"}
              </h2>
            </div>

            <div className="section-tools">
              <button type="button" className="filter-btn" onClick={() => pushToast("Filters coming soon", "info")}>
                <SlidersHorizontal size={16} />
                Filter
              </button>

              <button
                type="button"
                className="see-all"
                onClick={() => {
                  void loadTrending();
                  pushToast("Catalog refreshed", "success");
                }}
              >
                Refresh
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {loading || searching ? (
            <div className="skeleton-grid">
              {Array.from({ length: 12 }, (_, index) => (
                <div className="skeleton-card" key={index}>
                  <div />
                  <span />
                  <small />
                </div>
              ))}
            </div>
          ) : displayed.length ? (
            <div className="grid">
              {displayed.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  onPlay={playTrack}
                  liked={favorites.some((favorite) => favorite.id === track.id)}
                  onLike={toggleFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Disc3 size={36} />
              <h3>
                {active === "Favorites" ? "Your favorites are empty" : active === "Library" ? "Nothing played yet" : "No tracks found"}
              </h3>
              <p>
                {active === "Favorites"
                  ? "Save songs while exploring and they will appear here."
                  : active === "Library"
                    ? "Play a track and it will be saved here automatically."
                    : "Try another artist, song or keyword."}
              </p>
            </div>
          )}
        </section>

        <footer className="footer">
          <div className="footer-main">
            <div className="footer-brand">
              <Image src="/logo.svg" alt="WaveySun" width={38} height={38} unoptimized />
              <strong>WaveySun</strong>
            </div>

            <p>Independent music discovery with a premium listening experience, built for desktop and mobile.</p>

            <a className="footer-email" href="mailto:waveysunofficial298@gmail.com">
              waveysunofficial298@gmail.com
            </a>
          </div>

          <div className="footer-links">
            <div>
              <strong>Platform</strong>
              <button type="button" onClick={() => navigate("Explore")}>Discover</button>
              <button type="button" onClick={() => navigate("Home")}>Trending</button>
              <button type="button" onClick={() => navigate("Library")}>Library</button>
            </div>

            <div>
              <strong>Collection</strong>
              <button type="button" onClick={() => navigate("Favorites")}>Favorites</button>
              <button type="button" onClick={() => openPlaylist("Sunrise Chill")}>Playlists</button>
              <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Back to top</button>
            </div>

            <div>
              <strong>Contact</strong>
              <span>WaveySun Music</span>
              <a href="mailto:waveysunofficial298@gmail.com">Email us</a>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© 2026 WaveySun. All rights reserved.</span>
            <span>Music powered by Audius</span>
          </div>
        </footer>
      </main>

      <AnimatePresence>
        {current ? (
          <motion.div
            className="player"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
          >
            <div className="player-track">
              <TrackArt src={current.artwork} alt="" className="player-art" />
              <div>
                <strong>{current.title}</strong>
                <span>{current.artist}</span>
              </div>

              <button
                type="button"
                className={`mini-like ${favorites.some((favorite) => favorite.id === current.id) ? "liked" : ""}`}
                onClick={() => toggleFavorite(current)}
                aria-label="Toggle favorite"
              >
                <Heart size={17} fill={favorites.some((favorite) => favorite.id === current.id) ? "currentColor" : "none"} />
              </button>
            </div>

            <div className="player-center">
              <div className="player-controls">
                <button type="button" className={shuffle ? "control-on" : ""} onClick={toggleShuffle} aria-label="Toggle shuffle">
                  <Shuffle size={16} />
                </button>

                <button type="button" onClick={() => step(-1)} aria-label="Previous track">
                  <SkipBack size={19} fill="currentColor" />
                </button>

                <button type="button" className="main-play" onClick={togglePlayback} aria-label={playing ? "Pause" : "Play"}>
                  {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>

                <button type="button" onClick={() => step(1)} aria-label="Next track">
                  <SkipForward size={19} fill="currentColor" />
                </button>

                <button type="button" className={repeat ? "control-on" : ""} onClick={toggleRepeat} aria-label="Toggle repeat">
                  <Repeat2 size={16} />
                </button>
              </div>

              <div className="progress-row">
                <span>{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration || Number(current.duration) || 1}
                  value={Math.min(currentTime, duration || Number(current.duration) || 1)}
                  onChange={seek}
                  aria-label="Track progress"
                />
                <span>{formatTime(duration || current.duration)}</span>
              </div>
            </div>

            <div className="player-volume">
              {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                aria-label="Volume"
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
