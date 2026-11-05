import { describe, expect, it } from 'vitest';
import { adminCookie } from '../helpers/auth';
import { fetchPage } from '../helpers/seed';

describe('공개 헤더', () => {
  it('방문자: 관리자 링크·로그아웃 없음', async () => {
    const html = await (await fetchPage('/about')).text();
    expect(html).not.toContain('href="/admin"');
    expect(html).not.toContain('로그아웃');
  });

  it('관리자 세션: Admin 링크와 POST /auth/signout 로그아웃 폼', async () => {
    const html = await (await fetchPage('/about', { headers: { cookie: await adminCookie() } })).text();
    expect(html).toContain('<a href="/admin">Admin</a>');
    expect(html).toMatch(/<form method="post" action="\/auth\/signout"[^>]*><button type="submit">로그아웃<\/button><\/form>/);
  });
});
