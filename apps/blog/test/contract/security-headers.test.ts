import { describe, expect, it } from 'vitest';
import { adminCookie } from '../helpers/auth';
import { fetchPage } from '../helpers/seed';

// 사용자 결정 17: 보안 응답 헤더. 관리자 화면 클릭재킹 방지가 우선이다.
// 스크립트·스타일 정책은 지금 화면이 인라인 스크립트(island·JSON-LD)와 style 속성을 쓰므로 넣지 않는다.
const EXPECTED = {
  'strict-transport-security': 'max-age=31536000',
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
};

const CASES: [string, string, () => Promise<RequestInit>][] = [
  ['공개 홈', '/', async () => ({})],
  ['공개 목록', '/posts', async () => ({})],
  ['없는 글(404)', '/posts/none-such-post', async () => ({})],
  ['RSS', '/feed.xml', async () => ({})],
  ['로그인 화면', '/auth/signin', async () => ({})],
  ['Google 로그인 시작(302)', '/auth/google', async () => ({})],
  ['관리자 화면', '/admin', async () => ({ headers: { cookie: await adminCookie() } })],
  ['관리자 글 편집 목록', '/admin/posts', async () => ({ headers: { cookie: await adminCookie() } })],
  ['관리자 미인증(307)', '/admin', async () => ({})],
  ['관리자 API 미인증(401)', '/api/admin/posts', async () => ({ method: 'POST', headers: { origin: 'http://localhost:4321' } })],
  ['출처 거부(403)', '/posts', async () => ({ method: 'POST', headers: { origin: 'https://evil.test' } })],
];

describe('보안 응답 헤더', () => {
  it.each(CASES)('%s', async (_name, path, init) => {
    const res = await fetchPage(path, { redirect: 'manual', ...(await init()) });
    for (const [key, value] of Object.entries(EXPECTED)) expect(res.headers.get(key), `${path} ${key}`).toBe(value);
    const csp = res.headers.get('content-security-policy') ?? '';
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toMatch(/script-src|style-src|default-src/);
  });

  it('Google 로그인 시작은 그대로 Google로 302하고 임시 쿠키를 붙인다', async () => {
    const res = await fetchPage('/auth/google', { redirect: 'manual' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toMatch(/^https:\/\/accounts\.google\.com\//);
    expect(res.headers.get('set-cookie')).toMatch(/mion-oauth=/);
  });
});
