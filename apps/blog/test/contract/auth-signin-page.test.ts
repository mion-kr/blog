import { describe, expect, it } from 'vitest';
import { adminCookie } from '../helpers/auth';
import { fetchPage } from '../helpers/seed';

describe('GET /auth/signin', () => {
  it('비로그인: 200, noindex·nofollow, canonical·OG 없음, Google 로그인 링크(안전한 callbackUrl)', async () => {
    const res = await fetchPage('/auth/signin?callbackUrl=%2Fadmin%2Ftags');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<title>관리자 로그인 | Mion&#39;s Blog</title>");
    expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(html).toContain('<meta name="googlebot" content="noindex, nofollow">');
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain('og:title');
    expect(html).toContain('href="/auth/google?callbackUrl=%2Fadmin%2Ftags"');
    expect(html).toContain('Google 계정으로 로그인');
  });

  it('바깥 callbackUrl은 /admin으로', async () => {
    expect(await (await fetchPage('/auth/signin?callbackUrl=https%3A%2F%2Fevil.test')).text()).toContain('href="/auth/google?callbackUrl=%2Fadmin"');
  });

  it('error=AccessDenied는 권한 없음 문구, 그 밖의 error는 일반 오류 문구', async () => {
    expect(await (await fetchPage('/auth/signin?error=AccessDenied')).text()).toContain('<p class="signin-error" role="alert">접근 권한이 없는 계정입니다. 관리자 계정을 확인해 주세요.</p>');
    for (const e of ['SessionExpired', 'OAuthError', 'x']) {
      expect(await (await fetchPage(`/auth/signin?error=${e}`)).text()).toContain('<p class="signin-error" role="alert">로그인 도중 오류가 발생했어요. 다시 시도해 주세요.</p>');
    }
    expect(await (await fetchPage('/auth/signin')).text()).not.toContain('<p class="signin-error"');
  });

  it('관리자 세션이 있으면 callbackUrl로 302', async () => {
    const res = await fetchPage('/auth/signin?callbackUrl=%2Fadmin%2Fposts', { redirect: 'manual', headers: { cookie: await adminCookie() } });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/admin/posts');
  });
});
