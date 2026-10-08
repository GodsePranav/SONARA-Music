import { create } from "zustand";
import type { SessionUser } from "@sonara/contracts";

interface SessionState {
  accessToken: string | null;
  user: SessionUser | null;
  setSession: (accessToken: string, user: SessionUser) => void;
  clearSession: () => void;
}

export const useSession = create<SessionState>((set) => ({
  accessToken: null,
  user: null,
  setSession: (accessToken, user) => set({ accessToken, user }),
  clearSession: () => set({ accessToken: null, user: null }),
}));
