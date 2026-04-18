#!/bin/sh
set -e

# Generate /config.js from the template using runtime environment variables.
# Pass API_URL, CORS_PROXY_URL, ZITADEL_AUTHORITY, ZITADEL_CLIENT_ID, and ZITADEL_ORG_DOMAIN as Docker env vars.
envsubst '${API_URL} ${CORS_PROXY_URL} ${ZITADEL_AUTHORITY} ${ZITADEL_CLIENT_ID} ${ZITADEL_ORG_DOMAIN}' \
  < /etc/nginx/config.js.template \
  > /usr/share/nginx/html/config.js

exec nginx -g 'daemon off;'
