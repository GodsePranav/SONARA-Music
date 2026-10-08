import { useState, type DragEvent, type JSX } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Heart,
  MoreHorizontal,
  Play,
  Plus,
  Settings2,
  Shuffle,
  Trash2,
  Users,
} from "lucide-react";
import { ApiRequestError, request } from "../lib/api";
import type { PlayerTrack } from "../stores/player";

interface PlaylistData {
  id: string;
  slug: string;
  name: string;
  description: string;
  creatorName: string;
  coverUrl: string | null;
  trackCount: number;
  visibility: "public" | "private";
  isCollaborative: boolean;
  isOwner: boolean;
  canEdit: boolean;
  tracks: PlayerTrack[];
}
interface CatalogData {
  data: PlayerTrack[];
  page: { nextCursor: string | null; hasMore: boolean };
}

export function PlaylistScreen({
  playlistId,
  onPlayTracks,
  onBack,
}: {
  playlistId: string;
  onPlayTracks: (tracks: PlayerTrack[], index: number) => void;
  onBack: () => void;
}): JSX.Element {
  const client = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftCoverUrl, setDraftCoverUrl] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [context, setContext] = useState<{
    trackId: string;
    x: number;
    y: number;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const playlist = useQuery({
    queryKey: ["playlist", playlistId],
    queryFn: () =>
      request<{ data: PlaylistData }>(
        `/playlists/${encodeURIComponent(playlistId)}`,
      ),
  });
  const catalog = useQuery({
    queryKey: ["catalog", "tracks", "add"],
    queryFn: () => request<CatalogData>("/tracks?limit=40"),
  });

  async function update(body: Record<string, unknown>): Promise<void> {
    await request(`/playlists/${encodeURIComponent(playlistId)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    await Promise.all([
      client.invalidateQueries({ queryKey: ["playlist", playlistId] }),
      client.invalidateQueries({ queryKey: ["library"] }),
    ]);
  }
  async function addTrack(trackId: string): Promise<void> {
    setMessage("");
    try {
      await request(`/playlists/${encodeURIComponent(playlistId)}/tracks`, {
        method: "POST",
        body: JSON.stringify({ trackId }),
      });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["playlist", playlistId] }),
        client.invalidateQueries({ queryKey: ["library"] }),
      ]);
    } catch (caught) {
      if (
        caught instanceof ApiRequestError &&
        caught.code === "DUPLICATE_TRACK"
      )
        setDuplicateOpen(true);
      else
        setMessage(
          caught instanceof Error
            ? caught.message
            : "Could not add this track.",
        );
    }
  }
  async function removeTrack(trackId: string): Promise<void> {
    await request(
      `/playlists/${encodeURIComponent(playlistId)}/tracks/${encodeURIComponent(trackId)}`,
      { method: "DELETE" },
    );
    setContext(null);
    await Promise.all([
      client.invalidateQueries({ queryKey: ["playlist", playlistId] }),
      client.invalidateQueries({ queryKey: ["library"] }),
    ]);
  }
  async function reorder(from: number, to: number): Promise<void> {
    const tracks = playlist.data?.data.tracks;
    if (!tracks || from === to || from < 0 || to < 0) return;
    const next = [...tracks];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    client.setQueryData<{ data: PlaylistData }>(
      ["playlist", playlistId],
      (current) =>
        current ? { data: { ...current.data, tracks: next } } : current,
    );
    try {
      await request(
        `/playlists/${encodeURIComponent(playlistId)}/tracks/order`,
        {
          method: "PUT",
          body: JSON.stringify({ trackIds: next.map((track) => track.id) }),
        },
      );
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "Could not save track order.",
      );
      await client.invalidateQueries({ queryKey: ["playlist", playlistId] });
    }
  }
  async function duplicatePlaylist(): Promise<void> {
    await request(`/playlists/${encodeURIComponent(playlistId)}/duplicate`, {
      method: "POST",
    });
    await client.invalidateQueries({ queryKey: ["library"] });
    setMessage("Playlist duplicated in your library.");
    setContext(null);
  }
  async function inviteCollaborator(): Promise<void> {
    try {
      const result = await request<{ data: { inviteToken: string } }>(
        `/playlists/${encodeURIComponent(playlistId)}/invite`,
        { method: "POST" },
      );
      const url = `${window.location.origin}/playlist-invites/${result.data.inviteToken}`;
      await navigator.clipboard.writeText(url);
      setMessage("Invite link copied.");
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "Could not create an invite link.",
      );
    }
  }

  if (playlist.isPending)
    return (
      <section className="playlist-page" aria-busy="true">
        <div className="playlist-skeleton" />
        <p>Loading playlist…</p>
      </section>
    );
  if (playlist.isError)
    return (
      <section className="playlist-page">
        <button className="text-button" onClick={onBack}>
          ← Your Library
        </button>
        <p role="alert">
          This playlist couldn’t load. Check your connection and access.
        </p>
      </section>
    );
  const data = playlist.data.data;
  const trackRows = data.tracks;
  const editPlaylist = (): void => {
    setDraftName(data.name);
    setDraftDescription(data.description);
    setDraftCoverUrl(data.coverUrl ?? "");
    setEditOpen(true);
  };
  async function deletePlaylist(): Promise<void> {
    await request(`/playlists/${encodeURIComponent(playlistId)}`, {
      method: "DELETE",
    });
    await client.invalidateQueries({ queryKey: ["library"] });
    onBack();
  }
  async function likeTrack(trackId: string): Promise<void> {
    await request(`/me/likes/${encodeURIComponent(trackId)}`, {
      method: "PUT",
    });
    await Promise.all([
      client.invalidateQueries({ queryKey: ["likes"] }),
      client.invalidateQueries({ queryKey: ["library"] }),
    ]);
    setMessage("Added to Liked Songs.");
  }
  const onDrop = (event: DragEvent<HTMLDivElement>, index: number): void => {
    event.preventDefault();
    if (dragIndex !== null) void reorder(dragIndex, index);
    setDragIndex(null);
  };

  return (
    <section
      className="playlist-page"
      onClick={() => context && setContext(null)}
    >
      <header className="playlist-hero">
        {data.coverUrl ? (
          <img className="playlist-hero-art" src={data.coverUrl} alt="" />
        ) : (
          <div className="playlist-hero-art playlist-placeholder">
            <Play size={48} />
          </div>
        )}
        <div className="playlist-hero-copy">
          <button className="text-button" onClick={onBack}>
            Your Library
          </button>
          <p className="eyebrow">
            {data.visibility === "public"
              ? "PUBLIC PLAYLIST"
              : "PRIVATE PLAYLIST"}
            {data.isCollaborative ? " · COLLABORATIVE" : ""}
          </p>
          <h1>{data.name}</h1>
          {data.description && <p>{data.description}</p>}
          <small>
            {data.creatorName} · {trackRows.length} songs
          </small>
        </div>
      </header>
      <div className="playlist-actions">
        <button
          className="play-toggle playlist-play"
          aria-label={`Play ${data.name}`}
          onClick={() => trackRows.length && onPlayTracks(trackRows, 0)}
        >
          <Play size={20} fill="black" />
        </button>
        <button
          className="icon-button"
          aria-label="Shuffle playlist"
          onClick={() => {
            if (trackRows.length)
              onPlayTracks(
                [...trackRows].sort(() => Math.random() - 0.5),
                0,
              );
          }}
        >
          <Shuffle size={20} />
        </button>
        {data.canEdit && (
          <button
            className="icon-button"
            aria-label="Edit playlist"
            onClick={editPlaylist}
          >
            <Settings2 size={20} />
          </button>
        )}
        {data.isOwner && data.isCollaborative && (
          <button
            className="icon-button"
            aria-label="Copy collaboration invite"
            onClick={() => void inviteCollaborator()}
          >
            <Users size={20} />
          </button>
        )}
        <button
          className="icon-button"
          aria-label="Duplicate playlist"
          onClick={() => void duplicatePlaylist()}
        >
          <MoreHorizontal size={21} />
        </button>
      </div>
      {message && (
        <p className="library-message" role="status">
          {message}
        </p>
      )}
      <div className="playlist-table-header">
        <span>#</span>
        <span>Title</span>
        <span>Album</span>
        <span>Duration</span>
        <span aria-hidden="true">♡</span>
      </div>
      <div className="playlist-track-list" aria-label="Playlist tracks">
        {trackRows.map((track, index) => (
          <div
            className="playlist-track-row"
            key={track.id}
            draggable={data.canEdit}
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => onDrop(event, index)}
            onDragEnd={() => setDragIndex(null)}
            onContextMenu={(event) => {
              event.preventDefault();
              setContext({
                trackId: track.id,
                x: event.clientX,
                y: event.clientY,
              });
            }}
          >
            <button
              className="track-position"
              aria-label={`Play ${track.title}`}
              onClick={() => onPlayTracks(trackRows, index)}
            >
              {dragIndex === index ? "⋮⋮" : index + 1}
            </button>
            <button
              className="playlist-track-main"
              onClick={() => onPlayTracks(trackRows, index)}
            >
              <img src={track.coverUrl} alt="" />
              <span>
                <strong>{track.title}</strong>
                <small>{track.artistName}</small>
              </span>
            </button>
            <span className="playlist-track-album">
              {track.albumName ?? "Single"}
            </span>
            <span className="playlist-track-duration">
              {Math.floor(track.durationSeconds / 60)}:
              {String(Math.floor(track.durationSeconds % 60)).padStart(2, "0")}
            </span>
            <button
              className="icon-button track-more"
              aria-label={`More options for ${track.title}`}
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setContext({
                  trackId: track.id,
                  x: rect.right,
                  y: rect.bottom,
                });
              }}
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        ))}
        {trackRows.length === 0 && (
          <p className="library-message">
            This playlist is empty. Add a track below.
          </p>
        )}
      </div>
      {data.canEdit && (
        <section className="add-tracks-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">GROW THE MIX</p>
              <h2>Suggested tracks</h2>
            </div>
          </div>
          {catalog.isPending ? (
            <p>Finding tracks…</p>
          ) : catalog.isError ? (
            <p>Track suggestions are unavailable.</p>
          ) : (
            <div className="suggestion-list">
              {catalog.data.data.slice(0, 8).map((track) => (
                <div className="suggestion-row" key={track.id}>
                  <img src={track.coverUrl} alt="" />
                  <span>
                    <strong>{track.title}</strong>
                    <small>{track.artistName}</small>
                  </span>
                  <button
                    className="filter-chip"
                    onClick={() => void addTrack(track.id)}
                  >
                    <Plus size={15} /> Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      {context && (
        <div
          className="library-context-menu"
          style={{
            left: Math.min(context.x, window.innerWidth - 210),
            top: Math.min(context.y, window.innerHeight - 100),
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            onClick={() => {
              const index = trackRows.findIndex(
                (track) => track.id === context.trackId,
              );
              if (index >= 0) onPlayTracks(trackRows, index);
              setContext(null);
            }}
          >
            <Play size={15} /> Play track
          </button>
          <button
            onClick={() =>
              void likeTrack(context.trackId).catch((caught: unknown) =>
                setMessage(
                  caught instanceof Error
                    ? caught.message
                    : "Could not like this track.",
                ),
              )
            }
          >
            <Heart size={15} /> Like track
          </button>
          {data.canEdit && (
            <button
              className="danger-action"
              onClick={() => void removeTrack(context.trackId)}
            >
              <Trash2 size={15} /> Remove from playlist
            </button>
          )}
        </div>
      )}
      {editOpen && (
        <div className="modal-backdrop">
          <section
            className="library-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-playlist-title"
          >
            <button
              className="modal-close"
              aria-label="Close"
              onClick={() => setEditOpen(false)}
            >
              ×
            </button>
            <h2 id="edit-playlist-title">Edit playlist</h2>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void update({
                  name: draftName,
                  description: draftDescription,
                  coverUrl: draftCoverUrl.trim() || null,
                })
                  .then(() => setEditOpen(false))
                  .catch((caught: unknown) =>
                    setMessage(
                      caught instanceof Error
                        ? caught.message
                        : "Could not update playlist.",
                    ),
                  );
              }}
            >
              <label className="field">
                <span>Name</span>
                <input
                  value={draftName}
                  maxLength={160}
                  onChange={(event) => setDraftName(event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  value={draftDescription}
                  maxLength={1000}
                  onChange={(event) => setDraftDescription(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Cover image URL</span>
                <input
                  type="url"
                  value={draftCoverUrl}
                  maxLength={2048}
                  onChange={(event) => setDraftCoverUrl(event.target.value)}
                  placeholder="https://…"
                />
              </label>
              <label className="field">
                <span>Visibility</span>
                <select
                  value={data.visibility}
                  onChange={(event) =>
                    void update({ visibility: event.target.value }).catch(
                      (caught: unknown) =>
                        setMessage(
                          caught instanceof Error
                            ? caught.message
                            : "Could not update visibility.",
                        ),
                    )
                  }
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
              </label>
              <label className="collaborative-toggle">
                <input
                  type="checkbox"
                  checked={data.isCollaborative}
                  onChange={(event) =>
                    void update({
                      isCollaborative: event.target.checked,
                    }).catch((caught: unknown) =>
                      setMessage(
                        caught instanceof Error
                          ? caught.message
                          : "Could not update collaboration.",
                      ),
                    )
                  }
                />{" "}
                Allow collaborators
              </label>
              <button className="pill-button primary" type="submit">
                <Check size={16} /> Save
              </button>
              {data.isOwner && (
                <button
                  className="pill-button danger-action"
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete playlist
                </button>
              )}
            </form>
          </section>
        </div>
      )}
      {duplicateOpen && (
        <div className="modal-backdrop">
          <section
            className="library-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="duplicate-title"
          >
            <span className="modal-icon">
              <Heart size={24} />
            </span>
            <h2 id="duplicate-title">Already in this playlist</h2>
            <p>This track is already here, so it wasn’t added again.</p>
            <button
              className="pill-button primary"
              onClick={() => setDuplicateOpen(false)}
            >
              Got it
            </button>
          </section>
        </div>
      )}
      {deleteOpen && (
        <div className="modal-backdrop">
          <section
            className="library-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-playlist-title"
          >
            <h2 id="delete-playlist-title">Delete this playlist?</h2>
            <p>This removes “{data.name}” from your library.</p>
            <div className="playlist-actions">
              <button
                className="filter-chip"
                onClick={() => setDeleteOpen(false)}
              >
                Cancel
              </button>
              <button
                className="pill-button danger-action"
                onClick={() =>
                  void deletePlaylist().catch((caught: unknown) =>
                    setMessage(
                      caught instanceof Error
                        ? caught.message
                        : "Could not delete playlist.",
                    ),
                  )
                }
              >
                <Trash2 size={16} /> Delete playlist
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
