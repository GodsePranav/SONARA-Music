import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Play, Trash2 } from "lucide-react";
import { request } from "../lib/api";
import type { PlayerTrack } from "../stores/player";

interface LikedTrack extends PlayerTrack {
  likedAt: string;
}

export function LikedSongsScreen({
  onPlayTracks,
  onBack,
}: {
  onPlayTracks: (tracks: PlayerTrack[], index: number) => void;
  onBack: () => void;
}) {
  const client = useQueryClient();
  const likes = useQuery({
    queryKey: ["likes"],
    queryFn: () => request<{ data: LikedTrack[] }>("/me/likes"),
  });

  async function remove(trackId: string): Promise<void> {
    await request(`/me/likes/${encodeURIComponent(trackId)}`, {
      method: "DELETE",
    });
    await Promise.all([
      client.invalidateQueries({ queryKey: ["likes"] }),
      client.invalidateQueries({ queryKey: ["library"] }),
    ]);
  }

  return (
    <section className="playlist-page liked-songs-page">
      <header className="playlist-hero">
        <span className="playlist-hero-art liked-cover">
          <Heart size={50} fill="white" />
        </span>
        <div className="playlist-hero-copy">
          <button className="text-button" onClick={onBack}>
            Your Library
          </button>
          <p className="eyebrow">YOUR COLLECTION</p>
          <h1>Liked Songs</h1>
          <small>{likes.data?.data.length ?? 0} saved tracks</small>
        </div>
      </header>
      <div className="playlist-actions">
        <button
          className="play-toggle playlist-play"
          aria-label="Play Liked Songs"
          disabled={!likes.data?.data.length}
          onClick={() =>
            likes.data?.data.length && onPlayTracks(likes.data.data, 0)
          }
        >
          <Play size={20} fill="black" />
        </button>
      </div>
      {likes.isPending ? (
        <p>Loading liked songs…</p>
      ) : likes.isError ? (
        <p role="alert">
          Liked Songs couldn’t load. Check that you’re signed in and the API is
          running.
        </p>
      ) : likes.data.data.length === 0 ? (
        <p className="library-message">Tracks you like will show up here.</p>
      ) : (
        <div className="playlist-track-list">
          {likes.data.data.map((track, index) => (
            <div className="playlist-track-row" key={track.id}>
              <button
                className="track-position"
                aria-label={`Play ${track.title}`}
                onClick={() => onPlayTracks(likes.data.data, index)}
              >
                {index + 1}
              </button>
              <button
                className="playlist-track-main"
                onClick={() => onPlayTracks(likes.data.data, index)}
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
                {String(track.durationSeconds % 60).padStart(2, "0")}
              </span>
              <button
                className="icon-button track-more"
                aria-label={`Remove ${track.title} from Liked Songs`}
                onClick={() => void remove(track.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
