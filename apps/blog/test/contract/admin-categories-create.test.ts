import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { adminCookie } from '../helpers/auth';
import { adminJson } from '../helpers/admin-api';
import { clearTables } from '../helpers/db';
import { ids, seedBasic } from '../helpers/seed';

const create = (body: unknown, headers?: Record<string, string>) => adminJson('POST', '/api/admin/categories', body, headers);

describe('POST /api/admin/categories', () => {
  beforeEach(async () => {
    await clearTables();
    await seedBasic();
  });

  it('201 {id}, 이름·slug 그대로 저장, post_count 0', async () => {
    const { status, body } = await create({ name: '새 카테고리', slug: 'new-one', description: '설명', color: '#3B82F6', });
    expect(status).toBe(201);
    expect(body).toEqual({ success: true, data: { id: expect.stringMatching(/^[0-9a-f-]{36}$/) } });
    expect(await env.DB.prepare('SELECT name, slug, post_count FROM categories WHERE id=?').bind(body!.data.id).first()).toEqual({ name: '새 카테고리', slug: 'new-one', post_count: 0 });
  });

  it('검증: 이름 1~, slug 형식·', async () => {
    for (const body of [{ name: '', slug: 'a' }, { name: 'a'.repeat(50 + 1), slug: 'a' }, { name: 'a', slug: 'Bad Slug' }, { name: 'a', slug: '-a' }, { name: 'a', slug: 'a'.repeat(100 + 1) }, { slug: 'a' }]) {
      const res = await create(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body!.error!.code).toBe('VALIDATION_FAILED');
    }
  });

  it('중복은 slug 먼저 409, 그다음 이름(대소문자 구분)', async () => {
    const existing = await env.DB.prepare('SELECT name, slug FROM categories WHERE id=?').bind(ids.catSkills).first<{ name: string; slug: string }>();
    const both = await create({ name: existing!.name, slug: existing!.slug });
    expect(both.status).toBe(409);
    expect(both.body!.error).toEqual({ code: 'CATEGORY_SLUG_TAKEN', message: `슬러그 '${existing!.slug}'가 이미 존재합니다.` });
    const name = await create({ name: existing!.name, slug: 'other-slug' });
    expect(name.body!.error!.code).toBe('CATEGORY_NAME_TAKEN');
    expect((await create({ name: existing!.name.toUpperCase() + 'x', slug: 'other-slug-2' })).status).toBe(201);
  });

  it('미인증 401, 다른 출처 403', async () => {
    expect((await create({ name: 'a', slug: 'a' }, { origin: 'http://localhost:4321', 'content-type': 'application/json' })).status).toBe(401);
    expect((await create({ name: 'a', slug: 'a' }, { cookie: await adminCookie(), origin: 'https://evil.test', 'content-type': 'application/json' })).status).toBe(403);
  });
});
