import { create } from 'zustand';

export type UserSettingsState = {
  canvasBaseUrl: string;
  canvasToken: string;
  setCanvasBaseUrl: (url: string) => void;
  setCanvasToken: (token: string) => void;
  resetCanvas: () => void;
};

const persist = (key: string, value: string) => localStorage.setItem(key, value);

export const useUserSettingsStore = create<UserSettingsState>((set) => ({
  canvasBaseUrl: localStorage.getItem('canvas_base_url') ?? '',
  canvasToken: localStorage.getItem('canvas_token') ?? '',
  setCanvasBaseUrl: (canvasBaseUrl) =>
    set(() => {
      persist('canvas_base_url', canvasBaseUrl);
      return { canvasBaseUrl };
    }),
  setCanvasToken: (canvasToken) =>
    set(() => {
      persist('canvas_token', canvasToken);
      return { canvasToken };
    }),
  resetCanvas: () =>
    set(() => {
      localStorage.removeItem('canvas_base_url');
      localStorage.removeItem('canvas_token');
      return { canvasBaseUrl: '', canvasToken: '' };
    }),
}));
