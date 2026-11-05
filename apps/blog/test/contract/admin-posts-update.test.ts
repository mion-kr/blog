import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { adminCookie } from '../helpers/auth';
import { adminJson } from '../helpers/admin-api';
import { clearTables } from '../helpers/db';
import { ids, seedBasic, T0 } from '../helpers/seed';

const BASE = 'http://localhost:4321/local-media/';
const D = '01900000-0000-7000-8000-00000000d002';
const full = (over: Record<string, unknown> = {}) => ({ title: '첫 글 </script>', content: '# 소개', excerpt: '첫 글 요약', coverImage: 'https://media.mion-space.dev/posts/p1/thumbnail/a.webp', published: true, categoryId: ids.catDev, tagIds: [ids.tagAi, ids.tagNest], ...over });
const update = (id: string, body: unknown, headers?: Record<string, string>) => adminJson('PUT', `/api/admin/posts/${id}`, body, headers);
const row = (id: string) => env.DB.prepare('SELECT * FROM posts WHERE id=?').bind(id).first<Record<string, any>>();
const put = (key: string) => env.MEDIA.put(key, new Uint8Array([1]), { httpMetadata: { contentType: 'image/png' } });
const exists = async (key: string) => (await env.MEDIA.head(key)) !== null;

describe('PUT /api/admin/posts/{id}', () => {
  beforeEach(async () => {
    await clearTables();
    await seedBasic();
    const listed = await env.MEDIA.list();
    await Promise.all(listed.objects.map((o) => env.MEDIA.delete(o.key)));
  });

  it('발행된 글은 제목을 바꿔도 slug 유지(사용자 결정 3), updated_at 갱신, published_at 유지', async () => {
    const { status, body } = await update(ids.post1, full({ title: '바뀐 제목' }));
    expect(status).toBe(200);
    expect(body).toEqual({ success: true, data: { slug: 'first-post' } });
    const post = await row(ids.post1);
    expect(post).toMatchObject({ title: '바뀐 제목', slug: 'first-post', published_at: T0 });
    expect(post!.updated_at).toBeGreaterThan(T0 + 1000);
  });

  it('발행 전 글은 제목이 바뀌면 slug 재생성(자기 자신 제외)', async () => {
    const { body } = await update(ids.draft, full({ title: '초안 새 제목', published: false }));
    expect(body!.data.slug).toBe('choan-sae-jemok');
    const same = await update(ids.draft, full({ title: '초안 새 제목', published: false }));
    expect(same.body!.data.slug).toBe('choan-sae-jemok');
  });

  it('발행 전환: 미발행→발행 now, 발행→미발행 null', async () => {
    const before = Date.now();
    await update(ids.draft, full({ title: '초안', published: true }));
    expect((await row(ids.draft))!.published_at).toBeGreaterThanOrEqual(before);
    await update(ids.post2, full({ title: 'NestJS 검색 글', published: false, excerpt: null, coverImage: null }));
    expect((await row(ids.post2))!.published_at).toBeNull();
  });

  it('excerpt·coverImage를 빼면 null로 저장, 빈 본문이면 기존 본문 유지', async () => {
    await update(ids.post1, { ...full({ content: '   ' }), excerpt: undefined, coverImage: undefined });
    expect(await row(ids.post1)).toMatchObject({ excerpt: null, cover_image: null, content: '# 소개\n\n본문 **굵게**\n\n```ts\nconst a = 1;\n```' });
  });

  it('태그 교체와 이전·새 카테고리·태그 집계', async () => {
    await update(ids.post1, full({ categoryId: ids.catSkills, tagIds: [ids.tagNest] }));
    expect((await env.DB.prepare('SELECT tag_id FROM post_tags WHERE post_id=?').bind(ids.post1).all()).results).toEqual([{ tag_id: ids.tagNest }]);
    expect(await env.DB.prepare('SELECT post_count FROM categories WHERE id=?').bind(ids.catDev).first('post_count')).toBe(2);
    expect(await env.DB.prepare('SELECT post_count FROM categories WHERE id=?').bind(ids.catSkills).first('post_count')).toBe(1);
    expect(await env.DB.prepare('SELECT post_count FROM tags WHERE id=?').bind(ids.tagAi).first('post_count')).toBe(1);
  });

  it('커버 교체 시 이전 객체 삭제, 본문에서 뺀 이미지 삭제, 옛 Supabase 주소는 지우지 않음', async () => {
    await put(`posts/${ids.post1}/thumbnail/old.png`);
    await put(`posts/${ids.post1}/content/keep.png`);
    await put(`posts/${ids.post1}/content/gone.png`);
    await put(`draft/${D}/thumbnail/1-new.png`);
    await env.DB.prepare('UPDATE posts SET cover_image=?, content=? WHERE id=?')
      .bind(`${BASE}posts/${ids.post1}/thumbnail/old.png`, `${BASE}posts/${ids.post1}/content/keep.png ${BASE}posts/${ids.post1}/content/gone.png`, ids.post1).run();
    const res = await update(ids.post1, full({ content: `${BASE}posts/${ids.post1}/content/keep.png`, coverImage: `${BASE}draft/${D}/thumbnail/1-new.png`, coverImageKey: `draft/${D}/thumbnail/1-new.png`, draftUuid: D }));
    expect(res.status).toBe(200);
    expect((await row(ids.post1))!.cover_image).toBe(`${BASE}posts/${ids.post1}/thumbnail/1-new.png`);
    expect(await exists(`posts/${ids.post1}/thumbnail/old.png`)).toBe(false);
    expect(await exists(`posts/${ids.post1}/content/gone.png`)).toBe(false);
    expect(await exists(`posts/${ids.post1}/content/keep.png`)).toBe(true);
    expect(await exists(`draft/${D}/thumbnail/1-new.png`)).toBe(false);

    await env.DB.prepare('UPDATE posts SET cover_image=? WHERE id=?').bind('https://abc.supabase.co/storage/v1/object/public/production/posts/p1/thumbnail/a.webp', ids.post1).run();
    await put('posts/p1/thumbnail/a.webp');
    await update(ids.post1, full({ coverImage: null }));
    expect(await exists('posts/p1/thumbnail/a.webp')).toBe(true);
  });

  it('D1 쓰기가 실패하면 이번 요청 복사본만 지우고 기존 글·객체는 그대로', async () => {
    await put(`draft/${D}/thumbnail/1-new.png`);
    await put(`posts/${ids.post1}/thumbnail/old.png`);
    await env.DB.prepare('UPDATE posts SET cover_image=? WHERE id=?').bind(`${BASE}posts/${ids.post1}/thumbnail/old.png`, ids.post1).run();
    // post_tags 삽입이 실패하도록 태그 FK를 깨는 대신, 존재하지만 곧 지워질 태그를 쓴다: 트리거로 실패 유도
    await env.DB.prepare("CREATE TRIGGER fail_post_tags BEFORE INSERT ON post_tags BEGIN SELECT RAISE(ABORT, 'boom'); END").run();
    const res = await update(ids.post1, full({ coverImage: `${BASE}draft/${D}/thumbnail/1-new.png`, coverImageKey: `draft/${D}/thumbnail/1-new.png`, draftUuid: D }));
    await env.DB.prepare('DROP TRIGGER fail_post_tags').run();
    expect(res.status).toBe(500);
    expect(await exists(`posts/${ids.post1}/thumbnail/1-new.png`)).toBe(false);
    expect(await exists(`posts/${ids.post1}/thumbnail/old.png`)).toBe(true);
    expect(await exists(`draft/${D}/thumbnail/1-new.png`)).toBe(true);
    expect((await row(ids.post1))!.title).toBe('첫 글 </script>');
    expect((await env.DB.prepare('SELECT count(*) AS n FROM post_tags WHERE post_id=?').bind(ids.post1).first('n'))).toBe(2);
  });

  it('없는 id 404, 검증 오류 400, 미인증 401, 다른 출처 403', async () => {
    expect((await update('01900000-0000-7000-8000-0000000000ee', full())).body!.error!.code).toBe('POST_NOT_FOUND');
    expect((await update(ids.post1, full({ title: '' }))).status).toBe(400);
    expect((await update(ids.post1, full(), { origin: 'http://localhost:4321', 'content-type': 'application/json' })).status).toBe(401);
    expect((await update(ids.post1, full(), { cookie: await adminCookie(), origin: 'https://evil.test', 'content-type': 'application/json' })).status).toBe(403);
  });
});
