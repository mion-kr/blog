import { vi } from 'vitest';

export const CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
const b64url = (o: object) => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o)))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** 서명 검증 없이 클레임만 확인되는 가짜 ID 토큰(토큰 엔드포인트에서 TLS로 받은 토큰만 쓴다) */
export function idToken(claims: Record<string, unknown>) {
  const now = Math.floor(Date.now() / 1000);
  return `${b64url({ alg: 'RS256', typ: 'JWT', kid: 'k' })}.${b64url({ iss: 'https://accounts.google.com', aud: CLIENT_ID, sub: 'google-sub-1', email: 'admin@example.com', email_verified: true, name: '미온', picture: 'https://lh3.googleusercontent.com/a/p', iat: now, exp: now + 3600, ...claims })}.c2ln`;
}

/** Google 토큰 엔드포인트만 가짜로 바꾼다. 다른 주소 호출은 실패시킨다. */
export function mockGoogleToken(respond: (body: URLSearchParams) => Response | Promise<Response>) {
  const calls: URLSearchParams[] = [];
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url === 'https://oauth2.googleapis.com/token') {
      const body = new URLSearchParams(String(init?.body ?? (input instanceof Request ? await input.text() : '')));
      calls.push(body);
      return respond(body);
    }
    throw new Error(`예상하지 않은 외부 호출: ${url}`);
  });
  return { calls, restore: () => spy.mockRestore() };
}

export const tokenResponse = (claims: Record<string, unknown> = {}) =>
  Response.json({ access_token: 'at', token_type: 'Bearer', expires_in: 3600, id_token: idToken(claims), scope: 'openid email profile' });
