// 관리자 세션: jose JWE(dir + A256GCM) 쿠키, 서버 저장소 없음(design.md D1 ④⑤).
import { EncryptJWT, jwtDecrypt, errors } from 'jose';

export const SESSION_MAX_AGE = 604_800; // 7일
export type Session = { sub: string; email: string; name: string; role: 'ADMIN'; exp: number };
export type SessionResult = { ok: true; session: Session } | { ok: false; reason: 'expired' | 'invalid' };

const isLocalHttp = (siteUrl: string) => {
  const url = new URL(siteUrl);
  return url.protocol === 'http:' && url.hostname === 'localhost';
};
// 로컬 http에서는 Secure 쿠키를 받지 않는 브라우저가 있어 접두사 없는 이름을 쓴다(운영·미리보기는 __Host-).
export const sessionCookieName = (siteUrl: string) => (isLocalHttp(siteUrl) ? 'mion-session' : '__Host-mion-session');

const attributes = (siteUrl: string, maxAge: number) =>
  `Path=/; Max-Age=${maxAge}; HttpOnly${isLocalHttp(siteUrl) ? '' : '; Secure'}; SameSite=Lax`;

export async function deriveSessionKey(secret: string, info = 'mion-session'): Promise<Uint8Array> {
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET은 32자 이상이어야 한다');
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new TextEncoder().encode(info) }, base, 256);
  return new Uint8Array(bits);
}

export async function createSessionCookie(user: { sub: string; email: string; name: string }, opts: { secret: string; siteUrl: string; now?: Date }): Promise<string> {
  const iat = Math.floor((opts.now ?? new Date()).getTime() / 1000);
  const token = await new EncryptJWT({ email: user.email, name: user.name, role: 'ADMIN' })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setSubject(user.sub)
    .setIssuedAt(iat)
    .setExpirationTime(iat + SESSION_MAX_AGE)
    .encrypt(await deriveSessionKey(opts.secret));
  return `${sessionCookieName(opts.siteUrl)}=${token}; ${attributes(opts.siteUrl, SESSION_MAX_AGE)}`;
}

export const clearSessionCookie = (siteUrl: string) => `${sessionCookieName(siteUrl)}=; ${attributes(siteUrl, 0)}`;

export async function readSession(token: string | undefined, opts: { secret: string; now?: Date }): Promise<SessionResult> {
  if (!token) return { ok: false, reason: 'invalid' };
  try {
    const { payload } = await jwtDecrypt(token, await deriveSessionKey(opts.secret), {
      keyManagementAlgorithms: ['dir'],
      contentEncryptionAlgorithms: ['A256GCM'],
      currentDate: opts.now,
    });
    const { sub, email, name, role, exp } = payload;
    if (typeof sub !== 'string' || typeof email !== 'string' || typeof name !== 'string' || role !== 'ADMIN' || typeof exp !== 'number') {
      return { ok: false, reason: 'invalid' };
    }
    return { ok: true, session: { sub, email, name, role, exp } };
  } catch (error) {
    if (error instanceof errors.JWTExpired) return { ok: false, reason: 'expired' };
    return { ok: false, reason: 'invalid' };
  }
}

/** Cookie 헤더에서 세션 쿠키 값을 꺼낸다. 운영에서는 접두사 없는 이름을 읽지 않는다. */
export function sessionTokenFromRequest(request: Request, siteUrl: string): string | undefined {
  const name = sessionCookieName(siteUrl);
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
}
