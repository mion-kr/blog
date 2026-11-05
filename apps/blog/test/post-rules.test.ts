import { describe, expect, it } from 'vitest';
import { nextPublishedAt, shouldRegenerateSlug } from '../src/server/posts/rules';

const now = new Date('2026-11-06T00:00:00Z');
const before = new Date('2026-01-01T00:00:00Z');

describe('publishedAt 갱신 규칙', () => {
  it('미발행 → 발행: now', () => expect(nextPublishedAt({ published: false, publishedAt: null }, true, now)).toEqual(now));
  it('발행 → 미발행: null', () => expect(nextPublishedAt({ published: true, publishedAt: before }, false, now)).toBeNull());
  it('발행 → 발행: 유지', () => expect(nextPublishedAt({ published: true, publishedAt: before }, true, now)).toEqual(before));
  it('미발행 → 미발행: 유지(null)', () => expect(nextPublishedAt({ published: false, publishedAt: null }, false, now)).toBeNull());
});

describe('slug 재생성 규칙(사용자 결정 3)', () => {
  it('저장돼 있던 글이 발행 상태면 제목이 바뀌어도 유지', () => {
    expect(shouldRegenerateSlug({ published: true, title: 'A' }, 'B')).toBe(false);
  });
  it('발행 전 글은 제목이 바뀌면 재생성', () => {
    expect(shouldRegenerateSlug({ published: false, title: 'A' }, 'B')).toBe(true);
  });
  it('제목이 같으면 재생성하지 않음', () => {
    expect(shouldRegenerateSlug({ published: false, title: 'A' }, 'A')).toBe(false);
  });
});
