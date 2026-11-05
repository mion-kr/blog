import { describe, expect, it } from 'vitest';
import { adminCookie } from '../helpers/auth';
import { fetchPage } from '../helpers/seed';

describe('POST /auth/signout', () => {
  for (const [label, withCookie] of [['세션 있음', true], ['세션 없음', false]] as const) {
    it(`${label}: 303 /, 세션 쿠키 삭제`, async () => {
      const headers: Record<string, string> = { origin: 'http://localhost:4321' };
      if (withCookie) headers.cookie = await adminCookie();
      const res = await fetchPage('/auth/signout', { method: 'POST', headers, redirect: 'manual' });
      expect(res.status).toBe(303);
      expect(res.headers.get('location')).toBe('/');
      expect(res.headers.get('set-cookie')).toBe('mion-session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
    });
  }

  it('다른 출처는 403, 쿠키 유지', async () => {
    const res = await fetchPage('/auth/signout', { method: 'POST', headers: { origin: 'https://evil.test', cookie: await adminCookie() }, redirect: 'manual' });
    expect(res.status).toBe(403);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('GET은 로그아웃하지 않는다', async () => {
    const res = await fetchPage('/auth/signout', { redirect: 'manual' });
    expect(res.headers.get('set-cookie')).toBeNull();
  });
});
