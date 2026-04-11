import { create } from 'zustand';

import {
  CANVAS_BASE_URL_STORAGE_KEY,
  CANVAS_TOKEN_STORAGE_KEY,
} from '@lib/storageKeys';

export type UserSettingsState = {
  canvasBaseUrl: string;
  canvasToken: string;
  setCanvasBaseUrl: (url: string) => void;
  setCanvasToken: (token: string) => void;
  resetCanvas: () => void;
};

const persist = (key: string, value: string) => localStorage.setItem(key, value);

export const useUserSettingsStore = create<UserSettingsState>((set) => ({
  canvasBaseUrl: localStorage.getItem(CANVAS_BASE_URL_STORAGE_KEY) ?? '',
  canvasToken: localStorage.getItem(CANVAS_TOKEN_STORAGE_KEY) ?? '',
  setCanvasBaseUrl: (canvasBaseUrl) =>
    set(() => {
      persist(CANVAS_BASE_URL_STORAGE_KEY, canvasBaseUrl);
      return { canvasBaseUrl };
    }),
  setCanvasToken: (canvasToken) =>
    set(() => {
      persist(CANVAS_TOKEN_STORAGE_KEY, canvasToken);
      return { canvasToken };
    }),
  resetCanvas: () =>
    set(() => {
      localStorage.removeItem(CANVAS_BASE_URL_STORAGE_KEY);
      localStorage.removeItem(CANVAS_TOKEN_STORAGE_KEY);
      return { canvasBaseUrl: '', canvasToken: '' };
    }),
}));
