import { describe, expect, it } from 'vitest';
import { adminCookie } from '../helpers/auth';
import { fetchPage } from '../helpers/seed';

// 관리자 경로는 라우트가 있든 없든 접두사로 막는다. 아래 목록 + src/pages에서 찾은 관리자 라우트를 모두 확인한다.
const PAGES = ['/admin', '/admin/posts', '/admin/posts/new', '/admin/posts/some-slug/edit', '/admin/categories', '/admin/tags', '/admin/settings'];
const APIS: [string, string][] = [
  ['POST', '/api/admin/posts'], ['PUT', '/api/admin/posts/x'], ['DELETE', '/api/admin/posts/x'],
  ['POST', '/api/admin/categories'], ['PUT', '/api/admin/categories/x'], ['DELETE', '/api/admin/categories/x'],
  ['POST', '/api/admin/tags'], ['PUT', '/api/admin/tags/x'], ['DELETE', '/api/admin/tags/x'],
  ['PATCH', '/api/admin/settings'], ['POST', '/api/admin/uploads'], ['GET', '/api/admin/anything'],
];
const routeFiles = Object.keys(import.meta.glob(['../../src/pages/admin/**/*.{astro,ts}', '../../src/pages/api/admin/**/*.ts']));
const discovered = routeFiles.map((f) =>
  f.replace('../../src/pages', '').replace(/\.(astro|ts)$/, '').replace(/\/index$/, '').replace(/\[\.\.\.[^\]]+\]|\[[^\]]+\]/g, 'x') || '/',
);

async function expectPageRedirect(path: string, init?: RequestInit, expired = false) {
  const res = await fetchPage(path, { redirect: 'manual', ...init });
  expect(res.status, path).toBe(307);
  const location = new URL(res.headers.get('location')!, 'http://localhost:4321');
  expect(location.pathname).toBe('/auth/signin');
  expect(location.searchParams.get('callbackUrl')).toBe(path.split('#')[0]);
  expect(location.searchParams.get('error')).toBe(expired ? 'SessionExpired' : null);
}

async function expectApi401(method: string, path: string, init?: RequestInit) {
  const res = await fetchPage(path, { method, redirect: 'manual', ...init });
  expect(res.status, `${method} ${path}`).toBe(401);
  expect(await res.json()).toEqual({ success: false, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } });
}

describe('관리자 보호(middleware)', () => {
  it('쿠키 없는 관리자 페이지는 307 /auth/signin?callbackUrl=원래 주소', async () => {
    for (const path of [...PAGES, '/admin/posts?page=2&search=a'].concat(discovered.filter((p) => !p.startsWith('/api')))) await expectPageRedirect(path);
  });

  it('쿠키 없는 /api/admin/* 는 리다이렉트 없이 401 JSON', async () => {
    for (const [method, path] of APIS) await expectApi401(method, path, method === 'GET' ? {} : { headers: { origin: 'http://localhost:4321' } });
    for (const path of discovered.filter((p) => p.startsWith('/api'))) for (const m of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) await expectApi401(m, path);
  });

  it('위조·다른 키·ADMIN_EMAIL이 아닌 쿠키는 거부', async () => {
    for (const cookie of ['mion-session=garbage', await adminCookie({ secret: 'another-secret-0123456789abcdefghij' }), await adminCookie({ email: 'other@example.com' }), await adminCookie({ email: 'Admin@example.com' })]) {
      await expectPageRedirect('/admin', { headers: { cookie } });
      await expectApi401('PATCH', '/api/admin/settings', { headers: { cookie, origin: 'http://localhost:4321' } });
    }
  });

  it('만료된 쿠키는 error=SessionExpired', async () => {
    const cookie = await adminCookie({ now: new Date(Date.now() - 8 * 86_400_000) });
    await expectPageRedirect('/admin/tags', { headers: { cookie } }, true);
  });

  it('대소문자·인코딩 변형 경로도 거부', async () => {
    for (const path of ['/Admin', '/ADMIN/posts', '/%61dmin', '/admin%2Fposts', '//admin']) {
      const res = await fetchPage(path, { redirect: 'manual' });
      expect([307, 404], path).toContain(res.status);
      if (res.status === 404) throw new Error(`${path}가 보호되지 않음`);
    }
    for (const path of ['/API/admin/posts', '/api/%61dmin/posts']) {
      const res = await fetchPage(path, { method: 'POST', redirect: 'manual', headers: { origin: 'http://localhost:4321' } });
      expect(res.status, path).toBe(401);
    }
  });

  it('운영 이름이 아닌 쿠키 이름은 읽지 않는다: 로컬에서 __Host- 이름 쿠키는 무시', async () => {
    const value = (await adminCookie()).split('=').slice(1).join('=');
    await expectPageRedirect('/admin', { headers: { cookie: `__Host-mion-session=${value}` } });
  });

  it('유효한 관리자 쿠키면 통과(페이지는 리다이렉트하지 않음)', async () => {
    const res = await fetchPage('/admin', { redirect: 'manual', headers: { cookie: await adminCookie() } });
    expect(res.status).not.toBe(307);
  });
});
