import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearTables } from '../helpers/db';
import { fetchPage, ids, seedBasic } from '../helpers/seed';
import { mockGoogleToken, tokenResponse } from '../helpers/google';

async function begin(callbackUrl?: string) {
  const res = await fetchPage(`/auth/google${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`, { redirect: 'manual' });
  const state = new URL(res.headers.get('location')!).searchParams.get('state')!;
  const cookie = res.headers.get('set-cookie')!.split(';')[0]!;
  return { state, cookie };
}
const callback = (query: string, cookie?: string) =>
  fetchPage(`/api/auth/callback/google?${query}`, { redirect: 'manual', headers: cookie ? { cookie } : {} });
const cookies = (res: Response) => res.headers.getSetCookie();
const sessionSet = (res: Response) => cookies(res).find((c) => c.startsWith('mion-session='));
const tempCleared = (res: Response) => cookies(res).includes('mion-oauth=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
const errorOf = (res: Response) => new URL(res.headers.get('location')!, 'http://x').searchParams.get('error');

describe('GET /api/auth/callback/google', () => {
  let google: ReturnType<typeof mockGoogleToken> | undefined;
  const logs: string[] = [];
  beforeEach(async () => {
    await clearTables();
    await seedBasic();
    // 운영처럼 관리자 사용자 행의 google_id가 Google sub와 같다.
    await env.DB.prepare("UPDATE users SET google_id='google-sub-1' WHERE id=?").bind(ids.user).run();
    logs.length = 0;
    for (const level of ['log', 'warn', 'error'] as const) vi.spyOn(console, level).mockImplementation((...a) => void logs.push(a.map(String).join(' ')));
  });
  afterEach(() => {
    google?.restore();
    google = undefined;
    vi.restoreAllMocks();
  });

  it('관리자 계정: 기존 google_id 사용자 id 유지, 이름·사진 갱신, 세션 발급, callbackUrl로 302', async () => {
    await env.DB.prepare("UPDATE users SET name='옛 이름' WHERE id=?").bind(ids.user).run();
    const { state, cookie } = await begin('/admin/posts?page=2');
    google = mockGoogleToken(() => tokenResponse());
    const res = await callback(`code=c1&state=${state}`, cookie);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/admin/posts?page=2');
    expect(sessionSet(res)).toMatch(/^mion-session=[^;]+; Path=\/; Max-Age=604800; HttpOnly; SameSite=Lax$/);
    expect(tempCleared(res)).toBe(true);
    expect(google.calls[0]!.get('code')).toBe('c1');
    expect(google.calls[0]!.get('code_verifier')).toMatch(/^[A-Za-z0-9_-]{43,}$/);
    expect(google.calls[0]!.get('redirect_uri')).toBe('http://localhost:4321/api/auth/callback/google');
    const user = await env.DB.prepare('SELECT id, name, image FROM users WHERE google_id=?').bind('google-sub-1').first();
    expect(user).toEqual({ id: ids.user, name: '미온', image: 'https://lh3.googleusercontent.com/a/p' });
    // 세션으로 관리자 화면 통과
    const admin = await fetchPage('/admin', { redirect: 'manual', headers: { cookie: sessionSet(res)!.split(';')[0]! } });
    expect(admin.status).not.toBe(307);
    expect(logs.join('\n')).not.toMatch(/c1|eyJ|test-client-secret|mion-oauth=|mion-session=/);
  });

  it('바뀐 값이 없으면 updated_at 그대로, 사진이 없으면 기존 사진 유지', async () => {
    await env.DB.prepare("UPDATE users SET name='미온', image='https://old' WHERE id=?").bind(ids.user).run();
    const before = await env.DB.prepare('SELECT updated_at FROM users WHERE id=?').bind(ids.user).first('updated_at');
    const { state, cookie } = await begin();
    google = mockGoogleToken(() => tokenResponse({ picture: undefined }));
    const res = await callback(`code=c&state=${state}`, cookie);
    expect(res.headers.get('location')).toBe('/admin');
    expect(await env.DB.prepare('SELECT image, updated_at FROM users WHERE id=?').bind(ids.user).first()).toEqual({ image: 'https://old', updated_at: before });
  });

  it('처음 로그인하는 관리자 계정은 ADMIN으로 만든다', async () => {
    const { state, cookie } = await begin();
    google = mockGoogleToken(() => tokenResponse({ sub: 'new-sub', email: 'admin@example.com' }));
    await env.DB.prepare('DELETE FROM posts').run();
    await env.DB.prepare('DELETE FROM users').run();
    const res = await callback(`code=c&state=${state}`, cookie);
    expect(res.status).toBe(302);
    expect(await env.DB.prepare("SELECT role, email FROM users WHERE google_id='new-sub'").first()).toEqual({ role: 'ADMIN', email: 'admin@example.com' });
  });

  it('관리자가 아닌 계정(대소문자만 달라도)은 세션 없이 AccessDenied, users 쓰기 없음', async () => {
    for (const email of ['other@example.com', 'Admin@example.com']) {
      const { state, cookie } = await begin();
      google = mockGoogleToken(() => tokenResponse({ sub: `s-${email}`, email }));
      const res = await callback(`code=c&state=${state}`, cookie);
      google.restore();
      expect(res.status).toBe(302);
      expect(errorOf(res)).toBe('AccessDenied');
      expect(sessionSet(res)).toBeUndefined();
      expect(tempCleared(res)).toBe(true);
    }
    expect(await env.DB.prepare('SELECT count(*) AS n FROM users').first('n')).toBe(1);
  });

  const oauthError = async (res: Response) => {
    expect(res.status).toBe(302);
    expect(new URL(res.headers.get('location')!, 'http://x').pathname).toBe('/auth/signin');
    expect(errorOf(res)).toBe('OAuthError');
    expect(sessionSet(res)).toBeUndefined();
  };

  it('state 불일치·누락, 임시 쿠키 없음·위조는 OAuthError(토큰 요청 없음)', async () => {
    const { state, cookie } = await begin();
    google = mockGoogleToken(() => tokenResponse());
    await oauthError(await callback(`code=c&state=wrong`, cookie));
    await oauthError(await callback(`code=c`, cookie));
    await oauthError(await callback(`code=c&state=${state}`));
    await oauthError(await callback(`code=c&state=${state}`, 'mion-oauth=forged'));
    expect(google.calls).toHaveLength(0);
  });

  it('Google error(access_denied 포함)와 code 없음은 OAuthError, 원문 미노출', async () => {
    const { state, cookie } = await begin();
    for (const q of [`error=access_denied&state=${state}`, `error=server_error&error_description=%3Cb%3Eboom&state=${state}`, `state=${state}`]) {
      const res = await callback(q, cookie);
      await oauthError(res);
      expect(res.headers.get('location')).not.toContain('boom');
      expect(tempCleared(res)).toBe(true);
    }
  });

  it('토큰 엔드포인트 실패·네트워크 오류는 500이 아니라 OAuthError', async () => {
    for (const respond of [() => new Response('{"error":"invalid_grant"}', { status: 400, headers: { 'content-type': 'application/json' } }), () => Promise.reject(new TypeError('network'))]) {
      const { state, cookie } = await begin();
      google = mockGoogleToken(respond);
      await oauthError(await callback(`code=c&state=${state}`, cookie));
      google.restore();
    }
  });

  it('같은 이메일에 다른 google_id면 저장 실패로 OAuthError(이메일 UNIQUE)', async () => {
    const { state, cookie } = await begin();
    google = mockGoogleToken(() => tokenResponse({ sub: 'different-sub' }));
    await oauthError(await callback(`code=c&state=${state}`, cookie));
  });

  it('ID 토큰 클레임 검증: iss 두 형식 허용, aud·iss 불일치·만료·sub·email 누락·email_verified=false 거부', async () => {
    const ok = async (claims: Record<string, unknown>) => {
      const { state, cookie } = await begin();
      google = mockGoogleToken(() => tokenResponse(claims));
      const res = await callback(`code=c&state=${state}`, cookie);
      google.restore();
      return res;
    };
    expect(errorOf(await ok({ iss: 'accounts.google.com' }))).toBeNull();
    for (const claims of [{ aud: 'other' }, { iss: 'https://evil.test' }, { exp: Math.floor(Date.now() / 1000) - 600 }, { sub: undefined }, { email: undefined }, { email_verified: false }]) {
      await oauthError(await ok(claims));
    }
  });

  it('임시 쿠키의 callbackUrl이 바깥 주소로 바뀌어 있어도 /admin(시작 단계에서 차단)', async () => {
    const { state, cookie } = await begin('https://evil.test/x');
    google = mockGoogleToken(() => tokenResponse());
    const res = await callback(`code=c&state=${state}`, cookie);
    expect(res.headers.get('location')).toBe('/admin');
  });

  it('같은 state를 두 번 쓸 수 없다(첫 응답이 임시 쿠키를 지운다)', async () => {
    const { state, cookie } = await begin();
    google = mockGoogleToken(() => tokenResponse());
    const first = await callback(`code=c&state=${state}`, cookie);
    expect(first.status).toBe(302);
    expect(tempCleared(first)).toBe(true);
    // 브라우저는 지운 쿠키를 다시 보내지 않는다
    await oauthError(await callback(`code=c&state=${state}`));
  });
});
