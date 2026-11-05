import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { adminJson } from '../helpers/admin-api';
import { adminCookie } from '../helpers/auth';
import { clearTables } from '../helpers/db';
import { ids, seedBasic, T0 } from '../helpers/seed';

const update = (id: string, body: unknown) => adminJson('PUT', `/api/admin/tags/${id}`, body);

describe('PUT /api/admin/tags/{id}', () => {
  beforeEach(async () => {
    await clearTables();
    await seedBasic();
  });

  it('일부 필드만 바꾸고 updated_at 갱신, 200 {success:true}', async () => {
    const { status, body } = await update(ids.tagNest, { name: '바뀐 이름' });
    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    const row = await env.DB.prepare('SELECT name, updated_at FROM tags WHERE id=?').bind(ids.tagNest).first<{ name: string; updated_at: number }>();
    expect(row!.name).toBe('바뀐 이름');
    expect(row!.updated_at).toBeGreaterThan(T0);
  });

  it('자기 값 그대로는 중복 아님, 이름·slug 둘 다 겹치면 이름 오류 먼저', async () => {
    const self = await env.DB.prepare('SELECT name, slug FROM tags WHERE id=?').bind(ids.tagNest).first<{ name: string; slug: string }>();
    expect((await update(ids.tagNest, self!)).status).toBe(200);
    const other = await env.DB.prepare('SELECT name, slug FROM tags WHERE id=?').bind(ids.tagAi).first<{ name: string; slug: string }>();
    const res = await update(ids.tagNest, other!);
    expect(res.status).toBe(409);
    expect(res.body!.error!.code).toBe('TAG_NAME_TAKEN');
    expect((await update(ids.tagNest, { slug: other!.slug })).body!.error!.code).toBe('TAG_SLUG_TAKEN');
  });

  it('없는 id 404, 검증 오류 400', async () => {
    const missing = await update('01900000-0000-7000-8000-0000000000ee', { name: 'x' });
    expect(missing.status).toBe(404);
    expect(missing.body!.error!.code).toBe('TAG_NOT_FOUND');
    expect((await update(ids.tagNest, { slug: 'Bad Slug' })).status).toBe(400);
  });

  it('미인증 401, 다른 출처 403', async () => {
    const json = { 'content-type': 'application/json' };
    expect((await adminJson('PUT', `/api/admin/tags/${ids.tagNest}`, { name: 'x' }, { ...json, origin: 'http://localhost:4321' })).status).toBe(401);
    expect((await adminJson('PUT', `/api/admin/tags/${ids.tagNest}`, { name: 'x' }, { ...json, cookie: await adminCookie(), origin: 'https://evil.test' })).status).toBe(403);
  });
});
