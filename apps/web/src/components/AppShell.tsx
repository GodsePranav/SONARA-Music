import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type JSX,
} from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Search,
  Library,
  Plus,
  ArrowDownToLine,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  ListMusic,
  MonitorSpeaker,
  Volume2,
  Music2,
  Heart,
  LayoutPanelLeft,
  LogOut,
  PanelRight,
} from "lucide-react";
import { useSession } from "../stores/session";
import { usePlayer } from "../stores/player";
import { request } from "../lib/api";
import { SettingsScreen } from "./SettingsScreen";

const MIN_WIDTH = 72;
const MAX_WIDTH = 420;

export function AppShell(): JSX.Element {
  const location = useLocation();
  const inSettings = location.pathname === "/settings";
  const user = useSession((state) => state.user);
  const clearSession = useSession((state) => state.clearSession);
  const playing = usePlayer((state) => state.isPlaying);
  const togglePlayback = usePlayer((state) => state.toggle);
  const progress = usePlayer((state) => state.progress);
  const setProgress = usePlayer((state) => state.setProgress);
  const volume = usePlayer((state) => state.volume);
  const setVolume = usePlayer((state) => state.setVolume);
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    window.matchMedia("(max-width: 1024px)").matches ? MIN_WIDTH : 280,
  );
  const [rightPanel, setRightPanel] = useState(false);
  const [toast, setToast] = useState("");
  const dragRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onResize = (): void => {
      if (window.matchMedia("(max-width: 1024px)").matches)
        setSidebarWidth(MIN_WIDTH);
      else setSidebarWidth((width) => (width === MIN_WIDTH ? 280 : width));
    };
    const onMove = (event: globalThis.PointerEvent): void => {
      if (dragRef.current)
        setSidebarWidth(
          Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, event.clientX - 8)),
        );
    };
    const onUp = (): void => {
      dragRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  async function logout(): Promise<void> {
    try {
      await request<void>("/auth/logout", { method: "POST" });
    } finally {
      clearSession();
      navigate("/login");
    }
  }

  function showToast(message: string): void {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  const collapsed = sidebarWidth <= MIN_WIDTH + 2;
  return (
    <div className="player-app">
      <header className="topbar">
        <Link className="brand shell-brand" to="/" aria-label="SONARA home">
          <span className="brand-mark">
            <Music2 size={19} strokeWidth={2.8} />
          </span>
          <span>SONARA</span>
        </Link>
        <div className="top-navigation">
          <button
            className="round-control"
            aria-label="Go back"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className="round-control"
            aria-label="Go forward"
            onClick={() => navigate(1)}
          >
            <ChevronRight size={20} />
          </button>
          <NavLink to="/search" className="search-entry">
            <Search size={20} />
            <span>What do you want to play?</span>
            <kbd>/</kbd>
          </NavLink>
        </div>
        <div className="top-actions">
          <button
            className="quiet-button premium-link"
            onClick={() => showToast("Premium preview is coming soon.")}
          >
            Explore Premium
          </button>
          <button
            className="quiet-button install-link"
            onClick={() =>
              showToast("Install options will appear when the app is ready.")
            }
          >
            <ArrowDownToLine size={16} /> Install app
          </button>
          <span className="top-divider" />
          <button
            className="avatar-button"
            aria-label={`Account: ${user?.displayName ?? "Listener"}`}
            title={user?.displayName}
            onClick={() => navigate("/settings")}
          >
            {user?.displayName.slice(0, 1).toUpperCase() ?? "S"}
          </button>
          <button
            className="icon-button logout-button"
            aria-label="Log out"
            onClick={() => void logout()}
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>
      <main className="workspace">
        <aside
          className={`sidebar panel ${collapsed ? "is-collapsed" : ""}`}
          style={{ width: `${sidebarWidth}px` }}
        >
          <div className="sidebar-nav">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
              title={collapsed ? "Home" : undefined}
            >
              <Home size={21} />
              <span>Home</span>
            </NavLink>
            <NavLink
              to="/search"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
              title={collapsed ? "Search" : undefined}
            >
              <Search size={21} />
              <span>Search</span>
            </NavLink>
          </div>
          <section className="library-section">
            <div className="library-heading">
              <button
                className="sidebar-link library-trigger"
                onClick={() => navigate("/library")}
                title={collapsed ? "Your library" : undefined}
              >
                <Library size={21} />
                <span>Your Library</span>
              </button>
              <button
                className="icon-button library-add"
                aria-label="Create playlist"
                onClick={() =>
                  showToast("Playlist creation is in the next phase.")
                }
              >
                <Plus size={19} />
              </button>
            </div>
            {!collapsed && (
              <div className="library-content">
                <div className="library-tools">
                  <button className="filter-chip active">Playlists</button>
                  <button className="filter-chip">Artists</button>
                  <button className="filter-chip">Albums</button>
                </div>
                <button
                  className="library-empty"
                  onClick={() =>
                    showToast("Create a playlist to start your collection.")
                  }
                >
                  <span className="empty-art">
                    <Heart size={21} fill="white" />
                  </span>
                  <span>
                    <strong>Liked Songs</strong>
                    <small>Playlist · {user?.displayName ?? "You"}</small>
                  </span>
                </button>
                <p className="library-hint">
                  Your saved music and podcasts will live here.
                </p>
              </div>
            )}
            {!collapsed && (
              <div className="sidebar-legal">
                <a href="#legal">Legal</a>
                <a href="#privacy">Privacy</a>
                <a href="#cookies">Cookies</a>
              </div>
            )}
          </section>
          <button
            className="resize-handle"
            aria-label="Resize library sidebar"
            title="Drag to resize"
            onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
              dragRef.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
              document.body.style.cursor = "col-resize";
              document.body.style.userSelect = "none";
            }}
          />
        </aside>
        <section className="main-panel panel">
          <div className={`main-panel-top ${inSettings ? "settings-top" : ""}`}>
            {!inSettings && (
              <>
                <button className="filter-chip active">All</button>
                <button className="filter-chip">Music</button>
                <button className="filter-chip">Podcasts</button>
              </>
            )}
            <button
              className="icon-button panel-toggle"
              aria-label={
                rightPanel ? "Close right panel" : "Open now playing panel"
              }
              onClick={() => setRightPanel((value) => !value)}
            >
              <PanelRight size={18} />
            </button>
          </div>
          <div
            className={`page-content ${inSettings ? "settings-content" : ""}`}
          >
            {inSettings ? (
              <SettingsScreen />
            ) : (
              <>
                <section className="welcome-banner">
                  <p className="eyebrow">A NEW DAY, A NEW SOUND</p>
                  <h1>
                    Good evening
                    {user?.displayName
                      ? `, ${user.displayName.split(" ")[0]}`
                      : ""}
                    .
                  </h1>
                  <p>Your next favorite is closer than you think.</p>
                  <button
                    className="pill-button primary welcome-cta"
                    onClick={() => navigate("/search")}
                  >
                    Find your sound <Search size={17} />
                  </button>
                  <div className="banner-orb orb-one" />
                  <div className="banner-orb orb-two" />
                  <div className="banner-orb orb-three" />
                </section>
                <section className="quick-grid" aria-label="Shortcuts">
                  <div className="quick-card">
                    <span className="quick-cover liked-cover">
                      <Heart size={24} fill="white" />
                    </span>
                    <strong>Liked Songs</strong>
                    <button
                      className="quick-play"
                      aria-label="Play Liked Songs"
                      onClick={() =>
                        showToast("Add licensed tracks to start listening.")
                      }
                    >
                      <Play size={19} fill="black" />
                    </button>
                  </div>
                  {[
                    "Daily Mix",
                    "Fresh Finds",
                    "Easy Listening",
                    "On repeat",
                    "New releases",
                  ].map((item, index) => (
                    <div className="quick-card" key={item}>
                      <span
                        className={`quick-cover gradient-cover gradient-${index}`}
                      >
                        <Music2 size={23} />
                      </span>
                      <strong>{item}</strong>
                      <button
                        className="quick-play"
                        aria-label={`Play ${item}`}
                        onClick={() =>
                          showToast("Licensed tracks are needed for playback.")
                        }
                      >
                        <Play size={19} fill="black" />
                      </button>
                    </div>
                  ))}
                </section>
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">MADE FOR YOUR MOMENTS</p>
                    <h2>Good things find their way back</h2>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => navigate("/search")}
                  >
                    Show all
                  </button>
                </div>
                <section className="shelf-grid" aria-label="Discover music">
                  {[
                    {
                      title: "A sound of your own",
                      label: "Your next listening ritual",
                      tone: "shelf-green",
                    },
                    {
                      title: "A softer kind of Sunday",
                      label: "Ease into the evening",
                      tone: "shelf-plum",
                    },
                    {
                      title: "Find your forward",
                      label: "New music, fresh energy",
                      tone: "shelf-blue",
                    },
                    {
                      title: "The long way home",
                      label: "Stay for one more song",
                      tone: "shelf-amber",
                    },
                  ].map((card) => (
                    <button
                      className="discover-card"
                      key={card.title}
                      onClick={() =>
                        showToast(
                          "Your personalized shelves are being prepared.",
                        )
                      }
                    >
                      <span className={`discover-art ${card.tone}`}>
                        <Music2 size={40} />
                        <span className="art-spark">✳</span>
                      </span>
                      <strong>{card.title}</strong>
                      <small>{card.label}</small>
                      <span className="discover-play">
                        <Play size={19} fill="black" />
                      </span>
                    </button>
                  ))}
                </section>
                <footer className="content-footer">
                  <span>Music is better when it feels like yours.</span>
                  <span>SONARA · 2026</span>
                </footer>
              </>
            )}
          </div>
        </section>
        {rightPanel && (
          <aside className="right-panel panel">
            <div className="right-panel-heading">
              <strong>Now playing</strong>
              <button
                className="icon-button"
                aria-label="Close panel"
                onClick={() => setRightPanel(false)}
              >
                <LayoutPanelLeft size={18} />
              </button>
            </div>
            <div className="right-panel-empty">
              <span className="now-playing-art">
                <Music2 size={48} />
              </span>
              <h2>Room for your next favorite</h2>
              <p>Play something from a licensed catalog to see what’s on.</p>
              <button
                className="text-button"
                onClick={() => navigate("/search")}
              >
                Explore music
              </button>
            </div>
          </aside>
        )}
      </main>
      <nav className="mobile-tabs" aria-label="Primary navigation">
        <NavLink to="/" end>
          <Home size={20} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/search">
          <Search size={20} />
          <span>Search</span>
        </NavLink>
        <NavLink to="/library">
          <Library size={20} />
          <span>Your Library</span>
        </NavLink>
      </nav>
      <footer className="player-bar" aria-label="Audio player">
        <div className="track-summary">
          <div className="mini-cover">
            <Music2 size={21} />
          </div>
          <div className="track-meta">
            <strong>Find something to play</strong>
            <span>SONARA</span>
          </div>
          <button
            className="icon-button like-control"
            aria-label="Like current track"
            onClick={() => showToast("Added to Liked Songs")}
          >
            <Heart size={18} />
          </button>
        </div>
        <div className="player-center">
          <div className="player-controls">
            <button
              className="icon-button auxiliary-control"
              aria-label="Shuffle"
            >
              <Shuffle size={17} />
            </button>
            <button className="icon-button" aria-label="Previous track">
              <SkipBack size={19} fill="currentColor" />
            </button>
            <button
              className="play-toggle"
              onClick={togglePlayback}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause size={18} fill="black" />
              ) : (
                <Play size={18} fill="black" />
              )}
            </button>
            <button className="icon-button" aria-label="Next track">
              <SkipForward size={19} fill="currentColor" />
            </button>
            <button
              className="icon-button auxiliary-control"
              aria-label="Repeat"
            >
              <Repeat size={17} />
            </button>
          </div>
          <div className="timeline">
            <span className="tabular">0:00</span>
            <input
              aria-label="Seek track"
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(event) => setProgress(Number(event.target.value))}
              style={{ "--range-progress": `${progress}%` } as CSSProperties}
            />
            <span className="tabular">0:00</span>
          </div>
        </div>
        <div className="player-extras">
          <button className="icon-button extra-button" aria-label="Queue">
            <ListMusic size={18} />
          </button>
          <button
            className="icon-button extra-button"
            aria-label="Connect to a device"
          >
            <MonitorSpeaker size={18} />
          </button>
          <Volume2 size={18} className="volume-icon" />
          <input
            aria-label="Volume"
            type="range"
            min="0"
            max="100"
            value={Math.round(volume * 100)}
            onChange={(event) => setVolume(Number(event.target.value) / 100)}
            style={
              {
                "--range-progress": `${Math.round(volume * 100)}%`,
              } as CSSProperties
            }
          />
        </div>
      </footer>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
