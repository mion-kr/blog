import { describe, expect, it } from 'vitest';
import { rewriteDumpUrls, rewriteMediaUrls } from './rewrite-urls';
import type { Dump } from './dump-to-sql';

const FROM = 'https://abc.supabase.co/storage/v1/object/public/production/';
const TO = 'https://media.mion-space.dev/';

describe('rewriteMediaUrls', () => {
  it('운영 버킷 전체 접두사만 새 주소로 바꾼다', () => {
    expect(rewriteMediaUrls(`${FROM}posts/p1/thumbnail/a-ink-cover.webp`, FROM, TO)).toBe(`${TO}posts/p1/thumbnail/a-ink-cover.webp`);
  });

  it('다른 호스트·다른 버킷·Supabase 문서 링크는 그대로 둔다', () => {
    const others = [
      'https://other.supabase.co/storage/v1/object/public/production/posts/x.webp',
      'https://abc.supabase.co/storage/v1/object/public/development/posts/x.webp',
      'https://supabase.com/docs/guides/storage',
    ];
    for (const url of others) expect(rewriteMediaUrls(url, FROM, TO)).toBe(url);
  });

  it('본문 안 여러 곳을 바꾸고, 이미 바뀐 값에 다시 돌려도 그대로다', () => {
    const body = `![a](${FROM}posts/p1/content/1.png) 텍스트 ${FROM}about/me.png`;
    const once = rewriteMediaUrls(body, FROM, TO);
    expect(once).toBe(`![a](${TO}posts/p1/content/1.png) 텍스트 ${TO}about/me.png`);
    expect(rewriteMediaUrls(once, FROM, TO)).toBe(once);
  });

  it('null은 null', () => {
    expect(rewriteMediaUrls(null, FROM, TO)).toBeNull();
  });

  it('접두사는 / 로 끝나야 한다(다른 버킷 이름 일부와 겹치지 않게)', () => {
    expect(() => rewriteMediaUrls('x', FROM.slice(0, -1), TO)).toThrow(/\//);
  });
});

describe('rewriteDumpUrls', () => {
  it('posts.cover_image·content와 settings의 profile_image_url 값만 바꾼다', () => {
    const dump = {
      users: [{ id: 'u1', image: `${FROM}x.png` }],
      categories: [], tags: [], post_tags: [],
      posts: [{ id: 'p1', title: `${FROM}t`, cover_image: `${FROM}c.webp`, content: `${FROM}b.png` }],
      settings: [{ id: 's1', key: 'profile_image_url', value: `${FROM}about/a.png` }, { id: 's2', key: 'site_url', value: `${FROM}keep` }],
    } as unknown as Dump;
    const out = rewriteDumpUrls(dump, FROM, TO);
    expect(out.posts[0]).toMatchObject({ title: `${FROM}t`, cover_image: `${TO}c.webp`, content: `${TO}b.png` });
    expect(out.settings[0]!.value).toBe(`${TO}about/a.png`);
    expect(out.settings[1]!.value).toBe(`${FROM}keep`);
    expect(out.users[0]!.image).toBe(`${FROM}x.png`);
    expect(dump.posts[0]!.cover_image).toBe(`${FROM}c.webp`);
  });
});
