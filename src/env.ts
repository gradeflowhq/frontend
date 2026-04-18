/**
 * Central environment configuration.
 *
 * Priority order for each value:
 *   1. Runtime injection via window.__CONFIG__ (set by config.js / envsubst in Docker)
 *   2. Vite build-time env vars (VITE_* in .env files)
 *   3. Hardcoded development fallback
 *
 * NOTE: envsubst leaves unset variables as empty strings, so a plain `??`
 * operator is not sufficient — we must treat "" as "not set".
 */
const nonEmpty = (v: string | undefined): string | undefined =>
  v && v.trim() ? v : undefined;

export const ENV = {
  API_URL:
    nonEmpty(window.__CONFIG__?.API_URL) ??
    nonEmpty(import.meta.env.VITE_API_URL) ??
    'http://localhost:8000',

  CORS_PROXY_URL:
    nonEmpty(window.__CONFIG__?.CORS_PROXY_URL) ??
    nonEmpty(import.meta.env.VITE_CORS_PROXY_URL) ??
    'http://localhost:8080',

  ZITADEL_AUTHORITY:
    nonEmpty(window.__CONFIG__?.ZITADEL_AUTHORITY) ??
    nonEmpty(import.meta.env.VITE_ZITADEL_AUTHORITY) ??
    'http://localhost:8080',

  ZITADEL_CLIENT_ID:
    nonEmpty(window.__CONFIG__?.ZITADEL_CLIENT_ID) ??
    nonEmpty(import.meta.env.VITE_ZITADEL_CLIENT_ID) ??
    '',

  /** When set, scopes the Zitadel login to a single org so users type username only. */
  ZITADEL_ORG_DOMAIN:
    nonEmpty(window.__CONFIG__?.ZITADEL_ORG_DOMAIN) ??
    nonEmpty(import.meta.env.VITE_ZITADEL_ORG_DOMAIN) ??
    '',
} as const;
