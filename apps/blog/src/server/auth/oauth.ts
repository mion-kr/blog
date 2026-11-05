// Google OAuth(코드 + PKCE)는 oauth4webapi, 임시 값은 암호화 쿠키(design.md D1 ①~③⑦⑧).
import { EncryptJWT, jwtDecrypt } from 'jose';
import * as oauth from 'oauth4webapi';
import { getSafeCallbackUrl } from './callback-url';
import { deriveSessionKey } from './session';

export const GOOGLE: oauth.AuthorizationServer = {
  issuer: 'https://accounts.google.com',
  authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  token_endpoint: 'https://oauth2.googleapis.com/token',
  jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
};
// Google ID 토큰 iss는 두 형식이 있다(Google OpenID Connect 문서).
const GOOGLE_LEGACY: oauth.AuthorizationServer = { ...GOOGLE, issuer: 'accounts.google.com' };

const TEMP_MAX_AGE = 600;
const isLocalHttp = (siteUrl: string) => siteUrl.startsWith('http://');
export const oauthCookieName = (siteUrl: string) => (isLocalHttp(siteUrl) ? 'mion-oauth' : '__Host-mion-oauth');
const attrs = (siteUrl: string, maxAge: number) => `Path=/; Max-Age=${maxAge}; HttpOnly${isLocalHttp(siteUrl) ? '' : '; Secure'}; SameSite=Lax`;
export const clearOauthCookie = (siteUrl: string) => `${oauthCookieName(siteUrl)}=; ${attrs(siteUrl, 0)}`;

export type OAuthConfig = { clientId: string; clientSecret: string; siteUrl: string; secret: string };
export const redirectUri = (siteUrl: string) => `${siteUrl}/api/auth/callback/google`;

export async function startGoogleLogin(config: OAuthConfig, callbackUrl: string | null) {
  const state = oauth.generateRandomState();
  const verifier = oauth.generateRandomCodeVerifier();
  const challenge = await oauth.calculatePKCECodeChallenge(verifier);
  const url = new URL(GOOGLE.authorization_endpoint!);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri(config.siteUrl),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString();
  const now = Math.floor(Date.now() / 1000);
  const temp = await new EncryptJWT({ state, verifier, callbackUrl: getSafeCallbackUrl(callbackUrl) })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt(now)
    .setExpirationTime(now + TEMP_MAX_AGE)
    .encrypt(await deriveSessionKey(config.secret, 'mion-oauth'));
  return { location: url.href, setCookie: `${oauthCookieName(config.siteUrl)}=${temp}; ${attrs(config.siteUrl, TEMP_MAX_AGE)}` };
}

export type GoogleIdentity = { sub: string; email: string; name: string; picture: string | null };
export type CallbackResult = { ok: true; identity: GoogleIdentity; callbackUrl: string } | { ok: false; step: string };

async function readTemp(token: string | undefined, secret: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtDecrypt(token, await deriveSessionKey(secret, 'mion-oauth'), { keyManagementAlgorithms: ['dir'], contentEncryptionAlgorithms: ['A256GCM'] });
    const { state, verifier, callbackUrl } = payload;
    return typeof state === 'string' && typeof verifier === 'string' && typeof callbackUrl === 'string' ? { state, verifier, callbackUrl } : null;
  } catch {
    return null;
  }
}

/** 실패 단계만 돌려주고 code·토큰·쿠키 값은 로그에 남기지 않는다. fetchImpl은 테스트에서 바꿔 끼운다. */
export async function finishGoogleLogin(config: OAuthConfig, currentUrl: URL, tempToken: string | undefined, fetchImpl: typeof fetch = (...a) => fetch(...a)): Promise<CallbackResult> {
  const temp = await readTemp(tempToken, config.secret);
  if (!temp) return { ok: false, step: 'temp-cookie' };
  if (currentUrl.searchParams.has('error')) return { ok: false, step: 'google-error' };
  const client: oauth.Client = { client_id: config.clientId };
  let params: URLSearchParams;
  try {
    params = oauth.validateAuthResponse(GOOGLE, client, currentUrl, temp.state);
  } catch {
    return { ok: false, step: 'auth-response' };
  }
  let response: Response;
  try {
    response = await oauth.authorizationCodeGrantRequest(GOOGLE, client, oauth.ClientSecretPost(config.clientSecret), params, redirectUri(config.siteUrl), temp.verifier, {
      [oauth.customFetch]: fetchImpl,
    });
  } catch {
    return { ok: false, step: 'token-request' };
  }
  let claims: oauth.IDToken | undefined;
  for (const as of [GOOGLE, GOOGLE_LEGACY]) {
    try {
      const result = await oauth.processAuthorizationCodeResponse(as, client, response.clone(), { requireIdToken: true });
      claims = oauth.getValidatedIdTokenClaims(result);
      break;
    } catch {
      // 다음 iss 형식으로 다시 확인
    }
  }
  if (!claims) return { ok: false, step: 'token-response' };
  const { sub, email, email_verified: verified, name, picture } = claims as oauth.IDToken & Record<string, unknown>;
  if (typeof sub !== 'string' || typeof email !== 'string' || verified !== true) return { ok: false, step: 'claims' };
  return {
    ok: true,
    identity: { sub, email, name: typeof name === 'string' && name ? name : email, picture: typeof picture === 'string' ? picture : null },
    callbackUrl: getSafeCallbackUrl(temp.callbackUrl),
  };
}

export function oauthTokenFromRequest(request: Request, siteUrl: string): string | undefined {
  const name = oauthCookieName(siteUrl);
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
}
