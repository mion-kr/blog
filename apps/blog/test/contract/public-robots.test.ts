import { describe, expect, it } from 'vitest';
import { fetchPage } from '../helpers/seed';

// 테스트 설정(wrangler vars)은 ROBOTS_INDEXABLE=false(로컬·미리보기)다.
describe('GET /robots.txt', () => {
  it('색인 비허용 환경: 전체 차단 + Host·Sitemap', async () => {
    const res = await fetchPage('/robots.txt');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(await res.text()).toBe('User-Agent: *\nDisallow: /\n\nHost: http://localhost:4321\nSitemap: http://localhost:4321/sitemap.xml\n');
  });
});
