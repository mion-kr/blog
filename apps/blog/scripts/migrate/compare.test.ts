import { describe, expect, it } from 'vitest';
import { diffDumps } from './compare-core';
import type { Dump } from './dump-to-sql';

const base = (): Dump => ({
  users: [{ id: 'u1', email: 'a', created_at: 1 }],
  categories: [{ id: 'c1', post_count: 1 }],
  tags: [],
  posts: [{ id: 'p1', published: 1, published_at: 3, content: 'x' }],
  post_tags: [{ post_id: 'p1', tag_id: 't1', created_at: 5 }, { post_id: 'p1', tag_id: 't2', created_at: 6 }],
  settings: [],
});

describe('diffDumps', () => {
  it('같으면 차이 없음(행 순서 무관)', () => {
    const a = base();
    const b = base();
    b.post_tags.reverse();
    expect(diffDumps(a, b)).toEqual([]);
  });

  it('개수·없는 행·컬럼 값 차이를 모두 보고한다', () => {
    const b = base();
    b.users = [];
    b.posts[0]!.published_at = 4;
    b.post_tags.pop();
    const diffs = diffDumps(base(), b);
    expect(diffs).toContain('users: 개수 1 → 0');
    expect(diffs).toContain('users u1: 없음');
    expect(diffs).toContain('posts p1.published_at: 3 → 4');
    expect(diffs).toContain('post_tags p1|t2: 없음');
  });

  it('D1에만 있는 행도 보고한다', () => {
    const b = base();
    b.categories.push({ id: 'c9', post_count: 0 });
    expect(diffDumps(base(), b)).toContain('categories c9: 이관 전에 없음');
  });
});
