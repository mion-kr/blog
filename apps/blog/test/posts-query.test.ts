import { describe, expect, it } from 'vitest';
import { parsePostsQuery } from '../src/lib/posts-query';

const q = (s: string) => parsePostsQuery(new URLSearchParams(s));

describe('공개 목록 쿼리(이관 전 query-utils.ts 규칙)', () => {
  it('기본값', () => {
    expect(q('')).toEqual({ page: 1, limit: 12, sort: 'publishedAt', order: 'desc', search: undefined, categorySlug: undefined, tagSlug: undefined, invalid: false });
  });
  it('page·limit이 정수 > 0이 아니면 기본값', () => {
    for (const v of ['0', '-1', 'abc', '']) {
      expect(q(`page=${v}&limit=${v}`)).toMatchObject({ page: 1, limit: 12 });
    }
    expect(q('page=2.7&limit=5x')).toMatchObject({ page: 2, limit: 5 });
  });
  it('order는 asc·desc만, 그 밖엔 desc', () => {
    expect(q('order=asc').order).toBe('asc');
    expect(q('order=up').order).toBe('desc');
  });
  it('category→categorySlug, tag→tagSlug 별칭, 앞의 것이 우선, 공백은 없는 값', () => {
    expect(q('category=dev&tag=ai')).toMatchObject({ categorySlug: 'dev', tagSlug: 'ai' });
    expect(q('categorySlug=a&category=b')).toMatchObject({ categorySlug: 'a' });
    expect(q('categorySlug=%20&category=b')).toMatchObject({ categorySlug: 'b' });
    expect(q('search=%20%20')).toMatchObject({ search: undefined });
    expect(q('search=%20nest%20')).toMatchObject({ search: 'nest' });
  });
  it('허용 밖 sort나 limit > 100이면 invalid(목록 자리에 오류 문구)', () => {
    expect(q('sort=viewCount').invalid).toBe(false);
    expect(q('sort=foo').invalid).toBe(true);
    expect(q('limit=100').invalid).toBe(false);
    expect(q('limit=101').invalid).toBe(true);
  });
});
