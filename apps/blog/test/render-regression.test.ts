import { describe, expect, it } from 'vitest';
import { renderPostHtml } from '../src/lib/render/render-post';
import { skeleton } from './helpers/html-skeleton';

// scripts/migrate/render-fixtures.mjs가 이관 전 렌더러로 만든 고정 자료와 구조·텍스트를 비교한다.
const sources = import.meta.glob('./fixtures/posts/*.mdx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const expected = import.meta.glob('./fixtures/posts/*.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('공개 글 21편 본문 회귀', () => {
  it('고정 자료가 21편이다', () => {
    expect(Object.keys(sources)).toHaveLength(21);
  });

  for (const [file, mdx] of Object.entries(sources)) {
    it(file.replace('./fixtures/posts/', ''), async () => {
      const actual = skeleton(await renderPostHtml(mdx));
      const before = skeleton(expected[file.replace(/\.mdx$/, '.html')]!);
      expect(actual.counts).toEqual(before.counts);
      expect(actual.headings).toEqual(before.headings);
      expect(actual.links).toEqual(before.links);
      expect(actual.text).toBe(before.text);
    });
  }
});
