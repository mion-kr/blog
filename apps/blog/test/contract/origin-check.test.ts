import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { adminCookie } from '../helpers/auth';
import { fetchPage } from '../helpers/seed';

// 관리자 확인이 먼저라 유효한 관리자 쿠키를 붙여 보낸다.
const WRITES: [string, string][] = [
  ['POST', '/api/admin/posts'], ['PUT', '/api/admin/posts/x'], ['DELETE', '/api/admin/posts/x'],
  ['POST', '/api/admin/categories'], ['PUT', '/api/admin/categories/x'], ['DELETE', '/api/admin/categories/x'],
  ['POST', '/api/admin/tags'], ['PUT', '/api/admin/tags/x'], ['DELETE', '/api/admin/tags/x'],
  ['PATCH', '/api/admin/settings'], ['POST', '/api/admin/uploads'], ['POST', '/admin/anything'],
];
const BODIES: [string, BodyInit][] = [
  ['application/json', '{}'],
  ['application/x-www-form-urlencoded', 'a=1'],
  ['text/plain', 'x'],
];

async function expect403(method: string, path: string, headers: Record<string, string>, body?: BodyInit) {
  const res = await fetchPage(path, { method, headers, body, redirect: 'manual' });
  expect(res.status, `${method} ${path} ${JSON.stringify(headers)}`).toBe(403);
  expect(await res.json()).toEqual({ success: false, error: { code: 'ORIGIN_MISMATCH', message: '요청 출처가 올바르지 않아요.' } });
}

describe('출처 검사(middleware)', () => {
  it('다른 Origin·Origin 없음의 관리자 쓰기를 content-type과 무관하게 거부한다', async () => {
    const cookie = await adminCookie();
    for (const [method, path] of WRITES) {
      for (const [type, body] of BODIES) {
        await expect403(method, path, { cookie, origin: 'https://evil.test', 'content-type': type }, body);
        await expect403(method, path, { cookie, 'content-type': type }, body);
      }
      const form = new FormData();
      form.set('file', new File(['x'], 'a.png', { type: 'image/png' }));
      await expect403(method, path, { cookie, origin: 'http://localhost:4321.evil.test' }, form);
    }
    expect(await env.DB.prepare('SELECT count(*) AS n FROM posts').first('n')).toBe(0);
  });

  it('POST /auth/signout도 출처를 검사한다(세션 없어도)', async () => {
    await expect403('POST', '/auth/signout', { origin: 'https://evil.test' });
  });

  it('같은 출처면 출처 검사를 통과한다', async () => {
    const res = await fetchPage('/api/admin/settings', { method: 'PATCH', headers: { cookie: await adminCookie(), origin: 'http://localhost:4321', 'content-type': 'application/json' }, body: '{}' });
    expect(res.status).not.toBe(403);
  });

  it('GET은 출처 검사를 하지 않는다', async () => {
    const res = await fetchPage('/admin', { headers: { cookie: await adminCookie(), origin: 'https://evil.test' }, redirect: 'manual' });
    expect(res.status).not.toBe(403);
  });
});
