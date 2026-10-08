import { beforeEach, describe, expect, it } from "vitest";
import { usePlayer } from "./player";

describe("player UI state", () => {
  beforeEach(() =>
    usePlayer.setState({ isPlaying: false, progress: 0, volume: 0.72 }),
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
});
