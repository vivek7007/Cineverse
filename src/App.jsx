
// CineVerse - Movie Recommendation System
// Full React App - Single File

import { useState, useEffect, useContext, createContext, useCallback, useRef } from "react";

// ─── TMDB CONFIG ───────────────────────────────────────────────────────────────
const TMDB_KEY = "ccdf1a600ee277f2df16fc5319b2b500"; // Replace with real key
const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";
const BACKDROP = `${IMG}/w1280`;
const POSTER = `${IMG}/w500`;
const THUMB = `${IMG}/w185`;

// ─── CONTEXT ──────────────────────────────────────────────────────────────────
const AppContext = createContext();

const GENRES = [
  { id: 28, name: "Action" }, { id: 35, name: "Comedy" }, { id: 18, name: "Drama" },
  { id: 27, name: "Horror" }, { id: 10749, name: "Romance" }, { id: 878, name: "Sci-Fi" },
  { id: 53, name: "Thriller" }, { id: 16, name: "Animation" }, { id: 12, name: "Adventure" },
  { id: 14, name: "Fantasy" }
];

const MOODS = [
  { label: "Happy", emoji: "😄", genres: [35, 16, 12] },
  { label: "Sad", emoji: "😢", genres: [18, 36, 10749] },
  { label: "Excited", emoji: "🤩", genres: [28, 12, 878] },
  { label: "Scared", emoji: "😱", genres: [27, 53] },
  { label: "Romantic", emoji: "💕", genres: [10749, 35, 18] },
  { label: "Chill", emoji: "😎", genres: [35, 16, 10751] },
];

function AppProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("cv_user") || "null"));
  const [watchlist, setWatchlist] = useState(() => JSON.parse(localStorage.getItem("cv_watchlist") || "[]"));
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem("cv_history") || "[]"));
  const [favGenres, setFavGenres] = useState(() => JSON.parse(localStorage.getItem("cv_genres") || "[28,35,18]"));
  const [darkMode, setDarkMode] = useState(true);
  const [page, setPage] = useState("home");
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [ratings, setRatings] = useState(() => JSON.parse(localStorage.getItem("cv_ratings") || "{}"));

  const login = (userData) => { setUser(userData); localStorage.setItem("cv_user", JSON.stringify(userData)); };
  const logout = () => { setUser(null); localStorage.removeItem("cv_user"); };

  const toggleWatchlist = (movie) => {
    setWatchlist(prev => {
      const exists = prev.find(m => m.id === movie.id);
      const next = exists ? prev.filter(m => m.id !== movie.id) : [...prev, movie];
      localStorage.setItem("cv_watchlist", JSON.stringify(next));
      return next;
    });
  };

  const addToHistory = (movie) => {
    setHistory(prev => {
      const filtered = prev.filter(m => m.id !== movie.id);
      const next = [movie, ...filtered].slice(0, 20);
      localStorage.setItem("cv_history", JSON.stringify(next));
      return next;
    });
  };

  const rateMovie = (movieId, rating) => {
    setRatings(prev => {
      const next = { ...prev, [movieId]: rating };
      localStorage.setItem("cv_ratings", JSON.stringify(next));
      return next;
    });
  };

  const navigate = (p, movie = null) => { setPage(p); setSelectedMovie(movie); window.scrollTo(0, 0); };

  return (
    <AppContext.Provider value={{
      user, login, logout, watchlist, toggleWatchlist, history, addToHistory,
      favGenres, setFavGenres, darkMode, setDarkMode, page, navigate, selectedMovie,
      ratings, rateMovie
    }}>
      <div className={darkMode ? "dark" : "light"}>
        {children}
      </div>
    </AppContext.Provider>
  );
}

const useApp = () => useContext(AppContext);

// ─── API HOOKS ────────────────────────────────────────────────────────────────
function useTMDB(endpoint, params = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const query = new URLSearchParams({ api_key: TMDB_KEY, language: "en-US", ...params });
    fetch(`${TMDB}${endpoint}?${query}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e); setLoading(false); } });
    return () => { cancelled = true; };
  }, [endpoint, JSON.stringify(params)]);

  return { data, loading, error };
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────
function Skeleton({ w = "100%", h = 200, r = 8 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: "linear-gradient(90deg, #1a1a2e 25%, #16213e 50%, #1a1a2e 75%)",
      backgroundSize: "400% 100%",
      animation: "shimmer 1.5s infinite"
    }} />
  );
}

// ─── STAR RATING ──────────────────────────────────────────────────────────────
function StarRating({ movieId, size = 16 }) {
  const { ratings, rateMovie } = useApp();
  const current = ratings[movieId] || 0;
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} onClick={() => rateMovie(movieId, s)}
          style={{ cursor: "pointer", fontSize: size, color: s <= current ? "#e50914" : "#555" }}>
          ★
        </span>
      ))}
    </div>
  );
}

// ─── MOVIE CARD ───────────────────────────────────────────────────────────────
function MovieCard({ movie, small }) {
  const { toggleWatchlist, watchlist, navigate, addToHistory } = useApp();
  const inWatchlist = watchlist.find(m => m.id === movie.id);
  const [hovered, setHovered] = useState(false);

  const open = () => { addToHistory(movie); navigate("detail", movie); };

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative", borderRadius: 12, overflow: "hidden", cursor: "pointer",
        transition: "transform 0.3s, box-shadow 0.3s",
        transform: hovered ? "scale(1.04)" : "scale(1)",
        boxShadow: hovered ? "0 20px 60px rgba(229,9,20,0.3)" : "0 4px 20px rgba(0,0,0,0.5)",
        flexShrink: 0, width: small ? 140 : 185
      }}>
      <div style={{ position: "relative", paddingBottom: "150%", overflow: "hidden" }}>
        {movie.poster_path
          ? <img src={`${POSTER}${movie.poster_path}`} alt={movie.title}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ position: "absolute", inset: 0, background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: 13 }}>No Image</div>
        }
        <div style={{
          position: "absolute", inset: 0,
          background: hovered ? "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)" : "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)",
          transition: "0.3s"
        }} />
        <button onClick={e => { e.stopPropagation(); toggleWatchlist(movie); }}
          style={{
            position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)",
            border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer",
            color: inWatchlist ? "#e50914" : "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
            opacity: hovered ? 1 : 0, transition: "opacity 0.2s"
          }}>
          {inWatchlist ? "♥" : "♡"}
        </button>
        <div style={{ position: "absolute", bottom: 8, left: 8, right: 8 }} onClick={open}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#fff", lineHeight: 1.3, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
            {movie.title}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
            <span style={{ color: "#ffd700", fontSize: 11 }}>★</span>
            <span style={{ color: "#ccc", fontSize: 11 }}>{movie.vote_average?.toFixed(1)}</span>
            <span style={{ color: "#888", fontSize: 10 }}>{movie.release_date?.slice(0, 4)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HORIZONTAL SCROLL SECTION ────────────────────────────────────────────────
function MovieRow({ title, endpoint, params, badge }) {
  const { data, loading } = useTMDB(endpoint, params);
  const rowRef = useRef();
  const scroll = (dir) => rowRef.current?.scrollBy({ left: dir * 600, behavior: "smooth" });

  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: "0 24px" }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "'Bebas Neue', 'Anton', serif", letterSpacing: 1 }}>{title}</h2>
        {badge && <span style={{ background: "#e50914", color: "#fff", fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>{badge}</span>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={() => scroll(-1)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "#fff", width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>‹</button>
          <button onClick={() => scroll(1)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "#fff", width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>›</button>
        </div>
      </div>
      <div ref={rowRef} style={{ display: "flex", gap: 12, overflowX: "auto", padding: "0 24px 8px", scrollbarWidth: "none" }}>
        {loading
          ? Array(8).fill(0).map((_, i) => <Skeleton key={i} w={185} h={277} r={12} />)
          : data?.results?.map(m => <MovieCard key={m.id} movie={m} />)
        }
      </div>
    </section>
  );
}

// ─── HERO SECTION ─────────────────────────────────────────────────────────────
function Hero() {
  const { data } = useTMDB("/movie/now_playing", { page: 1 });
  const { navigate, addToHistory, toggleWatchlist, watchlist } = useApp();
  const [idx, setIdx] = useState(0);
  const movies = data?.results?.slice(0, 5) || [];
  const movie = movies[idx];

  useEffect(() => {
    if (movies.length === 0) return;
    const t = setInterval(() => setIdx(i => (i + 1) % movies.length), 6000);
    return () => clearInterval(t);
  }, [movies.length]);

  if (!movie) return <div style={{ height: 560, background: "#0a0a0f" }} />;

  return (
    <div style={{ position: "relative", height: 580, overflow: "hidden", marginBottom: 40 }}>
      <img src={`${BACKDROP}${movie.backdrop_path}`} alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "opacity 0.8s" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.95) 30%, rgba(0,0,0,0.3) 70%, transparent), linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 60%)" }} />
      <div style={{ position: "absolute", bottom: 80, left: 40, maxWidth: 520 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <span style={{ background: "#e50914", color: "#fff", padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>NOW PLAYING</span>
          <span style={{ border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "3px 10px", borderRadius: 4, fontSize: 11 }}>
            ★ {movie.vote_average?.toFixed(1)} / 10
          </span>
        </div>
        <h1 style={{ margin: "0 0 12px", fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, color: "#fff", fontFamily: "'Bebas Neue', 'Anton', serif", letterSpacing: 2, lineHeight: 1.1 }}>
          {movie.title}
        </h1>
        <p style={{ margin: "0 0 24px", color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 1.7, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {movie.overview}
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => { addToHistory(movie); navigate("detail", movie); }}
            style={{ background: "#e50914", border: "none", color: "#fff", padding: "12px 28px", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "background 0.2s" }}>
            ▶ Watch Now
          </button>
          <button onClick={() => toggleWatchlist(movie)}
            style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "12px 24px", borderRadius: 8, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            {watchlist.find(m => m.id === movie.id) ? "♥ Saved" : "+ Watchlist"}
          </button>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
        {movies.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            style={{ width: i === idx ? 24 : 8, height: 8, borderRadius: 4, background: i === idx ? "#e50914" : "rgba(255,255,255,0.4)", border: "none", cursor: "pointer", transition: "all 0.3s", padding: 0 }} />
        ))}
      </div>
    </div>
  );
}

// ─── SEARCH BAR ───────────────────────────────────────────────────────────────
function SearchBar() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const { navigate, addToHistory } = useApp();
  const debounce = useRef();

  const search = (v) => {
    setQ(v);
    clearTimeout(debounce.current);
    if (!v.trim()) { setResults([]); setOpen(false); return; }
    debounce.current = setTimeout(async () => {
      const r = await fetch(`${TMDB}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(v)}&language=en-US`);
      const d = await r.json();
      setResults(d.results?.slice(0, 6) || []);
      setOpen(true);
    }, 300);
  };

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 500 }}>
      <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.08)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", overflow: "hidden" }}>
        <span style={{ padding: "0 12px", color: "#888", fontSize: 18 }}>🔍</span>
        <input value={q} onChange={e => search(e.target.value)} onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Search movies, genres, actors..."
          style={{ flex: 1, background: "none", border: "none", color: "#fff", padding: "12px 0", fontSize: 14, outline: "none" }} />
        {q && <button onClick={() => { setQ(""); setResults([]); setOpen(false); }}
          style={{ background: "none", border: "none", color: "#888", padding: "0 12px", cursor: "pointer", fontSize: 18 }}>×</button>}
      </div>
      {open && results.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1000,
          background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
          boxShadow: "0 20px 60px rgba(0,0,0,0.8)", overflow: "hidden", marginTop: 4
        }}>
          {results.map(m => (
            <div key={m.id} onMouseDown={() => { addToHistory(m); navigate("detail", m); setOpen(false); setQ(""); }}
              style={{ display: "flex", gap: 12, padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(229,9,20,0.1)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              {m.poster_path
                ? <img src={`${THUMB}${m.poster_path}`} style={{ width: 36, height: 54, objectFit: "cover", borderRadius: 4 }} />
                : <div style={{ width: 36, height: 54, background: "#1a1a2e", borderRadius: 4 }} />}
              <div>
                <p style={{ margin: 0, color: "#fff", fontSize: 14, fontWeight: 600 }}>{m.title}</p>
                <p style={{ margin: "2px 0 0", color: "#888", fontSize: 12 }}>{m.release_date?.slice(0, 4)} · ★ {m.vote_average?.toFixed(1)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function Nav() {
  const { user, logout, navigate, page, darkMode, setDarkMode, watchlist } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { label: "Home", p: "home" }, { label: "Discover", p: "discover" },
    { label: "Watchlist", p: "watchlist" }, { label: "AI Assistant", p: "ai" }
  ];

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "rgba(10,10,20,0.85)", backdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(229,9,20,0.15)", padding: "0 24px"
    }}>
      <div style={{ display: "flex", alignItems: "center", height: 64, gap: 24, maxWidth: 1400, margin: "0 auto" }}>
        <button onClick={() => navigate("home")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <span style={{ fontSize: 24, fontWeight: 900, fontFamily: "'Bebas Neue','Anton',serif", letterSpacing: 3, color: "#e50914" }}>CINEVERSE</span>
        </button>

        <div style={{ display: "flex", gap: 4, flex: 1, alignItems: "center" }}>
          {links.map(l => (
            <button key={l.p} onClick={() => navigate(l.p)}
              style={{
                background: "none", border: "none", color: page === l.p ? "#e50914" : "#ccc",
                fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "6px 12px", borderRadius: 6,
                borderBottom: page === l.p ? "2px solid #e50914" : "2px solid transparent", transition: "all 0.2s"
              }}>
              {l.label}
              {l.p === "watchlist" && watchlist.length > 0 &&
                <span style={{ background: "#e50914", color: "#fff", fontSize: 10, borderRadius: 10, padding: "1px 5px", marginLeft: 4 }}>{watchlist.length}</span>}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setDarkMode(d => !d)} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8, color: "#fff", width: 36, height: 36, cursor: "pointer", fontSize: 16 }}>
            {darkMode ? "☀️" : "🌙"}
          </button>
          {user
            ? <div style={{ position: "relative" }}>
              <button onClick={() => setMenuOpen(m => !m)}
                style={{ background: "#e50914", border: "none", borderRadius: "50%", width: 36, height: 36, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                {user.name?.[0]?.toUpperCase()}
              </button>
              {menuOpen && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 8, minWidth: 160, zIndex: 200 }}>
                  <p style={{ margin: "4px 12px 8px", color: "#888", fontSize: 12, borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 8 }}>{user.email}</p>
                  <button onClick={() => { navigate("profile"); setMenuOpen(false); }} style={{ width: "100%", background: "none", border: "none", color: "#ccc", textAlign: "left", padding: "8px 12px", cursor: "pointer", borderRadius: 6, fontSize: 13 }}>👤 Profile</button>
                  <button onClick={() => { logout(); setMenuOpen(false); }} style={{ width: "100%", background: "none", border: "none", color: "#e50914", textAlign: "left", padding: "8px 12px", cursor: "pointer", borderRadius: 6, fontSize: 13 }}>⟵ Sign Out</button>
                </div>
              )}
            </div>
            : <button onClick={() => navigate("auth")} style={{ background: "#e50914", border: "none", borderRadius: 8, color: "#fff", padding: "8px 18px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Sign In</button>
          }
        </div>
      </div>
    </nav>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage() {
  const { user, favGenres } = useApp();
  return (
    <div>
      <Hero />
      <div style={{ padding: "0 0 40px", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ padding: "0 24px 20px" }}>
          <SearchBar />
        </div>
        <MovieRow title="🔥 Trending This Week" endpoint="/trending/movie/week" badge="HOT" />
        <MovieRow title="⭐ Top Rated" endpoint="/movie/top_rated" />
        <MovieRow title="🎬 Now Playing" endpoint="/movie/now_playing" />
        <MovieRow title="🚀 Upcoming" endpoint="/movie/upcoming" />
        {user && favGenres.length > 0 && (
          <MovieRow title="💡 Recommended For You" endpoint="/discover/movie"
            params={{ with_genres: favGenres[0], sort_by: "vote_average.desc", "vote_count.gte": 1000 }} />
        )}
        <MoodSection />
      </div>
    </div>
  );
}

// ─── MOOD SECTION ─────────────────────────────────────────────────────────────
function MoodSection() {
  const [activeMood, setActiveMood] = useState(null);
  const { data, loading } = useTMDB(
    activeMood ? "/discover/movie" : null,
    activeMood ? { with_genres: activeMood.genres.join(","), sort_by: "popularity.desc" } : {}
  );
  const { navigate, addToHistory } = useApp();

  return (
    <section style={{ padding: "0 24px", marginBottom: 40 }}>
      <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "'Bebas Neue','Anton',serif", letterSpacing: 1 }}>🎭 Mood-Based Picks</h2>
      <p style={{ margin: "0 0 16px", color: "#888", fontSize: 13 }}>How are you feeling today?</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        {MOODS.map(m => (
          <button key={m.label} onClick={() => setActiveMood(activeMood?.label === m.label ? null : m)}
            style={{
              background: activeMood?.label === m.label ? "#e50914" : "rgba(255,255,255,0.08)",
              border: `1px solid ${activeMood?.label === m.label ? "#e50914" : "rgba(255,255,255,0.12)"}`,
              borderRadius: 100, color: "#fff", padding: "8px 18px", cursor: "pointer",
              fontSize: 13, fontWeight: 600, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6
            }}>
            {m.emoji} {m.label}
          </button>
        ))}
      </div>
      {activeMood && (
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
          {loading
            ? Array(6).fill(0).map((_, i) => <Skeleton key={i} w={185} h={277} r={12} />)
            : data?.results?.map(m => <MovieCard key={m.id} movie={m} />)
          }
        </div>
      )}
    </section>
  );
}

// ─── DISCOVER PAGE ────────────────────────────────────────────────────────────
function DiscoverPage() {
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [rating, setRating] = useState("");
  const [sort, setSort] = useState("popularity.desc");
  const [pageNum, setPageNum] = useState(1);

  const params = { sort_by: sort, page: pageNum };
  if (genre) params.with_genres = genre;
  if (year) params.primary_release_year = year;
  if (rating) params["vote_average.gte"] = rating;
  params["vote_count.gte"] = 50;

  const { data, loading } = useTMDB("/discover/movie", params);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
      <h1 style={{ margin: "0 0 24px", fontSize: 32, fontWeight: 900, color: "#fff", fontFamily: "'Bebas Neue','Anton',serif", letterSpacing: 2 }}>DISCOVER MOVIES</h1>
      <SearchBar />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "20px 0 30px" }}>
        <select value={genre} onChange={e => { setGenre(e.target.value); setPageNum(1); }}
          style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff", padding: "10px 14px", fontSize: 13, cursor: "pointer" }}>
          <option value="">All Genres</option>
          {GENRES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={sort} onChange={e => { setSort(e.target.value); setPageNum(1); }}
          style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff", padding: "10px 14px", fontSize: 13, cursor: "pointer" }}>
          <option value="popularity.desc">Most Popular</option>
          <option value="vote_average.desc">Highest Rated</option>
          <option value="release_date.desc">Newest First</option>
          <option value="revenue.desc">Box Office</option>
        </select>
        <select value={year} onChange={e => { setYear(e.target.value); setPageNum(1); }}
          style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff", padding: "10px 14px", fontSize: 13, cursor: "pointer" }}>
          <option value="">Any Year</option>
          {Array.from({ length: 30 }, (_, i) => 2025 - i).map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={rating} onChange={e => { setRating(e.target.value); setPageNum(1); }}
          style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff", padding: "10px 14px", fontSize: 13, cursor: "pointer" }}>
          <option value="">Any Rating</option>
          <option value="8">8+ ★★★★</option>
          <option value="7">7+ ★★★</option>
          <option value="6">6+ ★★</option>
        </select>
      </div>
      {loading
        ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: 16 }}>
          {Array(20).fill(0).map((_, i) => <Skeleton key={i} h={277} r={12} />)}
        </div>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: 16 }}>
          {data?.results?.map(m => <MovieCard key={m.id} movie={m} />)}
        </div>}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 32 }}>
        <button onClick={() => setPageNum(p => Math.max(1, p - 1))} disabled={pageNum === 1}
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff", padding: "10px 20px", cursor: "pointer", fontSize: 14, opacity: pageNum === 1 ? 0.4 : 1 }}>‹ Prev</button>
        <span style={{ color: "#888", padding: "10px 16px", fontSize: 14 }}>Page {pageNum} of {data?.total_pages}</span>
        <button onClick={() => setPageNum(p => p + 1)}
          style={{ background: "#e50914", border: "none", borderRadius: 8, color: "#fff", padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>Next ›</button>
      </div>
    </div>
  );
}

// ─── MOVIE DETAIL PAGE ────────────────────────────────────────────────────────
function DetailPage() {
  const { selectedMovie: movie, toggleWatchlist, watchlist, navigate, ratings, rateMovie } = useApp();
  const { data: details } = useTMDB(`/movie/${movie?.id}`);
  const { data: credits } = useTMDB(`/movie/${movie?.id}/credits`);
  const { data: videos } = useTMDB(`/movie/${movie?.id}/videos`);
  const { data: similar } = useTMDB(`/movie/${movie?.id}/similar`);
  const { data: reviews } = useTMDB(`/movie/${movie?.id}/reviews`);

  if (!movie) return null;

  const inWatchlist = watchlist.find(m => m.id === movie.id);
  const trailer = videos?.results?.find(v => v.type === "Trailer" && v.site === "YouTube");
  const cast = credits?.cast?.slice(0, 8) || [];
  const info = details || movie;
  const runtime = info.runtime ? `${Math.floor(info.runtime / 60)}h ${info.runtime % 60}m` : "N/A";
  const genreNames = info.genres?.map(g => g.name).join(" · ") || "";

  return (
    <div>
      <div style={{ position: "relative", height: 500, overflow: "hidden" }}>
        <img src={`${BACKDROP}${movie.backdrop_path}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.98) 40%, rgba(0,0,0,0.3)), linear-gradient(to top, rgba(0,0,0,0.98), transparent 60%)" }} />
        <button onClick={() => navigate("home")} style={{ position: "absolute", top: 24, left: 24, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#fff", padding: "8px 16px", cursor: "pointer", fontSize: 13 }}>← Back</button>
      </div>

      <div style={{ maxWidth: 1200, margin: "-200px auto 0", padding: "0 32px 60px", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
          <img src={movie.poster_path ? `${POSTER}${movie.poster_path}` : ""} alt={movie.title}
            style={{ width: 200, borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.8)", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 280 }}>
            <h1 style={{ margin: "0 0 8px", fontSize: "clamp(24px, 4vw, 44px)", fontWeight: 900, color: "#fff", fontFamily: "'Bebas Neue','Anton',serif", letterSpacing: 2 }}>{movie.title}</h1>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
              <span style={{ background: "#e50914", color: "#fff", padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>★ {movie.vote_average?.toFixed(1)} IMDb</span>
              {movie.release_date && <span style={{ color: "#888", fontSize: 13 }}>{movie.release_date.slice(0, 4)}</span>}
              <span style={{ color: "#888", fontSize: 13 }}>{runtime}</span>
              {genreNames && <span style={{ color: "#888", fontSize: 13 }}>{genreNames}</span>}
            </div>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 15, lineHeight: 1.8, marginBottom: 20 }}>{movie.overview}</p>
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>Your rating:</p>
              <StarRating movieId={movie.id} size={22} />
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={() => toggleWatchlist(movie)}
                style={{ background: inWatchlist ? "rgba(229,9,20,0.2)" : "#e50914", border: `1px solid #e50914`, borderRadius: 8, color: "#fff", padding: "12px 24px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                {inWatchlist ? "♥ In Watchlist" : "+ Add to Watchlist"}
              </button>
            </div>
          </div>
        </div>

        {trailer && (
          <div style={{ marginTop: 40 }}>
            <h2 style={{ color: "#fff", fontFamily: "'Bebas Neue','Anton',serif", fontSize: 22, marginBottom: 16, letterSpacing: 1 }}>TRAILER</h2>
            <div style={{ borderRadius: 12, overflow: "hidden", aspectRatio: "16/9", maxWidth: 760 }}>
              <iframe src={`https://www.youtube.com/embed/${trailer.key}?rel=0`}
                style={{ width: "100%", height: "100%", border: "none" }} allowFullScreen title="Trailer" />
            </div>
          </div>
        )}

        {cast.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h2 style={{ color: "#fff", fontFamily: "'Bebas Neue','Anton',serif", fontSize: 22, marginBottom: 16, letterSpacing: 1 }}>CAST</h2>
            <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
              {cast.map(c => (
                <div key={c.id} style={{ flexShrink: 0, width: 100, textAlign: "center" }}>
                  {c.profile_path
                    ? <img src={`${THUMB}${c.profile_path}`} style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(229,9,20,0.4)" }} />
                    : <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#1a1a2e", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: 24 }}>👤</div>}
                  <p style={{ margin: "6px 0 2px", color: "#fff", fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{c.name}</p>
                  <p style={{ margin: 0, color: "#888", fontSize: 11, lineHeight: 1.3 }}>{c.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {reviews?.results?.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h2 style={{ color: "#fff", fontFamily: "'Bebas Neue','Anton',serif", fontSize: 22, marginBottom: 16, letterSpacing: 1 }}>REVIEWS</h2>
            {reviews.results.slice(0, 2).map(r => (
              <div key={r.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 20, marginBottom: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e50914", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700 }}>
                    {r.author[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p style={{ margin: 0, color: "#fff", fontSize: 14, fontWeight: 600 }}>{r.author}</p>
                    <p style={{ margin: 0, color: "#888", fontSize: 12 }}>{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 1.7, margin: 0, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.content}</p>
              </div>
            ))}
          </div>
        )}

        {similar?.results?.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h2 style={{ color: "#fff", fontFamily: "'Bebas Neue','Anton',serif", fontSize: 22, marginBottom: 16, letterSpacing: 1 }}>SIMILAR MOVIES</h2>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
              {similar.results.slice(0, 10).map(m => <MovieCard key={m.id} movie={m} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── WATCHLIST PAGE ────────────────────────────────────────────────────────────
function WatchlistPage() {
  const { watchlist, history, navigate, addToHistory } = useApp();
  const [tab, setTab] = useState("watchlist");
  const items = tab === "watchlist" ? watchlist : history;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 32 }}>
      <h1 style={{ margin: "0 0 24px", fontSize: 32, color: "#fff", fontFamily: "'Bebas Neue','Anton',serif", letterSpacing: 2 }}>MY LIBRARY</h1>
      <div style={{ display: "flex", gap: 4, marginBottom: 28, background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {["watchlist", "history"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ background: tab === t ? "#e50914" : "none", border: "none", borderRadius: 7, color: "#fff", padding: "8px 20px", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s", textTransform: "capitalize" }}>
            {t === "watchlist" ? `♥ Watchlist (${watchlist.length})` : `🕐 History (${history.length})`}
          </button>
        ))}
      </div>
      {items.length === 0
        ? <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{tab === "watchlist" ? "🎬" : "📺"}</div>
          <p style={{ color: "#888", fontSize: 16 }}>{tab === "watchlist" ? "Your watchlist is empty. Start adding movies!" : "No watch history yet."}</p>
          <button onClick={() => navigate("home")} style={{ background: "#e50914", border: "none", borderRadius: 8, color: "#fff", padding: "12px 24px", cursor: "pointer", marginTop: 16, fontSize: 14, fontWeight: 700 }}>Browse Movies</button>
        </div>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: 16 }}>
          {items.map(m => <MovieCard key={m.id} movie={m} />)}
        </div>}
    </div>
  );
}

// ─── AI CHATBOT ───────────────────────────────────────────────────────────────
function AIPage() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "👋 Hi! I'm your CineVerse AI assistant. Tell me what kind of movie you're in the mood for, and I'll recommend something perfect! You can ask me things like:\n\n• 'Suggest a scary movie for tonight'\n• 'What are the best sci-fi films of the 2010s?'\n• 'I want something like Interstellar'\n• 'Recommend a feel-good movie'" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottom = useRef();

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(m => [...m, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "You are CineVerse AI, a passionate movie expert assistant. Recommend movies enthusiastically with details like year, director, rating, and why the user would love it. Keep responses concise and helpful. Use emojis sparingly. Format recommendations clearly.",
          messages: [{ role: "user", content: userMsg }]
        })
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Sorry, I couldn't process that. Try again!";
      setMessages(m => [...m, { role: "assistant", text: reply }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", text: "Connection issue. Please check your API setup and try again." }]);
    }
    setLoading(false);
  };

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const suggestions = ["Suggest a thriller for tonight", "Best movies like Inception", "Top 5 sci-fi films ever", "Feel-good comedies 2020s"];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24, height: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 28, color: "#fff", fontFamily: "'Bebas Neue','Anton',serif", letterSpacing: 2 }}>🤖 AI MOVIE ASSISTANT</h1>
        <p style={{ margin: "4px 0 0", color: "#888", fontSize: 13 }}>Powered by Claude AI · Ask me anything about movies</p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "#333 transparent", display: "flex", flexDirection: "column", gap: 16, padding: "4px 0" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "assistant" && (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e50914", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, marginRight: 10 }}>🎬</div>
            )}
            <div style={{
              maxWidth: "75%", padding: "12px 16px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: m.role === "user" ? "#e50914" : "rgba(255,255,255,0.07)",
              border: m.role === "user" ? "none" : "1px solid rgba(255,255,255,0.08)",
              color: "#fff", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap"
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e50914", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎬</div>
            <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "12px 16px" }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#e50914", animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottom} />
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => { setInput(s); }}
              style={{ background: "rgba(229,9,20,0.1)", border: "1px solid rgba(229,9,20,0.3)", borderRadius: 100, color: "#ccc", padding: "5px 12px", cursor: "pointer", fontSize: 11 }}>{s}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, background: "rgba(255,255,255,0.06)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", padding: "4px 4px 4px 16px" }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Ask about movies..." style={{ flex: 1, background: "none", border: "none", color: "#fff", fontSize: 14, outline: "none", padding: "8px 0" }} />
          <button onClick={send} disabled={loading || !input.trim()}
            style={{ background: "#e50914", border: "none", borderRadius: 8, color: "#fff", padding: "10px 20px", cursor: "pointer", fontWeight: 700, fontSize: 14, opacity: (loading || !input.trim()) ? 0.5 : 1 }}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AUTH PAGE ────────────────────────────────────────────────────────────────
function AuthPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", genres: [] });
  const { login, navigate } = useApp();
  const [error, setError] = useState("");

  const submit = () => {
    if (!form.email || !form.password) { setError("Please fill all fields."); return; }
    if (mode === "signup" && !form.name) { setError("Name is required."); return; }
    login({ name: form.name || form.email.split("@")[0], email: form.email, genres: form.genres });
    navigate("home");
  };

  return (
    <div style={{ minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "radial-gradient(ellipse at center, #1a0008 0%, #0a0a0f 60%)" }}>
      <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "40px 48px", width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: 28, color: "#e50914", fontFamily: "'Bebas Neue','Anton',serif", letterSpacing: 3 }}>CINEVERSE</h1>
          <p style={{ margin: 0, color: "#888", fontSize: 14 }}>{mode === "login" ? "Welcome back, cinephile" : "Join the community"}</p>
        </div>

        <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 4, marginBottom: 28 }}>
          {["login", "signup"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              style={{ flex: 1, background: mode === m ? "#e50914" : "none", border: "none", borderRadius: 7, color: "#fff", padding: "8px", cursor: "pointer", fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{m === "login" ? "Sign In" : "Sign Up"}</button>
          ))}
        </div>

        {mode === "signup" && (
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Your Name" style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", padding: "12px 16px", fontSize: 14, outline: "none", marginBottom: 12, boxSizing: "border-box" }} />
        )}
        <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          type="email" placeholder="Email" style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", padding: "12px 16px", fontSize: 14, outline: "none", marginBottom: 12, boxSizing: "border-box" }} />
        <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && submit()}
          type="password" placeholder="Password" style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff", padding: "12px 16px", fontSize: 14, outline: "none", marginBottom: 4, boxSizing: "border-box" }} />

        {mode === "signup" && (
          <div style={{ marginTop: 16, marginBottom: 4 }}>
            <p style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>Pick your favorite genres:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {GENRES.slice(0, 8).map(g => {
                const sel = form.genres.includes(g.id);
                return (
                  <button key={g.id} onClick={() => setForm(f => ({ ...f, genres: sel ? f.genres.filter(x => x !== g.id) : [...f.genres, g.id] }))}
                    style={{ background: sel ? "rgba(229,9,20,0.2)" : "rgba(255,255,255,0.05)", border: `1px solid ${sel ? "#e50914" : "rgba(255,255,255,0.1)"}`, borderRadius: 6, color: sel ? "#fff" : "#888", padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && <p style={{ color: "#e50914", fontSize: 12, margin: "8px 0" }}>{error}</p>}

        <button onClick={submit} style={{ width: "100%", background: "#e50914", border: "none", borderRadius: 10, color: "#fff", padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 20, transition: "opacity 0.2s" }}>
          {mode === "login" ? "Sign In" : "Create Account"}
        </button>
        <p style={{ textAlign: "center", color: "#888", fontSize: 12, marginTop: 16 }}>
          {mode === "login" ? "No account? " : "Already a member? "}
          <span onClick={() => setMode(mode === "login" ? "signup" : "login")} style={{ color: "#e50914", cursor: "pointer" }}>
            {mode === "login" ? "Sign Up" : "Sign In"}
          </span>
        </p>
      </div>
    </div>
  );
}

// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────
function ProfilePage() {
  const { user, favGenres, setFavGenres, watchlist, history, ratings, navigate } = useApp();
  if (!user) { navigate("auth"); return null; }
  const ratingCount = Object.keys(ratings).length;
  const avgRating = ratingCount ? (Object.values(ratings).reduce((a, b) => a + b, 0) / ratingCount).toFixed(1) : "–";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>
      <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 20, padding: 32, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 24, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#e50914", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 900, color: "#fff" }}>
          {user.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, color: "#fff", fontWeight: 800 }}>{user.name}</h1>
          <p style={{ margin: 0, color: "#888", fontSize: 14 }}>{user.email}</p>
        </div>
        <div style={{ display: "flex", gap: 20, marginLeft: "auto", flexWrap: "wrap" }}>
          {[["♥ Watchlist", watchlist.length], ["🕐 Watched", history.length], ["★ Rated", ratingCount], ["Avg Rating", avgRating]].map(([l, v]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#e50914" }}>{v}</p>
              <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.08)" }}>
        <h3 style={{ margin: "0 0 16px", color: "#fff", fontSize: 16, fontWeight: 700 }}>Favorite Genres</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {GENRES.map(g => {
            const sel = favGenres.includes(g.id);
            return (
              <button key={g.id} onClick={() => {
                const next = sel ? favGenres.filter(x => x !== g.id) : [...favGenres, g.id];
                setFavGenres(next); localStorage.setItem("cv_genres", JSON.stringify(next));
              }}
                style={{ background: sel ? "rgba(229,9,20,0.2)" : "rgba(255,255,255,0.05)", border: `1px solid ${sel ? "#e50914" : "rgba(255,255,255,0.1)"}`, borderRadius: 8, color: sel ? "#fff" : "#888", padding: "8px 16px", cursor: "pointer", fontSize: 13 }}>
                {g.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── APP SHELL ────────────────────────────────────────────────────────────────
function App() {
  const { page, darkMode } = useApp();

  const pages = {
    home: <HomePage />,
    discover: <DiscoverPage />,
    watchlist: <WatchlistPage />,
    ai: <AIPage />,
    auth: <AuthPage />,
    detail: <DetailPage />,
    profile: <ProfilePage />
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: darkMode
        ? "linear-gradient(180deg, #0a0a0f 0%, #0d0d1a 100%)"
        : "linear-gradient(180deg, #f0f0f5 0%, #e8e8f0 100%)",
      color: darkMode ? "#fff" : "#111",
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif"
    }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e50914; border-radius: 3px; }
        @keyframes shimmer { 0%,100% { background-position: 200% 0 } 50% { background-position: -200% 0 } }
        @keyframes bounce { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        input::placeholder { color: #555; }
        select option { background: #0f0f1a; color: #fff; }
      `}</style>
      <Nav />
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
        {pages[page] || <HomePage />}
      </div>
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "24px", textAlign: "center", color: "#555", fontSize: 12, marginTop: 40 }}>
        <span style={{ color: "#e50914", fontFamily: "'Bebas Neue','Anton',serif", letterSpacing: 2, fontSize: 16 }}>CINEVERSE</span>
        <span style={{ margin: "0 8px" }}>·</span>
        Powered by TMDB API & Claude AI
        <span style={{ margin: "0 8px" }}>·</span>
        Built with React
      </footer>
    </div>
  );
}

export default function Root() {
  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}
