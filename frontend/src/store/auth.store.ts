import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/types";

interface AuthState {
  user: User | null;
  access_token: string | null;
  refresh_token: string | null;
  isAuthenticated: boolean;

  // True once zustand-persist has finished reading from localStorage.
  // Layouts must wait for this before deciding to redirect.
  _hasHydrated: boolean;

  setAuth: (user: User, access_token: string, refresh_token: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      access_token: null,
      refresh_token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (value) => set({ _hasHydrated: value }),

      setAuth: (user, access_token, refresh_token) => {
        localStorage.setItem("access_token", access_token);
        localStorage.setItem("refresh_token", refresh_token);
        set({ user, access_token, refresh_token, isAuthenticated: true });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({
          user: null,
          access_token: null,
          refresh_token: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: "auth-store",

      // Only persist these fields — _hasHydrated must NOT be persisted
      // (it starts false on every page load and becomes true after rehydration)
      partialize: (state) => ({
        user: state.user,
        access_token: state.access_token,
        refresh_token: state.refresh_token,
        isAuthenticated: state.isAuthenticated,
      }),

      // Called when rehydration from localStorage is complete.
      // Flip _hasHydrated so layouts know it is safe to check auth state.
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);

          // Keep localStorage tokens in sync with the rehydrated store values.
          // This ensures the API interceptor (which reads localStorage directly)
          // always has a valid token after a page refresh.
          if (state.access_token) {
            localStorage.setItem("access_token", state.access_token);
          }
          if (state.refresh_token) {
            localStorage.setItem("refresh_token", state.refresh_token);
          }
        }
      },
    }
  )
);
