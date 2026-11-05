import { beforeEach, describe, expect, it } from 'vitest';
import { adminCookie } from '../helpers/auth';
import { clearTables } from '../helpers/db';
import { fetchPage, seedBasic } from '../helpers/seed';

const admin = async (path: string, cookie?: string) => (await fetchPage(path, { headers: { cookie: cookie ?? (await adminCookie()) } })).text();

describe('관리자 레이아웃', () => {
  beforeEach(async () => {
    await clearTables();
    await seedBasic();
  });

  it('noindex·nofollow, 기본 제목, 메뉴 5개, 사용자 이름·이메일, 현재 메뉴 표시', async () => {
    const html = await admin('/admin');
    expect(html).toMatch(/<title>Mion(&#39;|')s Blog<\/title>/);
    expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
    for (const label of ['대시보드', '포스트 관리', '카테고리', '태그', '설정']) expect(html).toContain(label);
    expect(html).toContain('미온');
    expect(html).toContain('admin@example.com');
    expect(html).toMatch(/<a[^>]*href="\/admin"[^>]*aria-current="page"/);
    expect(html).toContain('관리자 콘솔');
  });

  it('세션 만료까지 10분 미만이면 경고 배너', async () => {
    const soon = new Date(Date.now() - (604_800 - 300) * 1000);
    expect(await admin('/admin', await adminCookie({ now: soon }))).toContain('세션이 곧 만료돼요. 약 5분 내에');
    expect(await admin('/admin')).not.toContain('세션이 곧 만료돼요');
  });
});
