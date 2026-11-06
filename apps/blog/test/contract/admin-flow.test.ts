import { beforeEach, describe, expect, it } from 'vitest';
import { adminJson } from '../helpers/admin-api';
import { clearTables } from '../helpers/db';
import { fetchPage, ids, seedBasic } from '../helpers/seed';

// 이관 전 verify-integrated-admin.mjs의 흐름: 초안은 공개 404 → 발행하면 200 → 삭제하면 404·목록에서 빠짐
describe('관리자 글 흐름', () => {
  beforeEach(async () => {
    await clearTables();
    await seedBasic();
  });

  it('초안 404 → 발행 200 → 삭제 404', async () => {
    const body = { title: 'Integrated flow', content: '본문', published: false, categoryId: ids.catDev, tagIds: [ids.tagAi] };
    const created = await adminJson('POST', '/api/admin/posts', body);
    const { id, slug } = created.body!.data;
    expect((await fetchPage(`/posts/${slug}`)).status).toBe(404);
    expect((await adminJson('PUT', `/api/admin/posts/${id}`, { ...body, published: true })).status).toBe(200);
    expect((await fetchPage(`/posts/${slug}`)).status).toBe(200);
    expect(await (await fetchPage('/feed.xml')).text()).toContain(`/posts/${slug}</guid>`);
    expect((await adminJson('DELETE', `/api/admin/posts/${id}`)).status).toBe(200);
    expect((await fetchPage(`/posts/${slug}`)).status).toBe(404);
    expect(await (await fetchPage('/sitemap.xml')).text()).not.toContain(slug);
  });
});
