import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { adminCookie } from '../helpers/auth';
import { fetchPage } from '../helpers/seed';

// 이 파일은 ADMIN_WRITES_FROZEN=true 프로젝트에서만 돈다(vitest.config.ts).
describe('편집 동결 중(HTTP)', () => {
  it('관리자 쓰기는 423 EDIT_FROZEN, D1 변화 없음', async () => {
    const cookie = await adminCookie();
    for (const [method, path] of [['POST', '/api/admin/posts'], ['PUT', '/api/admin/categories/x'], ['DELETE', '/api/admin/tags/x'], ['PATCH', '/api/admin/settings'], ['POST', '/api/admin/uploads']] as const) {
      const res = await fetchPage(path, { method, headers: { cookie, origin: 'http://localhost:4321', 'content-type': 'application/json' }, body: '{}' });
      expect(res.status, `${method} ${path}`).toBe(423);
      expect(await res.json()).toEqual({ success: false, error: { code: 'EDIT_FROZEN', message: '전환 기간이라 편집이 잠겨 있어요.' } });
    }
    expect(await env.DB.prepare('SELECT count(*) AS n FROM settings').first('n')).toBe(0);
  });

  it('공개 화면은 그대로 동작', async () => {
    expect((await fetchPage('/robots.txt')).status).toBe(200);
  });
});
