import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  awkwardnessLevel: number;
  statusIndex: number;
  setAwkwardnessLevel: (level: number) => void;
  setStatusIndex: (index: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      awkwardnessLevel: 35,
      statusIndex: 0,
      setAwkwardnessLevel: (level) =>
        set({ awkwardnessLevel: Math.max(0, Math.min(100, level)) }),
      setStatusIndex: (index) => set({ statusIndex: index }),
    }),
    {
      name: "callsaver-ui-preferences",
    }
  )
);
