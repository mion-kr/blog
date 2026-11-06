import { describe, expect, it } from 'vitest';
import { createUniqueSlug, generateEnglishSlug, generateSlug, slugFromTitle } from '../src/lib/slug';
import cases from './fixtures/slugs.json';

describe('slug 규칙(이관 전 packages/shared와 같은 결과)', () => {
  for (const c of cases) {
    it(`${JSON.stringify(c.input)}`, () => {
      expect(generateSlug(c.input)).toBe(c.slug);
      expect(generateEnglishSlug(c.input)).toBe(c.english);
    });
  }

  it('겹치면 -1, -2를 붙인다', () => {
    expect(createUniqueSlug('a', ['a', 'a-1'])).toBe('a-2');
    expect(createUniqueSlug('a', ['a-1'])).toBe('a');
  });

  it('slugFromTitle: 빈 결과면 영어 매핑, 그래도 비면 post, 그 뒤 중복 처리', () => {
    expect(slugFromTitle('개발 회고', [])).toBe('gaebal-hoego');
    expect(slugFromTitle('!!!', [])).toBe('post');
    expect(slugFromTitle('!!!', ['post', 'post-1'])).toBe('post-2');
  });
});
