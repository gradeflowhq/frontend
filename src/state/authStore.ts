import { create } from 'zustand';

import { REFRESH_TOKEN_STORAGE_KEY } from '@lib/storageKeys';

import type { TokenPairResponse } from '@api/models';

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (tokens: TokenPairResponse) => void;
  clearTokens: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || null,
  setTokens: (tokens) =>
    set(() => {
      if (tokens?.refresh_token) localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refresh_token);
      return {
        accessToken: tokens?.access_token ?? null,
        refreshToken: tokens?.refresh_token ?? null,
      };
    }),
  clearTokens: () =>
    set(() => {
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      return { accessToken: null, refreshToken: null };
    }),
}));