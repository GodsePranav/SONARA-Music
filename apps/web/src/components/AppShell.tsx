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
import { useQuery } from "@tanstack/react-query";
import { useSession } from "../stores/session";
import { usePlayer, type PlayerTrack } from "../stores/player";
import { apiUrl, request } from "../lib/api";
import { SettingsScreen } from "./SettingsScreen";
import { LibraryScreen } from "./LibraryScreen";
import { PlaylistScreen } from "./PlaylistScreen";
import { LikedSongsScreen } from "./LikedSongsScreen";
import { InviteAcceptScreen } from "./InviteAcceptScreen";

const MIN_WIDTH = 72;
const MAX_WIDTH = 420;

export function AppShell({
  preview = false,
}: {
  preview?: boolean;
}): JSX.Element {
  const location = useLocation();
  const inSettings = location.pathname.endsWith("/settings");
  const pagePath = location.pathname.replace(/^\/preview(?=\/|$)/, "") || "/";
  const playlistMatch = pagePath.match(/^\/playlist\/([^/]+)$/);
  const inviteMatch = pagePath.match(/^\/playlist-invites\/([^/]+)$/);
  const route = (path: string): string =>
    preview ? `/preview${path === "/" ? "" : path}` : path;
  const user = useSession((state) => state.user);
  const clearSession = useSession((state) => state.clearSession);
  const playing = usePlayer((state) => state.isPlaying);
  const progress = usePlayer((state) => state.progress);
  const setProgress = usePlayer((state) => state.setProgress);
  const volume = usePlayer((state) => state.volume);
  const setVolume = usePlayer((state) => state.setVolume);
  const playerTrack = usePlayer((state) => state.currentTrack);
  const queue = usePlayer((state) => state.queue);
  const duration = usePlayer((state) => state.duration);
  const setDuration = usePlayer((state) => state.setDuration);
  const setTrack = usePlayer((state) => state.setTrack);
  const playNext = usePlayer((state) => state.playNext);
  const playPrevious = usePlayer((state) => state.playPrevious);
  const repeat = usePlayer((state) => state.repeat);
  const setRepeat = usePlayer((state) => state.setRepeat);
  const shuffle = usePlayer((state) => state.shuffle);
  const toggleShuffle = usePlayer((state) => state.toggleShuffle);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastPlaybackSaveRef = useRef(0);
  const playbackRestoreRef = useRef(false);
  const tracksQuery = useQuery({
    queryKey: ["catalog", "tracks"],
    queryFn: () =>
      request<{
        data: PlayerTrack[];
        page: { nextCursor: string | null; hasMore: boolean };
      }>("/tracks?limit=24"),
  });
  const libraryQuery = useQuery({
    queryKey: ["library"],
    queryFn: () =>
      request<{
        data: {
          playlists: Array<{
            id: string;
            name: string;
            coverUrl: string | null;
            trackCount: number;
          }>;
          likedSongs: { trackCount: number };
        };
      }>("/library"),
    enabled: Boolean(user),
  });
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    window.matchMedia("(max-width: 1024px)").matches ? MIN_WIDTH : 280,
  );
  const [rightPanel, setRightPanel] = useState(false);
  const [toast, setToast] = useState("");
  const dragRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !playerTrack) return;
    let cancelled = false;
    void request<{ data: { url: string } }>(
      `/tracks/${encodeURIComponent(playerTrack.id)}/stream-url`,
      { method: "POST" },
    )
      .then(({ data }) => {
        if (cancelled) return;
        const streamUrl = apiUrl(data.url);
        if (audio.src !== streamUrl) audio.src = streamUrl;
        audio.volume = usePlayer.getState().volume;
        audio.load();
        const state = usePlayer.getState();
        if (state.progress > 0 && state.duration > 0) {
          audio.currentTime = (state.progress / 100) * state.duration;
        }
        if (state.isPlaying) return audio.play();
        return undefined;
      })
      .catch(() => {
        if (!cancelled) {
          usePlayer.setState({ isPlaying: false });
          showToast("This licensed track could not be played.");
          playNext();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [playerTrack, playNext]);

  useEffect(() => {
    if (preview || !user || playbackRestoreRef.current) return;
    playbackRestoreRef.current = true;
    void request<{
      data: { track: PlayerTrack; positionSeconds: number } | null;
    }>("/me/playback")
      .then(({ data }) => {
        if (!data) return;
        setTrack(data.track, []);
        usePlayer.setState({
          isPlaying: false,
          duration: data.track.durationSeconds,
          progress: Math.min(
            100,
            (data.positionSeconds / data.track.durationSeconds) * 100,
          ),
        });
      })
      .catch(() => undefined);
  }, [preview, setTrack, user]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing && playerTrack)
      void audio.play().catch(() => usePlayer.setState({ isPlaying: false }));
    else audio.pause();
  }, [playing, playerTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!playerTrack || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: playerTrack.title,
      artist: playerTrack.artistName,
      album: playerTrack.albumName ?? "SONARA",
      artwork: [
        { src: playerTrack.coverUrl, sizes: "512x512", type: "image/jpeg" },
      ],
    });
    navigator.mediaSession.setActionHandler("play", () =>
      usePlayer.setState({ isPlaying: true }),
    );
    navigator.mediaSession.setActionHandler("pause", () =>
      usePlayer.setState({ isPlaying: false }),
    );
    navigator.mediaSession.setActionHandler("nexttrack", () => playNext());
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      const audio = audioRef.current;
      if (audio && audio.currentTime > 3) audio.currentTime = 0;
      else playPrevious();
    });
    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
    };
  }, [playerTrack, playNext, playPrevious]);

  function playFromCatalog(track: PlayerTrack): void {
    const tracks = tracksQuery.data?.data ?? [];
    const index = tracks.findIndex((item) => item.id === track.id);
    setTrack(track, tracks.slice(index + 1));
  }

  function onAudioTime(): void {
    const audio = audioRef.current;
    if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
      setProgress((audio.currentTime / audio.duration) * 100);
      setDuration(audio.duration);
      const now = Date.now();
      if (user && playerTrack && now - lastPlaybackSaveRef.current >= 8000) {
        lastPlaybackSaveRef.current = now;
        void request<void>("/me/playback", {
          method: "PUT",
          body: JSON.stringify({
            trackId: playerTrack.id,
            positionSeconds: audio.currentTime,
          }),
        }).catch(() => undefined);
      }
    }
  }

  function seekTo(percent: number): void {
    setProgress(percent);
    const audio = audioRef.current;
    if (audio && Number.isFinite(audio.duration))
      audio.currentTime = (percent / 100) * audio.duration;
  }

  function skipNext(): void {
    if (repeat === "track" && audioRef.current) {
      audioRef.current.currentTime = 0;
      void audioRef.current.play();
      return;
    }
    playNext();
  }

  function formatTime(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  }

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
        <Link
          className="brand shell-brand"
          to={route("/")}
          aria-label="SONARA home"
        >
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
          <NavLink to={route("/search")} className="search-entry">
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
            onClick={() => navigate(route("/settings"))}
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
              to={route("/")}
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
              to={route("/search")}
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
                onClick={() => navigate(route("/library"))}
                title={collapsed ? "Your library" : undefined}
              >
                <Library size={21} />
                <span>Your Library</span>
              </button>
              <button
                className="icon-button library-add"
                aria-label="Create playlist"
                onClick={() => navigate(route("/library"))}
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
                  onClick={() => navigate(route("/library/liked"))}
                >
                  <span className="empty-art">
                    <Heart size={21} fill="white" />
                  </span>
                  <span>
                    <strong>Liked Songs</strong>
                    <small>
                      {libraryQuery.data?.data.likedSongs.trackCount ?? 0} saved
                      tracks
                    </small>
                  </span>
                </button>
                {libraryQuery.data?.data.playlists
                  .slice(0, 12)
                  .map((playlist) => (
                    <button
                      className="library-empty"
                      key={playlist.id}
                      onClick={() =>
                        navigate(route(`/playlist/${playlist.id}`))
                      }
                    >
                      <span className="empty-art">
                        {playlist.coverUrl ? (
                          <img src={playlist.coverUrl} alt="" />
                        ) : (
                          <Music2 size={19} />
                        )}
                      </span>
                      <span>
                        <strong>{playlist.name}</strong>
                        <small>Playlist · {playlist.trackCount} songs</small>
                      </span>
                    </button>
                  ))}
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
            ) : pagePath === "/library" ? (
              <LibraryScreen
                onOpenPlaylist={(id) => navigate(route(`/playlist/${id}`))}
                onOpenLikedSongs={() => navigate(route("/library/liked"))}
              />
            ) : pagePath === "/library/liked" ? (
              <LikedSongsScreen
                onBack={() => navigate(route("/library"))}
                onPlayTracks={(tracks, index) => {
                  const track = tracks[index];
                  if (track) setTrack(track, tracks.slice(index + 1));
                }}
              />
            ) : playlistMatch ? (
              <PlaylistScreen
                playlistId={decodeURIComponent(playlistMatch[1]!)}
                onBack={() => navigate(route("/library"))}
                onPlayTracks={(tracks, index) => {
                  const track = tracks[index];
                  if (track) setTrack(track, tracks.slice(index + 1));
                }}
              />
            ) : inviteMatch ? (
              <InviteAcceptScreen token={decodeURIComponent(inviteMatch[1]!)} />
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
                    onClick={() => navigate(route("/search"))}
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
                      onClick={() => navigate(route("/library/liked"))}
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
                    onClick={() => navigate(route("/search"))}
                  >
                    Show all
                  </button>
                </div>
                {tracksQuery.isPending ? (
                  <section
                    className="shelf-grid"
                    aria-label="Loading catalog"
                    aria-busy="true"
                  >
                    {Array.from({ length: 4 }, (_, index) => (
                      <div className="discover-card" key={index}>
                        <span className="discover-art shelf-green" />
                        <strong>Loading track…</strong>
                      </div>
                    ))}
                  </section>
                ) : tracksQuery.isError ? (
                  <p role="status">
                    Catalog is unavailable. Start the API and run the catalog
                    seed to load music.
                  </p>
                ) : tracksQuery.data.data.length === 0 ? (
                  <p role="status">
                    No tracks yet. Configure Jamendo and run the catalog seed to
                    add licensed music.
                  </p>
                ) : (
                  <section className="shelf-grid" aria-label="Licensed catalog">
                    {tracksQuery.data.data.slice(0, 12).map((track) => (
                      <button
                        className="discover-card"
                        key={track.id}
                        onClick={() => playFromCatalog(track)}
                        aria-label={`Play ${track.title} by ${track.artistName}`}
                      >
                        <span className="discover-art">
                          <img src={track.coverUrl} alt="" loading="lazy" />
                        </span>
                        <strong>{track.title}</strong>
                        <small>{track.artistName}</small>
                        <span className="discover-play">
                          <Play size={19} fill="black" />
                        </span>
                      </button>
                    ))}
                  </section>
                )}
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
            {playerTrack ? (
              <div className="right-panel-empty">
                <img
                  className="now-playing-art"
                  src={playerTrack.coverUrl}
                  alt="Cover art"
                />
                <h2>{playerTrack.title}</h2>
                <p>{playerTrack.artistName}</p>
                <h3>Next in queue</h3>
                {queue.slice(0, 5).map((track) => (
                  <p key={track.id}>
                    {track.title} · {track.artistName}
                  </p>
                ))}
              </div>
            ) : (
              <div className="right-panel-empty">
                <span className="now-playing-art">
                  <Music2 size={48} />
                </span>
                <h2>Room for your next favorite</h2>
                <p>Play something from a licensed catalog to see what’s on.</p>
                <button
                  className="text-button"
                  onClick={() => navigate(route("/search"))}
                >
                  Explore music
                </button>
              </div>
            )}
          </aside>
        )}
      </main>
      <nav className="mobile-tabs" aria-label="Primary navigation">
        <NavLink to={route("/")} end>
          <Home size={20} />
          <span>Home</span>
        </NavLink>
        <NavLink to={route("/search")}>
          <Search size={20} />
          <span>Search</span>
        </NavLink>
        <NavLink to={route("/library")}>
          <Library size={20} />
          <span>Your Library</span>
        </NavLink>
      </nav>
      <footer className="player-bar" aria-label="Audio player">
        <audio
          ref={audioRef}
          className="player-audio"
          preload="auto"
          onTimeUpdate={onAudioTime}
          onLoadedMetadata={onAudioTime}
          onEnded={skipNext}
          onError={() => {
            if (playerTrack) {
              showToast("The source could not play this track. Skipping it.");
              playNext();
            }
          }}
        />
        <div className="track-summary">
          {playerTrack ? (
            <img className="mini-cover" src={playerTrack.coverUrl} alt="" />
          ) : (
            <div className="mini-cover">
              <Music2 size={21} />
            </div>
          )}
          <div className="track-meta">
            <strong>{playerTrack?.title ?? "Find something to play"}</strong>
            <span>{playerTrack?.artistName ?? "SONARA"}</span>
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
              className={`icon-button auxiliary-control ${shuffle ? "active" : ""}`}
              aria-label="Shuffle"
              onClick={toggleShuffle}
            >
              <Shuffle size={17} />
            </button>
            <button
              className="icon-button"
              aria-label="Previous track"
              onClick={() => {
                const audio = audioRef.current;
                if (audio && audio.currentTime > 3) audio.currentTime = 0;
                else playPrevious();
              }}
            >
              <SkipBack size={19} fill="currentColor" />
            </button>
            <button
              className="play-toggle"
              onClick={() =>
                playerTrack
                  ? usePlayer.setState({ isPlaying: !playing })
                  : tracksQuery.data?.data[0] &&
                    playFromCatalog(tracksQuery.data.data[0])
              }
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause size={18} fill="black" />
              ) : (
                <Play size={18} fill="black" />
              )}
            </button>
            <button
              className="icon-button"
              aria-label="Next track"
              onClick={skipNext}
            >
              <SkipForward size={19} fill="currentColor" />
            </button>
            <button
              className={`icon-button auxiliary-control ${repeat !== "off" ? "active" : ""}`}
              aria-label={`Repeat ${repeat}`}
              onClick={setRepeat}
            >
              <Repeat size={17} />
            </button>
          </div>
          <div className="timeline">
            <span className="tabular">
              {formatTime((progress / 100) * duration)}
            </span>
            <input
              aria-label="Seek track"
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(event) => seekTo(Number(event.target.value))}
              style={{ "--range-progress": `${progress}%` } as CSSProperties}
            />
            <span className="tabular">{formatTime(duration)}</span>
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
