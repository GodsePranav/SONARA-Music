import { create } from "zustand";

interface PlayerState {
  isPlaying: boolean;
  progress: number;
  volume: number;
  toggle: () => void;
  setProgress: (progress: number) => void;
  setVolume: (volume: number) => void;
}

export const usePlayer = create<PlayerState>((set) => ({
  isPlaying: false,
  progress: 0,
  volume: 0.72,
  toggle: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setProgress: (progress) => set({ progress }),
  setVolume: (volume) => set({ volume }),
}));
