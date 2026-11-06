import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { adminCookie } from '../helpers/auth';
import { clearTables } from '../helpers/db';
import { mockGoogleToken, tokenResponse } from '../helpers/google';
import { fetchPage, ids, seedBasic } from '../helpers/seed';

// 이 파일은 ADMIN_WRITES_FROZEN=true 프로젝트에서만 돈다(vitest.config.ts).
const WRITES: [string, string][] = [
  ['POST', '/api/admin/posts'], ['PUT', '/api/admin/posts/x'], ['DELETE', '/api/admin/posts/x'],
  ['POST', '/api/admin/categories'], ['PUT', '/api/admin/categories/x'], ['DELETE', '/api/admin/categories/x'],
  ['POST', '/api/admin/tags'], ['PUT', '/api/admin/tags/x'], ['DELETE', '/api/admin/tags/x'],
  ['PATCH', '/api/admin/settings'], ['POST', '/api/admin/uploads'],
];

describe('편집 동결 중(HTTP)', () => {
  let google: ReturnType<typeof mockGoogleToken> | undefined;
  beforeEach(async () => {
    await clearTables();
    await seedBasic();
  });
  afterEach(() => google?.restore());

  it('관리자 쓰기 11개 모두 423 EDIT_FROZEN, D1 변화 없음', async () => {
    const cookie = await adminCookie();
    for (const [method, path] of WRITES) {
      const res = await fetchPage(path, { method, headers: { cookie, origin: 'http://localhost:4321', 'content-type': 'application/json' }, body: '{}' });
      expect(res.status, `${method} ${path}`).toBe(423);
      expect(await res.json()).toEqual({ success: false, error: { code: 'EDIT_FROZEN', message: '전환 기간이라 편집이 잠겨 있어요.' } });
    }
    expect(await env.DB.prepare('SELECT count(*) AS n FROM settings').first('n')).toBe(0);
    expect(await env.DB.prepare('SELECT count(*) AS n FROM posts').first('n')).toBe(3);
  });

  it('공개 화면은 그대로 동작', async () => {
    expect((await fetchPage('/robots.txt')).status).toBe(200);
    expect((await fetchPage('/posts/first-post')).status).toBe(200);
  });

  it('동결 중에도 관리자 로그인은 된다(이름·사진 갱신 허용)', async () => {
    await env.DB.prepare("UPDATE users SET google_id='google-sub-1' WHERE id=?").bind(ids.user).run();
    const start = await fetchPage('/auth/google', { redirect: 'manual' });
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!;
    const temp = start.headers.get('set-cookie')!.split(';')[0]!;
    google = mockGoogleToken(() => tokenResponse());
    const res = await fetchPage(`/api/auth/callback/google?code=c&state=${state}`, { redirect: 'manual', headers: { cookie: temp } });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/admin');
    expect(res.headers.getSetCookie().some((c) => c.startsWith('mion-session='))).toBe(true);
  });
});
