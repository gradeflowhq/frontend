import axios from 'axios';
import { api } from './index';
import { useAuthStore } from '../state/authStore';

axios.defaults.baseURL = 'http://localhost:8000';

let isRefreshing = false;
let queue: Array<(token: string | null) => void> = [];

const processQueue = (newAccess: string | null) => {
  queue.forEach((fn) => fn(newAccess));
  queue = [];
};

axios.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

axios.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error.config;

    // Non-401 or already retried: propagate
    if (status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // Return a promise that resolves after refresh
    return new Promise(async (resolve, reject) => {
      queue.push((newAccess) => {
        if (!newAccess) return reject(error);
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        resolve(axios(originalRequest));
      });

      if (isRefreshing) return;

      isRefreshing = true;
      try {
        const { refreshToken } = useAuthStore.getState();
        if (!refreshToken) throw new Error('No refresh token');

        const res = await api.refreshAuthRefreshPost({ refresh_token: refreshToken });
        const tokenPair = res.data;
        useAuthStore.getState().setTokens(tokenPair);
        isRefreshing = false;
        processQueue(tokenPair.access_token ?? null);
      } catch (e) {
        isRefreshing = false;
        useAuthStore.getState().clearTokens();
        processQueue(null);
        reject(error);
      }
    });
  }
);