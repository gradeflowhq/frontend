#!/bin/sh
set -e

# Generate /config.js from the template using runtime environment variables.
# Pass API_URL and CORS_PROXY_URL as Docker env vars.
envsubst '${API_URL} ${CORS_PROXY_URL}' \
  < /etc/nginx/config.js.template \
  > /usr/share/nginx/html/config.js

exec nginx -g 'daemon off;'
