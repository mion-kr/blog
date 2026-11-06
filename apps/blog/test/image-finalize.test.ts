import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { getDb } from '../src/server/db';
import { InvalidUploadKeyError, MediaMover, contentKeys } from '../src/server/uploads/finalize';
import { keyFromUrl } from '../src/server/uploads/media';
import { clearTables } from './helpers/db';

const BASE = 'https://media.mion-space.dev/';
const D = '01900000-0000-7000-8000-00000000d001';
const put = (key: string) => env.MEDIA.put(key, new Uint8Array([7]), { httpMetadata: { contentType: 'image/png' } });
const exists = async (key: string) => (await env.MEDIA.head(key)) !== null;

describe('이미지 확정(이관 전 uploads.service·content-image-finalizer)', () => {
  beforeEach(async () => {
    const listed = await env.MEDIA.list();
    await Promise.all(listed.objects.map((o) => env.MEDIA.delete(o.key)));
  });

  it('커버: draft/{draftUuid}/ 키를 posts/{id}/thumbnail/로 복사하고 새 공개 URL, 원본은 정리 대상', async () => {
    await put(`draft/${D}/thumbnail/1-a.png`);
    const mover = new MediaMover(env.MEDIA, BASE);
    const url = await mover.finalizeCover({ draftUuid: D, objectKey: `draft/${D}/thumbnail/1-a.png`, postId: 'p1', current: 'x' });
    expect(url).toBe(`${BASE}posts/p1/thumbnail/1-a.png`);
    expect(await exists('posts/p1/thumbnail/1-a.png')).toBe(true);
    expect((await env.MEDIA.get('posts/p1/thumbnail/1-a.png'))?.httpMetadata?.contentType).toBe('image/png');
    expect(mover.copied).toEqual(['posts/p1/thumbnail/1-a.png']);
    expect(mover.drafts).toEqual([`draft/${D}/thumbnail/1-a.png`]);
  });

  it('커버: draftUuid나 키가 없으면 받은 값 그대로, 다른 draft의 키는 InvalidUploadKeyError', async () => {
    const mover = new MediaMover(env.MEDIA, BASE);
    expect(await mover.finalizeCover({ draftUuid: undefined, objectKey: 'draft/x/thumbnail/a.png', postId: 'p1', current: 'keep' })).toBe('keep');
    await expect(mover.finalizeCover({ draftUuid: D, objectKey: 'draft/other/thumbnail/a.png', postId: 'p1', current: null })).rejects.toBeInstanceOf(InvalidUploadKeyError);
  });

  it('본문: 이번 draftUuid의 content 이미지만 옮기고 URL을 바꾼다', async () => {
    await put(`draft/${D}/content/1-a.png`);
    await put(`draft/${D}/content/2-b.png`);
    const content = `![a](${BASE}draft/${D}/content/1-a.png)\n<img src="${BASE}draft/${D}/content/2-b.png">\n![o](${BASE}draft/other/content/3.png) ![x](https://evil.test/draft/${D}/content/1-a.png)`;
    const mover = new MediaMover(env.MEDIA, BASE);
    const next = await mover.finalizeContent({ draftUuid: D, postId: 'p1', content });
    expect(next).toBe(`![a](${BASE}posts/p1/content/1-a.png)\n<img src="${BASE}posts/p1/content/2-b.png">\n![o](${BASE}draft/other/content/3.png) ![x](https://evil.test/draft/${D}/content/1-a.png)`);
    expect(mover.copied.sort()).toEqual(['posts/p1/content/1-a.png', 'posts/p1/content/2-b.png']);
  });

  it('복사 도중 실패해도 그때까지 복사한 키는 copied에 남는다(보상 삭제 대상)', async () => {
    await put(`draft/${D}/content/1-a.png`);
    const content = `${BASE}draft/${D}/content/1-a.png ${BASE}draft/${D}/content/2-missing.png`;
    const mover = new MediaMover(env.MEDIA, BASE);
    await expect(mover.finalizeContent({ draftUuid: D, postId: 'p1', content })).rejects.toThrow();
    expect(mover.copied).toEqual(['posts/p1/content/1-a.png']);
    await mover.rollback();
    expect(await exists('posts/p1/content/1-a.png')).toBe(false);
  });

  it('본문에서 빠진 posts/{id}/content 이미지 키', () => {
    const prev = `${BASE}posts/p1/content/a.png ${BASE}posts/p1/content/b.png ${BASE}posts/p2/content/c.png`;
    const next = `${BASE}posts/p1/content/a.png`;
    const removed = [...contentKeys(prev, `posts/p1/content/`, BASE)].filter((k) => !contentKeys(next, `posts/p1/content/`, BASE).has(k));
    expect(removed).toEqual(['posts/p1/content/b.png']);
  });

  it('소개 이미지: draft/{uuid}/about/ → about/, 원본 삭제. 형식이 다르면 InvalidUploadKeyError', async () => {
    await put(`draft/${D}/about/1-me.png`);
    const mover = new MediaMover(env.MEDIA, BASE);
    expect(await mover.finalizeAbout(`${BASE}draft/${D}/about/1-me.png`)).toBe(`${BASE}about/1-me.png`);
    expect(await exists('about/1-me.png')).toBe(true);
    for (const url of [`${BASE}draft/${D}/thumbnail/x.png`, `${BASE}posts/x/about/a.png`, 'https://evil.test/draft/d/about/a.png', `${BASE}draft/x`]) {
      await expect(mover.finalizeAbout(url), url).rejects.toBeInstanceOf(InvalidUploadKeyError);
    }
  });

  it('deleteUnused: MEDIA_BASE_URL 밖 주소는 키가 없어 지우지 않고, 아무도 안 쓰는 키만 지운다', async () => {
    await clearTables();
    await put('posts/p1/thumbnail/a.png');
    const mover = new MediaMover(env.MEDIA, BASE);
    const urls = [`${BASE}posts/p1/thumbnail/a.png`, 'https://abc.supabase.co/storage/v1/object/public/production/posts/p1/thumbnail/a.png', null];
    await mover.deleteUnused(getDb(), urls.map((u) => keyFromUrl(u, BASE)));
    expect(await exists('posts/p1/thumbnail/a.png')).toBe(false);
  });
});
