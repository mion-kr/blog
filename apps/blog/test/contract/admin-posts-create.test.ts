import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminCookie } from '../helpers/auth';
import { adminJson } from '../helpers/admin-api';
import { clearTables } from '../helpers/db';
import { ids, seedBasic } from '../helpers/seed';

const BASE = 'http://localhost:4321/local-media/';
const D = '01900000-0000-7000-8000-00000000d001';
const valid = (over: Record<string, unknown> = {}) => ({ title: '새 글', content: '본문', published: false, categoryId: ids.catDev, tagIds: [ids.tagAi], ...over });
const create = (body: unknown, headers?: Record<string, string>) => adminJson('POST', '/api/admin/posts', body, headers);
const row = (slug: string) => env.DB.prepare('SELECT * FROM posts WHERE slug=?').bind(slug).first<Record<string, unknown>>();
const put = (key: string) => env.MEDIA.put(key, new Uint8Array([1]), { httpMetadata: { contentType: 'image/png' } });
const exists = async (key: string) => (await env.MEDIA.head(key)) !== null;

describe('POST /api/admin/posts', () => {
  beforeEach(async () => {
    await clearTables();
    await seedBasic();
    const listed = await env.MEDIA.list();
    await Promise.all(listed.objects.map((o) => env.MEDIA.delete(o.key)));
  });

  it('초안 생성: 201 {id, slug}, 한글 제목 slug, published_at null, 작성자는 세션 사용자, 앞뒤 공백 정리', async () => {
    const { status, body } = await create(valid({ title: '  새 글  ', excerpt: '  요약  ', coverImage: '  ' }));
    expect(status).toBe(201);
    expect(body).toEqual({ success: true, data: { id: expect.stringMatching(/^[0-9a-f-]{36}$/), slug: 'sae-geul' } });
    const post = await row('sae-geul');
    expect(post).toMatchObject({ title: '새 글', excerpt: '요약', cover_image: null, published: 0, published_at: null, author_id: ids.user, content: '본문', view_count: 0 });
  });

  it('발행 생성은 published_at = 현재, post_tags와 카테고리·태그 post_count·updated_at 갱신', async () => {
    const before = Date.now();
    const { body } = await create(valid({ title: 'Hello World', published: true, tagIds: [ids.tagAi, ids.tagNest] }));
    const post = await row('hello-world');
    expect(post!.published).toBe(1);
    expect(post!.published_at as number).toBeGreaterThanOrEqual(before);
    expect(await env.DB.prepare('SELECT tag_id FROM post_tags WHERE post_id=? ORDER BY tag_id').bind(body!.data.id).all().then((r) => r.results.map((x) => x.tag_id))).toEqual([ids.tagAi, ids.tagNest]);
    expect(await env.DB.prepare('SELECT post_count, updated_at FROM categories WHERE id=?').bind(ids.catDev).first()).toEqual({ post_count: 4, updated_at: expect.any(Number) });
    expect((await env.DB.prepare('SELECT updated_at FROM categories WHERE id=?').bind(ids.catDev).first<{ updated_at: number }>())!.updated_at).toBeGreaterThanOrEqual(before);
    expect(await env.DB.prepare('SELECT post_count FROM tags WHERE id=?').bind(ids.tagAi).first('post_count')).toBe(3);
  });

  it('같은 제목 두 번이면 -1, 빈 slug면 post', async () => {
    await create(valid({ title: '같은 제목' }));
    expect((await create(valid({ title: '같은 제목' }))).body!.data.slug).toBe('gateun-jemok-1');
    expect((await create(valid({ title: '!!!' }))).body!.data.slug).toBe('post');
  });

  it('slug가 50바이트를 넘는 긴 제목도 저장하고, 같은 제목 두 번째는 -1', async () => {
    const title = '새 서비스를 Vercel 대신 Cloudflare로 시작하는 이유';
    const slug = 'sae-seobiseureul-vercel-daesin-cloudflarero-sijakhaneun-iyu';
    const first = await create(valid({ title }));
    expect(first.status).toBe(201);
    expect(first.body!.data.slug).toBe(slug);
    const second = await create(valid({ title }));
    expect(second.status).toBe(201);
    expect(second.body!.data.slug).toBe(`${slug}-1`);
  });

  it('검증 오류는 400 VALIDATION_FAILED + fieldErrors, DB 쓰기 없음', async () => {
    for (const body of [
      valid({ title: '' }), valid({ title: 'a'.repeat(201) }), valid({ content: '' }), valid({ excerpt: 'a'.repeat(501) }),
      valid({ coverImage: 'not a url' }), valid({ published: 'yes' }), valid({ categoryId: 'x' }), valid({ tagIds: [] }), valid({ tagIds: ['x'] }),
      valid({ draftUuid: 'x' }), { ...valid(), title: undefined }, 'not json',
    ]) {
      const res = await create(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body!.error!.code).toBe('VALIDATION_FAILED');
      expect(res.body!.error!.message).toBe('입력 데이터가 올바르지 않습니다.');
    }
    expect(await env.DB.prepare('SELECT count(*) AS n FROM posts').first('n')).toBe(3);
  });

  it('없는 카테고리·태그, 중복 tagIds는 400(R2 복사 없음)', async () => {
    await put(`draft/${D}/thumbnail/1-a.png`);
    const cover = { coverImage: `${BASE}draft/${D}/thumbnail/1-a.png`, coverImageKey: `draft/${D}/thumbnail/1-a.png`, draftUuid: D };
    const noCat = await create(valid({ ...cover, categoryId: '01900000-0000-7000-8000-0000000000ff' }));
    expect(noCat.status).toBe(400);
    expect(noCat.body!.error).toEqual({ code: 'CATEGORY_NOT_FOUND', message: "카테고리 ID '01900000-0000-7000-8000-0000000000ff'를 찾을 수 없습니다." });
    const noTag = await create(valid({ ...cover, tagIds: ['01900000-0000-7000-8000-0000000000fe'] }));
    expect(noTag.body!.error!.code).toBe('TAG_NOT_FOUND');
    const dup = await create(valid({ ...cover, tagIds: [ids.tagAi, ids.tagAi] }));
    expect(dup.status).toBe(400);
    expect(dup.body!.error!.code).toBe('TAG_NOT_FOUND');
    expect((await env.MEDIA.list({ prefix: 'posts/' })).objects).toHaveLength(0);
  });

  it('draft 커버·본문 이미지를 posts/{id}/로 옮기고 URL 치환, draft 원본 삭제, 다른 draft URL은 그대로', async () => {
    await put(`draft/${D}/thumbnail/1-a.png`);
    await put(`draft/${D}/content/2-b.png`);
    const content = `![b](${BASE}draft/${D}/content/2-b.png) ![o](${BASE}draft/other/content/9.png)`;
    const { status, body } = await create(valid({ content, coverImage: `${BASE}draft/${D}/thumbnail/1-a.png`, coverImageKey: `draft/${D}/thumbnail/1-a.png`, draftUuid: D }));
    expect(status).toBe(201);
    const post = await row(body!.data.slug);
    expect(post!.cover_image).toBe(`${BASE}posts/${body!.data.id}/thumbnail/1-a.png`);
    expect(post!.content).toBe(`![b](${BASE}posts/${body!.data.id}/content/2-b.png) ![o](${BASE}draft/other/content/9.png)`);
    expect(await exists(`posts/${body!.data.id}/thumbnail/1-a.png`)).toBe(true);
    expect(await exists(`posts/${body!.data.id}/content/2-b.png`)).toBe(true);
    expect(await exists(`draft/${D}/thumbnail/1-a.png`)).toBe(false);
    expect(await exists(`draft/${D}/content/2-b.png`)).toBe(false);
  });

  it('draftUuid 없이 coverImageKey만 오면 받은 coverImage 그대로 저장', async () => {
    const { body } = await create(valid({ coverImage: 'https://example.com/a.png', coverImageKey: 'draft/x/thumbnail/a.png' }));
    expect((await row(body!.data.slug))!.cover_image).toBe('https://example.com/a.png');
  });

  it('잘못된 커버 키는 400 INVALID_UPLOAD_KEY', async () => {
    const res = await create(valid({ coverImage: 'https://x/a.png', coverImageKey: 'draft/other/thumbnail/a.png', draftUuid: D }));
    expect(res.status).toBe(400);
    expect(res.body!.error).toEqual({ code: 'INVALID_UPLOAD_KEY', message: '잘못된 업로드 객체 키입니다.' });
  });

  it('복사 도중 실패하면 그때까지 복사한 객체를 지우고 글을 만들지 않는다', async () => {
    await put(`draft/${D}/content/1-a.png`);
    const content = `${BASE}draft/${D}/content/1-a.png ${BASE}draft/${D}/content/2-missing.png`;
    const res = await create(valid({ content, draftUuid: D }));
    expect(res.status).toBe(500);
    expect((await env.MEDIA.list({ prefix: 'posts/' })).objects).toHaveLength(0);
    expect(await exists(`draft/${D}/content/1-a.png`)).toBe(true);
    expect(await env.DB.prepare('SELECT count(*) AS n FROM posts').first('n')).toBe(3);
  });

  it('D1 쓰기가 실패하면 이번에 복사한 객체를 지우고 draft 원본은 남긴다', async () => {
    await put(`draft/${D}/thumbnail/1-a.png`);
    await env.DB.prepare("CREATE TRIGGER fail_create BEFORE INSERT ON post_tags BEGIN SELECT RAISE(ABORT, 'boom'); END").run();
    const res = await create(valid({ coverImage: `${BASE}draft/${D}/thumbnail/1-a.png`, coverImageKey: `draft/${D}/thumbnail/1-a.png`, draftUuid: D }));
    await env.DB.prepare('DROP TRIGGER fail_create').run();
    expect(res.status).toBe(500);
    expect((await env.MEDIA.list({ prefix: 'posts/' })).objects).toHaveLength(0);
    expect(await exists(`draft/${D}/thumbnail/1-a.png`)).toBe(true);
    expect(await env.DB.prepare('SELECT count(*) AS n FROM posts').first('n')).toBe(3);
  });

  it('미인증 401, 다른 출처 403', async () => {
    expect((await create(valid(), { origin: 'http://localhost:4321', 'content-type': 'application/json' })).status).toBe(401);
    expect((await create(valid(), { cookie: await adminCookie(), origin: 'https://evil.test', 'content-type': 'application/json' })).status).toBe(403);
  });

  it('slug를 고른 뒤 다른 저장이 같은 slug를 먼저 쓰면 500 없이 다음 slug로 저장한다', async () => {
    // 동시 저장 재현: 이 요청의 첫 batch 직전에 다른 글이 같은 slug를 차지한다.
    const batch = env.DB.batch.bind(env.DB);
    vi.spyOn(env.DB, 'batch').mockImplementationOnce(async (statements) => {
      await env.DB.prepare("INSERT INTO posts (id,title,slug,content,published,view_count,category_id,author_id,created_at,updated_at) VALUES ('race',?,?,?,0,0,?,?,0,0)")
        .bind('동시 저장', 'dongsi-jeojang', '본문', ids.catDev, ids.user).run();
      return batch(statements);
    });
    const { status, body } = await create(valid({ title: '동시 저장' }));
    vi.restoreAllMocks();
    expect(status).toBe(201);
    expect(body!.data.slug).toBe('dongsi-jeojang-1');
    expect(await row('dongsi-jeojang-1')).toMatchObject({ id: body!.data.id, title: '동시 저장' });
  });
});
