import { create } from 'zustand';
import type { TokenPairResponse } from '@api/models';

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  hasBootstrapped: boolean;
  setTokens: (tokens: TokenPairResponse) => void;
  clearTokens: () => void;
  markBootstrapped: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: localStorage.getItem('refresh_token') || null,
  hasBootstrapped: false,
  setTokens: (tokens) =>
    set(() => {
      if (tokens?.refresh_token) localStorage.setItem('refresh_token', tokens.refresh_token);
      return {
        accessToken: tokens?.access_token ?? null,
        refreshToken: tokens?.refresh_token ?? null,
      };
    }),
  clearTokens: () =>
    set(() => {
      localStorage.removeItem('refresh_token');
      return { accessToken: null, refreshToken: null };
    }),
  markBootstrapped: () => set({ hasBootstrapped: true }),
}));