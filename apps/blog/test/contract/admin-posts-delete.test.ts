import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminCookie } from '../helpers/auth';
import { adminJson } from '../helpers/admin-api';
import { clearTables } from '../helpers/db';
import { ids, seedBasic } from '../helpers/seed';

const BASE = 'http://localhost:4321/local-media/';
const del = (id: string, headers?: Record<string, string>) => adminJson('DELETE', `/api/admin/posts/${id}`, undefined, headers);
const put = (key: string) => env.MEDIA.put(key, new Uint8Array([1]));
const exists = async (key: string) => (await env.MEDIA.head(key)) !== null;

describe('DELETE /api/admin/posts/{id}', () => {
  beforeEach(async () => {
    await clearTables();
    await seedBasic();
  });

  it('200, 글·post_tags 삭제, 집계 갱신, 커버·본문 이미지 삭제', async () => {
    await put(`posts/${ids.post1}/thumbnail/a.png`);
    await put(`posts/${ids.post1}/content/b.png`);
    await env.DB.prepare('UPDATE posts SET cover_image=?, content=? WHERE id=?').bind(`${BASE}posts/${ids.post1}/thumbnail/a.png`, `![b](${BASE}posts/${ids.post1}/content/b.png)`, ids.post1).run();
    const { status, body } = await del(ids.post1);
    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(await env.DB.prepare('SELECT count(*) AS n FROM posts WHERE id=?').bind(ids.post1).first('n')).toBe(0);
    expect(await env.DB.prepare('SELECT count(*) AS n FROM post_tags WHERE post_id=?').bind(ids.post1).first('n')).toBe(0);
    expect(await env.DB.prepare('SELECT post_count FROM categories WHERE id=?').bind(ids.catDev).first('post_count')).toBe(2);
    expect(await env.DB.prepare('SELECT post_count FROM tags WHERE id=?').bind(ids.tagNest).first('post_count')).toBe(0);
    expect(await exists(`posts/${ids.post1}/thumbnail/a.png`)).toBe(false);
    expect(await exists(`posts/${ids.post1}/content/b.png`)).toBe(false);
  });

  it('R2 삭제가 실패해도 200(경고 로그만)', async () => {
    await env.DB.prepare('UPDATE posts SET cover_image=? WHERE id=?').bind(`${BASE}posts/${ids.post1}/thumbnail/a.png`, ids.post1).run();
    const spy = vi.spyOn(env.MEDIA, 'delete').mockRejectedValue(new Error('r2 down'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { status } = await del(ids.post1);
    spy.mockRestore();
    warn.mockRestore();
    expect(status).toBe(200);
  });

  it('없는 id 404, 미인증 401, 다른 출처 403', async () => {
    expect((await del('01900000-0000-7000-8000-0000000000ee')).status).toBe(404);
    expect((await del(ids.post1, { origin: 'http://localhost:4321' })).status).toBe(401);
    expect((await del(ids.post1, { cookie: await adminCookie(), origin: 'https://evil.test' })).status).toBe(403);
  });
});
