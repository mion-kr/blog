import { describe, expect, it } from 'vitest';
import { keyFromUrl, publicUrl } from '../src/server/uploads/media';

const BASE = 'https://media.mion-space.dev/';

describe('공개 URL ↔ R2 키', () => {
  it('MEDIA_BASE_URL 접두사의 키를 꺼내고 쿼리·해시는 버린다', () => {
    expect(keyFromUrl(`${BASE}posts/p1/thumbnail/a.webp`, BASE)).toBe('posts/p1/thumbnail/a.webp');
    expect(keyFromUrl(`${BASE}about/a.png?v=1#x`, BASE)).toBe('about/a.png');
  });
  it('다른 호스트·옛 Supabase 주소·빈 값은 null', () => {
    for (const url of ['https://abc.supabase.co/storage/v1/object/public/production/posts/p1/thumbnail/a.webp', 'https://evil.test/posts/x', 'https://media.mion-space.dev.evil.test/x', '', null, undefined]) {
      expect(keyFromUrl(url as string, BASE)).toBeNull();
    }
  });
  it('공개 URL 조립', () => {
    expect(publicUrl('draft/d/content/1-a.png', BASE)).toBe(`${BASE}draft/d/content/1-a.png`);
    expect(publicUrl('a.png', 'https://media.mion-space.dev')).toBe(`${BASE}a.png`);
  });
});
