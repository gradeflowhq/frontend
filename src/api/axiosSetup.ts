import axios, { type AxiosRequestHeaders, type InternalAxiosRequestConfig } from 'axios';

import { useAuthStore } from '@state/authStore';

import { ENV } from '../env';
import { api } from './index';

axios.defaults.baseURL = ENV.API_URL;

if (import.meta.env.DEV && !ENV.API_URL) {
  console.warn('[gradeflow] API_URL is not configured. Set VITE_API_URL or window.__CONFIG__.API_URL.');
}

let isRefreshing = false;
let queue: Array<(token: string | null) => void> = [];

const processQueue = (newAccess: string | null) => {
  queue.forEach((fn) => fn(newAccess));
  queue = [];
};

axios.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    const headers: AxiosRequestHeaders = (config.headers ?? {}) as AxiosRequestHeaders;
    if (!headers.Authorization) {
      headers.Authorization = `Bearer ${accessToken}`;
      config.headers = headers;
    }
  }
  return config;
});

axios.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // Non-401 or already retried: propagate
    if (status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    return new Promise((resolve, reject) => {
      // Queue the request until refresh settles
      queue.push((newAccess) => {
        if (!newAccess) {
          originalRequest._retry = false;
          reject(error);
          return;
        }
        const headers: AxiosRequestHeaders = (originalRequest.headers ?? {}) as AxiosRequestHeaders;
        headers.Authorization = `Bearer ${newAccess}`;
        originalRequest.headers = headers;
        resolve(axios(originalRequest));
      });

      if (isRefreshing) return;

      isRefreshing = true;
      const executeRefresh = async () => {
        try {
          const { refreshToken } = useAuthStore.getState();
          if (!refreshToken) throw new Error('No refresh token');

          const res = await api.refreshAuthRefreshPost({ refresh_token: refreshToken });
          const tokenPair = res.data;
          useAuthStore.getState().setTokens(tokenPair);
          processQueue(tokenPair.access_token ?? null);
        } catch {
          useAuthStore.getState().clearTokens();
          processQueue(null);
          reject(error);
        } finally {
          isRefreshing = false;
        }
      };

      void executeRefresh();
    });
  }
);