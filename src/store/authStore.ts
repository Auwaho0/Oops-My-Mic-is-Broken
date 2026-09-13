import { create } from "zustand";

interface AuthUIState {
  isAuthModalOpen: boolean;
  authModalTab: "login" | "register";
  openAuthModal: (tab?: "login" | "register") => void;
  closeAuthModal: () => void;
  setAuthModalTab: (tab: "login" | "register") => void;
}

export const useAuthUIStore = create<AuthUIState>((set) => ({
  isAuthModalOpen: false,
  authModalTab: "login",
  openAuthModal: (tab = "login") =>
    set({ isAuthModalOpen: true, authModalTab: tab }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  setAuthModalTab: (tab) => set({ authModalTab: tab }),
}));
