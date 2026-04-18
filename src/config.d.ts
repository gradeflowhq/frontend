interface RuntimeConfig {
  API_URL?: string;
  CORS_PROXY_URL?: string;
  ZITADEL_AUTHORITY?: string;
  ZITADEL_CLIENT_ID?: string;
  ZITADEL_ORG_DOMAIN?: string;
}

interface Window {
  __CONFIG__?: RuntimeConfig;
}
