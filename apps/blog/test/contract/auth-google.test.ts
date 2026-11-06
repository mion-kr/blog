import { describe, expect, it } from 'vitest';
import { fetchPage } from '../helpers/seed';

const start = (q = '') => fetchPage(`/auth/google${q}`, { redirect: 'manual' });

describe('GET /auth/google', () => {
  it('302로 Google 인가 주소, PKCE S256, 임시 쿠키', async () => {
    const res = await start('?callbackUrl=%2Fadmin%2Fposts');
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get('location')!);
    expect(location.origin + location.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    const p = location.searchParams;
    expect(p.get('response_type')).toBe('code');
    expect(p.get('client_id')).toBe('test-client-id.apps.googleusercontent.com');
    expect(p.get('redirect_uri')).toBe('http://localhost:4321/api/auth/callback/google');
    expect(p.get('scope')).toBe('openid email profile');
    expect(p.get('code_challenge_method')).toBe('S256');
    expect(p.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(p.get('state')).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    const cookie = res.headers.get('set-cookie')!;
    // 테스트 환경은 로컬 http라 접두사 없는 이름(운영은 __Host-, 단위 테스트에서 확인)
    expect(cookie).toMatch(/^mion-oauth=[^;]+; Path=\/; Max-Age=600; HttpOnly; SameSite=Lax$/);
  });

  it('state·challenge가 요청마다 다르다', async () => {
    const a = new URL((await start()).headers.get('location')!).searchParams;
    const b = new URL((await start()).headers.get('location')!).searchParams;
    expect(a.get('state')).not.toBe(b.get('state'));
    expect(a.get('code_challenge')).not.toBe(b.get('code_challenge'));
  });
});
