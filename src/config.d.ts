interface RuntimeConfig {
  API_URL?: string;
  CORS_PROXY_URL?: string;
}

interface Window {
  __CONFIG__?: RuntimeConfig;
}
