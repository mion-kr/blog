import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { adminCookie } from '../helpers/auth';
import { clearTables } from '../helpers/db';
import { fetchPage, ids, seedBasic } from '../helpers/seed';

describe('GET /admin/settings', () => {
  beforeEach(async () => {
    await clearTables();
    await seedBasic();
  });

  it('설정 5필드(행 없으면 기본값)와 프로필 카드(users의 사진)', async () => {
    await env.DB.prepare('UPDATE users SET image=? WHERE id=?').bind('https://lh3.googleusercontent.com/a/p', ids.user).run();
    const html = (await (await fetchPage('/admin/settings', { headers: { cookie: await adminCookie() } })).text()).replaceAll('&quot;', '"').replaceAll('&#39;', "'");
    expect(html).toContain('"siteTitle":[0,"Mion\'s Blog"]');
    expect(html).toContain('"siteUrl":[0,"http://localhost:3000"]');
    expect(html).toContain('"postsPerPage":[0,10]');
    expect(html).toContain('https://lh3.googleusercontent.com/a/p');
    expect(html).toContain('admin@example.com');
  });
});
