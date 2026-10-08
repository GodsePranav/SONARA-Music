import { beforeEach, describe, expect, it } from "vitest";
import { usePlayer } from "./player";

describe("player UI state", () => {
  beforeEach(() =>
    usePlayer.setState({
      isPlaying: false,
      progress: 0,
      volume: 0.72,
      currentTrack: null,
      queue: [],
      originalQueue: [],
      contextTracks: [],
      previousTracks: [],
      repeat: "off",
      shuffle: false,
    }),
  );

  it("toggles playback state", () => {
    usePlayer.getState().toggle();
    expect(usePlayer.getState().isPlaying).toBe(true);
    usePlayer.getState().toggle();
    expect(usePlayer.getState().isPlaying).toBe(false);
  });

  it("stores seek and volume changes", () => {
    usePlayer.getState().setProgress(35);
    usePlayer.getState().setVolume(0.4);
    expect(usePlayer.getState().progress).toBe(35);
    expect(usePlayer.getState().volume).toBe(0.4);
  });

  it("advances the playback queue and cycles repeat modes", () => {
    const first = {
      id: "1",
      title: "One",
      artistId: "a",
      artistName: "Artist",
      albumId: null,
      albumName: null,
      coverUrl: "https://example.com/cover.jpg",
      durationSeconds: 120,
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      tags: [],
      explicit: false,
    };
    const second = { ...first, id: "2", title: "Two" };
    usePlayer.getState().setTrack(first, [second]);
    usePlayer.getState().playNext();
    expect(usePlayer.getState().currentTrack?.id).toBe("2");
    expect(usePlayer.getState().progress).toBe(0);
    expect(usePlayer.getState().queue).toHaveLength(0);
    usePlayer.getState().setRepeat();
    usePlayer.getState().setRepeat();
    expect(usePlayer.getState().repeat).toBe("track");
    usePlayer.getState().playPrevious();
    expect(usePlayer.getState().currentTrack?.id).toBe("1");
  });
});
