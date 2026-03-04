import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
}

interface Org {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  user: User | null;
  org: Org | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, org: Org, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      org: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, org, accessToken, refreshToken) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("accessToken", accessToken);
          localStorage.setItem("refreshToken", refreshToken);
        }
        set({ user, org, accessToken, refreshToken, isAuthenticated: true });
      },
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        }
        set({ user: null, org: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: "opensales-auth",
      partialize: (state) => ({ user: state.user, org: state.org, isAuthenticated: state.isAuthenticated }),
    }
  )
);
