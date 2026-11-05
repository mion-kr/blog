import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { adminJson } from '../helpers/admin-api';
import { clearTables } from '../helpers/db';
import { ids, seedBasic } from '../helpers/seed';

const del = (id: string) => adminJson('DELETE', `/api/admin/categories/${id}`);

describe('DELETE /api/admin/categories/{id}', () => {
  beforeEach(async () => {
    await clearTables();
    await seedBasic();
  });

  it('연결된 글이 없으면 200 삭제', async () => {
    await env.DB.prepare('DELETE FROM post_tags').run();
    await env.DB.prepare("UPDATE posts SET category_id=?").bind(ids.catDev).run();
    const { status, body } = await del(ids.catSkills);
    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(await env.DB.prepare('SELECT count(*) AS n FROM categories WHERE id=?').bind(ids.catSkills).first('n')).toBe(0);
  });

  it('초안에만 연결돼 있어도 409 CATEGORY_IN_USE', async () => {
    // 발행 글 연결을 끊고 초안만 남긴다
    await env.DB.prepare("UPDATE posts SET category_id=? WHERE published=0").bind(ids.catSkills).run();
    await env.DB.prepare('DELETE FROM post_tags WHERE post_id IN (SELECT id FROM posts WHERE published=1)').run();
    const target = 'categories' === 'categories' ? ids.catSkills : ids.tagAi;
    const res = await del(target);
    expect(res.status).toBe(409);
    expect(res.body!.error).toEqual({ code: 'CATEGORY_IN_USE', message: '이 카테고리를 사용하는 포스트가 1개 있어 삭제할 수 없습니다.' });
  });

  it('없는 id 404', async () => {
    expect((await del('01900000-0000-7000-8000-0000000000ee')).status).toBe(404);
  });
});
