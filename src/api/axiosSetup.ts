import axios, { type AxiosRequestHeaders, type InternalAxiosRequestConfig } from 'axios';

import { userManager } from '../auth/oidc';
import { ENV } from '../env';

axios.defaults.baseURL = ENV.API_URL;

if (import.meta.env.DEV && !ENV.API_URL) {
  console.warn('[gradeflow] API_URL is not configured. Set VITE_API_URL or window.__CONFIG__.API_URL.');
}

axios.interceptors.request.use(async (config) => {
  const user = await userManager.getUser();
  if (user?.access_token && !user.expired) {
    const headers: AxiosRequestHeaders = (config.headers ?? {}) as AxiosRequestHeaders;
    if (!headers.Authorization) {
      headers.Authorization = `Bearer ${user.access_token}`;
      config.headers = headers;
    }
  }
  return config;
});

let renewalPromise: Promise<string | null> | null = null;

axios.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // Coalesce concurrent 401 renewals into a single signinSilent call.
    // All queued requests wait on the same promise and retry with the new token.
    if (!renewalPromise) {
      renewalPromise = userManager
        .signinSilent()
        .then((user) => user?.access_token ?? null)
        .catch(() => null)
        .finally(() => { renewalPromise = null; });
    }

    const newToken = await renewalPromise;
    if (newToken) {
      const headers: AxiosRequestHeaders = (originalRequest.headers ?? {}) as AxiosRequestHeaders;
      headers.Authorization = `Bearer ${newToken}`;
      originalRequest.headers = headers;
      return axios(originalRequest);
    }

    // Silent renewal failed — clear local auth state and redirect to
    // the landing page instead of calling signinRedirect which would
    // cause an infinite redirect loop when the token is persistently rejected.
    await userManager.removeUser();
    window.location.replace('/');
    return Promise.reject(error);
  }
);