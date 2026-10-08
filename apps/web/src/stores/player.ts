import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PlayerTrack {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  albumId: string | null;
  albumName: string | null;
  coverUrl: string;
  durationSeconds: number;
  licenseUrl: string;
  tags: string[];
  explicit: boolean;
}

interface PlayerState {
  isPlaying: boolean;
  progress: number;
  volume: number;
  duration: number;
  currentTrack: PlayerTrack | null;
  queue: PlayerTrack[];
  originalQueue: PlayerTrack[];
  contextTracks: PlayerTrack[];
  previousTracks: PlayerTrack[];
  repeat: "off" | "context" | "track";
  shuffle: boolean;
  toggle: () => void;
  setProgress: (progress: number) => void;
  setVolume: (volume: number) => void;
  setDuration: (duration: number) => void;
  setTrack: (track: PlayerTrack, queue?: PlayerTrack[]) => void;
  playNext: () => void;
  playPrevious: () => void;
  setRepeat: () => void;
  toggleShuffle: () => void;
}

export const usePlayer = create<PlayerState>()(
  persist(
    (set) => ({
      isPlaying: false,
      progress: 0,
      volume: 0.72,
      duration: 0,
      currentTrack: null,
      queue: [],
      originalQueue: [],
      contextTracks: [],
      previousTracks: [],
      repeat: "off",
      shuffle: false,
      toggle: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setProgress: (progress) =>
        set({ progress: Math.max(0, Math.min(100, progress)) }),
      setVolume: (volume) => set({ volume }),
      setDuration: (duration) => set({ duration }),
      setTrack: (track, queue = []) =>
        set({
          currentTrack: track,
          queue,
          originalQueue: queue,
          contextTracks: [track, ...queue],
          previousTracks: [],
          progress: 0,
          isPlaying: true,
        }),
      playNext: () =>
        set((state) => {
          const [queuedNext, ...queuedRemainder] = state.queue;
          const [contextFirst, ...contextRemainder] = state.contextTracks;
          const next =
            queuedNext ??
            (state.repeat === "context" ? contextFirst : undefined);
          const queue = queuedNext
            ? queuedRemainder
            : state.repeat === "context"
              ? contextRemainder
              : [];
          if (
            !queuedNext &&
            state.repeat === "context" &&
            next &&
            state.shuffle
          ) {
            for (let index = queue.length - 1; index > 0; index -= 1) {
              const swapIndex = Math.floor(Math.random() * (index + 1));
              [queue[index], queue[swapIndex]] = [
                queue[swapIndex]!,
                queue[index]!,
              ];
            }
          }
          return next
            ? {
                currentTrack: next,
                previousTracks: state.currentTrack
                  ? [...state.previousTracks, state.currentTrack]
                  : state.previousTracks,
                queue,
                originalQueue:
                  !queuedNext && state.repeat === "context"
                    ? contextRemainder
                    : state.originalQueue.filter(
                        (track) => track.id !== next.id,
                      ),
                progress: 0,
                isPlaying: true,
              }
            : { isPlaying: false, progress: 0 };
        }),
      playPrevious: () =>
        set((state) => {
          const previous = state.previousTracks.at(-1);
          if (!previous) return { progress: 0 };
          return {
            currentTrack: previous,
            previousTracks: state.previousTracks.slice(0, -1),
            queue: state.currentTrack
              ? [state.currentTrack, ...state.queue]
              : state.queue,
            originalQueue: state.currentTrack
              ? [state.currentTrack, ...state.originalQueue]
              : state.originalQueue,
            progress: 0,
            isPlaying: true,
          };
        }),
      setRepeat: () =>
        set((state) => ({
          repeat:
            state.repeat === "off"
              ? "context"
              : state.repeat === "context"
                ? "track"
                : "off",
        })),
      toggleShuffle: () =>
        set((state) => {
          const shuffle = !state.shuffle;
          if (!shuffle) return { shuffle, queue: state.originalQueue };
          const queue = [...state.originalQueue];
          for (let index = queue.length - 1; index > 0; index -= 1) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [queue[index], queue[swapIndex]] = [
              queue[swapIndex]!,
              queue[index]!,
            ];
          }
          return { shuffle, queue };
        }),
    }),
    {
      name: "sonara-player",
      partialize: (state) => ({
        isPlaying: false,
        progress: state.progress,
        volume: state.volume,
        duration: state.duration,
        currentTrack: state.currentTrack,
        queue: state.queue,
        originalQueue: state.originalQueue,
        contextTracks: state.contextTracks,
        previousTracks: state.previousTracks,
        repeat: state.repeat,
        shuffle: state.shuffle,
      }),
    },
  ),
);
