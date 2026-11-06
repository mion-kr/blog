import { beforeEach, describe, expect, it } from 'vitest';
import { adminCookie } from '../helpers/auth';
import { clearTables } from '../helpers/db';
import { fetchPage, seedBasic } from '../helpers/seed';

describe('GET /admin(대시보드)', () => {
  beforeEach(async () => {
    await clearTables();
    await seedBasic();
  });

  it('발행·초안·카테고리·태그 수와 최근 초안(편집 링크)', async () => {
    const html = (await (await fetchPage('/admin', { headers: { cookie: await adminCookie() } })).text()).replaceAll('&quot;', '"');
    // 섬 props(서버 렌더 + 직렬화)에 집계가 들어간다
    expect(html).toContain('"publishedTotal":[0,2]');
    expect(html).toContain('"draftTotal":[0,1]');
    expect(html).toContain('"categoryTotal":[0,2]');
    expect(html).toContain('"tagTotal":[0,2]');
    expect(html).toContain('href="/admin/posts/draft-post/edit"');
    expect(html).not.toContain('초안 본문');
  });
});
