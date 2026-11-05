import { CompactEncrypt, EncryptJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { clearSessionCookie, createSessionCookie, deriveSessionKey, readSession, sessionCookieName } from '../src/server/auth/session';

const SECRET = 'test-session-secret-0123456789abcdef';
const PROD = 'https://mion-space.dev';
const LOCAL = 'http://localhost:4321';
const user = { sub: 'u1', email: 'admin@example.com', name: '미온' };
const now = new Date('2026-11-06T00:00:00Z');
const value = (setCookie: string) => /^[^=]+=([^;]*)/.exec(setCookie)![1]!;

describe('세션 쿠키', () => {
  it('운영 속성: __Host-mion-session, HttpOnly, Secure, SameSite=Lax, Path=/, Max-Age=604800, Domain 없음', async () => {
    const header = await createSessionCookie(user, { secret: SECRET, siteUrl: PROD, now });
    expect(header).toMatch(/^__Host-mion-session=[^;]+; Path=\/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax$/);
    expect(header).not.toContain('Domain');
  });

  it('로컬 http: 접두사 없는 mion-session, Secure 없음', async () => {
    const header = await createSessionCookie(user, { secret: SECRET, siteUrl: LOCAL, now });
    expect(header).toMatch(/^mion-session=[^;]+; Path=\/; Max-Age=604800; HttpOnly; SameSite=Lax$/);
    expect(sessionCookieName(LOCAL)).toBe('mion-session');
    expect(sessionCookieName(PROD)).toBe('__Host-mion-session');
  });

  it('발급한 쿠키를 복호화하면 sub·email·name·exp(7일)', async () => {
    const token = value(await createSessionCookie(user, { secret: SECRET, siteUrl: PROD, now }));
    const result = await readSession(token, { secret: SECRET, now });
    expect(result).toEqual({ ok: true, session: { ...user, role: 'ADMIN', exp: Math.floor(now.getTime() / 1000) + 604800 } });
  });

  it('만료: 7일 뒤에는 expired', async () => {
    const token = value(await createSessionCookie(user, { secret: SECRET, siteUrl: PROD, now }));
    const later = new Date(now.getTime() + 604_801_000);
    expect(await readSession(token, { secret: SECRET, now: later })).toEqual({ ok: false, reason: 'expired' });
  });

  it('위조·다른 키·빈 값은 invalid', async () => {
    const token = value(await createSessionCookie(user, { secret: SECRET, siteUrl: PROD, now }));
    expect(await readSession(token.slice(0, -2) + 'AA', { secret: SECRET, now })).toEqual({ ok: false, reason: 'invalid' });
    expect(await readSession(token, { secret: 'another-secret-0123456789abcdefghij', now })).toEqual({ ok: false, reason: 'invalid' });
    expect(await readSession('', { secret: SECRET, now })).toEqual({ ok: false, reason: 'invalid' });
    expect(await readSession(undefined, { secret: SECRET, now })).toEqual({ ok: false, reason: 'invalid' });
  });

  it('dir/A256GCM 외 알고리즘은 거부', async () => {
    const key = await deriveSessionKey(SECRET);
    const other = await new EncryptJWT({ ...user, role: 'ADMIN' }).setProtectedHeader({ alg: 'dir', enc: 'A128CBC-HS256' }).setExpirationTime(Math.floor(now.getTime() / 1000) + 60).encrypt(key);
    expect(await readSession(other, { secret: SECRET, now })).toEqual({ ok: false, reason: 'invalid' });
    const notJwt = await new CompactEncrypt(new TextEncoder().encode('x')).setProtectedHeader({ alg: 'dir', enc: 'A256GCM' }).encrypt(key);
    expect(await readSession(notJwt, { secret: SECRET, now })).toEqual({ ok: false, reason: 'invalid' });
  });

  it('필수 클레임이 없으면 invalid', async () => {
    const key = await deriveSessionKey(SECRET);
    const missing = await new EncryptJWT({ sub: 'u1' }).setProtectedHeader({ alg: 'dir', enc: 'A256GCM' }).setExpirationTime(Math.floor(now.getTime() / 1000) + 60).encrypt(key);
    expect(await readSession(missing, { secret: SECRET, now })).toEqual({ ok: false, reason: 'invalid' });
  });

  it('지우는 쿠키: Max-Age=0, 같은 이름·속성', () => {
    expect(clearSessionCookie(PROD)).toBe('__Host-mion-session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
    expect(clearSessionCookie(LOCAL)).toBe('mion-session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
  });

  it('비밀값이 짧으면 거부(32자 미만)', async () => {
    await expect(deriveSessionKey('short')).rejects.toThrow(/SESSION_SECRET/);
  });
});
