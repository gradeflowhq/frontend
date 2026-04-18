import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

import { ENV } from '../env';

const extraQueryParams: Record<string, string> = {};
let scope = 'openid profile email';
if (ENV.ZITADEL_ORG_DOMAIN) {
  // Scope login to a single org so users type just their username, not user@domain.
  extraQueryParams['org_domain'] = ENV.ZITADEL_ORG_DOMAIN;
  // Restrict authentication to the specified org — users outside it are rejected.
  scope += ` urn:zitadel:iam:org:domain:primary:${ENV.ZITADEL_ORG_DOMAIN}`;
}

export const userManager = new UserManager({
  authority: ENV.ZITADEL_AUTHORITY,
  client_id: ENV.ZITADEL_CLIENT_ID,
  redirect_uri: `${window.location.origin}/auth/callback`,
  post_logout_redirect_uri: window.location.origin,
  scope,
  response_type: 'code',
  userStore: new WebStorageStateStore({ store: localStorage }),
  automaticSilentRenew: true,
  extraQueryParams,
});
