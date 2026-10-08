import { useState, type FormEvent, type JSX } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  ListMusic,
  Plus,
  Search,
  Music2,
  Grid2X2,
  Rows3,
} from "lucide-react";
import { request } from "../lib/api";

interface PlaylistSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  creatorName: string;
  coverUrl: string | null;
  trackCount: number;
  visibility: "public" | "private";
  isCollaborative: boolean;
}
interface LibraryResponse {
  data: { likedSongs: { trackCount: number }; playlists: PlaylistSummary[] };
}

export function LibraryScreen({
  onOpenPlaylist,
  onOpenLikedSongs,
}: {
  onOpenPlaylist: (id: string) => void;
  onOpenLikedSongs: () => void;
}): JSX.Element {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [sort, setSort] = useState<"recent" | "alphabetical" | "creator">(
    "recent",
  );
  const [view, setView] = useState<"grid" | "list">("grid");
  const library = useQuery({
    queryKey: ["library"],
    queryFn: () => request<LibraryResponse>("/library"),
  });

  async function createPlaylist(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setError("");
    try {
      const result = await request<{ data: PlaylistSummary }>("/playlists", {
        method: "POST",
        body: JSON.stringify({ name, visibility: "private" }),
      });
      await queryClient.invalidateQueries({ queryKey: ["library"] });
      setCreateOpen(false);
      setName("");
      onOpenPlaylist(result.data.id);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not create playlist.",
      );
    }
  }

  const items = [...(library.data?.data.playlists ?? [])]
    .filter((item) =>
      `${item.name} ${item.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((left, right) =>
      sort === "alphabetical"
        ? left.name.localeCompare(right.name)
        : sort === "creator"
          ? left.creatorName.localeCompare(right.creatorName)
          : 0,
    );

  return (
    <section className="library-page" aria-labelledby="library-title">
      <div className="section-heading library-page-heading">
        <div>
          <p className="eyebrow">YOUR MUSIC, TOGETHER</p>
          <h1 id="library-title">Your Library</h1>
        </div>
        <button
          className="pill-button primary"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={17} /> Create playlist
        </button>
      </div>
      <div className="library-page-tools">
        <label className="library-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your library"
            aria-label="Search your library"
          />
        </label>
        <div
          className="library-view-switch"
          role="group"
          aria-label="Library layout"
        >
          <button
            className={view === "grid" ? "active" : ""}
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
          >
            <Grid2X2 size={17} />
          </button>
          <button
            className={view === "list" ? "active" : ""}
            aria-label="List view"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <Rows3 size={17} />
          </button>
        </div>
        <label className="library-sort">
          Sort{" "}
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
          >
            <option value="recent">Recently updated</option>
            <option value="alphabetical">Alphabetical</option>
            <option value="creator">Creator</option>
          </select>
        </label>
      </div>
      {library.isPending ? (
        <div className="library-loading" aria-busy="true">
          Loading your library…
        </div>
      ) : library.isError ? (
        <p className="library-message" role="alert">
          Your library couldn’t load. Check that you’re signed in and the API is
          running.
        </p>
      ) : (
        <div
          className={`library-card-grid ${view === "list" ? "is-list" : ""}`}
        >
          <button
            className="library-card liked-library-card"
            onClick={onOpenLikedSongs}
          >
            <span className="library-card-art liked-cover">
              <Heart fill="white" size={28} />
            </span>
            <strong>Liked Songs</strong>
            <small>
              {library.data.data.likedSongs.trackCount} saved tracks
            </small>
          </button>
          {items.map((playlist) => (
            <button
              className="library-card"
              key={playlist.id}
              onClick={() => onOpenPlaylist(playlist.id)}
            >
              <span className="library-card-art">
                {playlist.coverUrl ? (
                  <img src={playlist.coverUrl} alt="" loading="lazy" />
                ) : (
                  <ListMusic size={34} />
                )}
              </span>
              <strong>{playlist.name}</strong>
              <small>
                {playlist.trackCount} tracks · {playlist.visibility}
                {playlist.isCollaborative ? " · collaborative" : ""}
              </small>
            </button>
          ))}
          {items.length === 0 && (
            <p className="library-message">
              {query
                ? "No saved items match your search."
                : "Your playlists will appear here."}
            </p>
          )}
        </div>
      )}
      {createOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCreateOpen(false);
          }}
        >
          <section
            className="library-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-playlist-title"
          >
            <button
              className="modal-close"
              aria-label="Close"
              onClick={() => setCreateOpen(false)}
            >
              ×
            </button>
            <span className="modal-icon">
              <Music2 size={25} />
            </span>
            <h2 id="create-playlist-title">Create a playlist</h2>
            <p>Give your collection a name. You can add tracks next.</p>
            <form onSubmit={(event) => void createPlaylist(event)}>
              <label className="field">
                <span>Playlist name</span>
                <input
                  autoFocus
                  maxLength={160}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
              {error && (
                <p className="form-message error-message" role="alert">
                  {error}
                </p>
              )}
              <button className="pill-button primary" type="submit">
                Create
              </button>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
