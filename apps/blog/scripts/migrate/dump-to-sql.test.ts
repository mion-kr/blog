import { describe, expect, it } from 'vitest';
import { DUMP_QUERIES, TABLE_ORDER, toSql, type Dump } from './dump-to-sql';

const dump: Dump = {
  users: [{ id: 'u1', email: 'a@x.dev', name: "O'Neil", image: null, google_id: 'g1', role: 'ADMIN', created_at: 1700000000000, updated_at: 1700000000123 }],
  categories: [{ id: 'c1', name: '개발', slug: 'development', description: null, post_count: 1, created_at: 1, updated_at: 2 }],
  tags: [{ id: 't1', name: 'AI', slug: 'ai', post_count: 1, created_at: 1, updated_at: 2 }],
  posts: [{ id: 'p1', title: '제목', slug: 's', content: "줄1\n줄2 '인용'", excerpt: null, cover_image: 'https://x/a.webp', published: 1, view_count: 7, category_id: 'c1', author_id: 'u1', created_at: 1, updated_at: 2, published_at: 3 }],
  post_tags: [{ post_id: 'p1', tag_id: 't1', created_at: 5 }],
  settings: [],
};

describe('toSql', () => {
  it('부모 테이블부터 행마다 INSERT 한 문장을 만든다', () => {
    const sql = toSql(dump);
    const tables = [...sql.matchAll(/^INSERT INTO (\w+)/gm)].map((m) => m[1]);
    expect(tables).toEqual(['users', 'categories', 'tags', 'posts', 'post_tags']);
    expect(TABLE_ORDER).toEqual(['users', 'categories', 'tags', 'posts', 'post_tags', 'settings']);
  });

  it('BEGIN·COMMIT·트랜잭션 문장을 넣지 않는다', () => {
    expect(toSql(dump)).not.toMatch(/BEGIN|COMMIT|TRANSACTION/i);
  });

  it('boolean은 0/1, 시간은 받은 epoch ms 숫자 그대로, null은 NULL', () => {
    const sql = toSql(dump);
    expect(sql).toContain("'https://x/a.webp', 1, 7, 'c1', 'u1', 1, 2, 3);");
    expect(sql).toContain("'g1', 'ADMIN', 1700000000000, 1700000000123);");
    expect(sql).toContain("'development', NULL, 1, 1, 2);");
  });

  it('작은따옴표를 두 번 써서 이스케이프하고 줄바꿈은 그대로 둔다', () => {
    const sql = toSql(dump);
    expect(sql).toContain("'O''Neil'");
    expect(sql).toContain("'줄1\n줄2 ''인용'''");
  });

  it('boolean이 문자열(t/f)이거나 시간이 숫자가 아니면 거부한다', () => {
    expect(() => toSql({ ...dump, posts: [{ ...dump.posts[0]!, published: 't' as never }] })).toThrow(/published/);
    expect(() => toSql({ ...dump, posts: [{ ...dump.posts[0]!, created_at: '2026-01-01' as never }] })).toThrow(/created_at/);
  });

  it('100KB를 넘는 문장은 거부한다', () => {
    const big = { ...dump, posts: [{ ...dump.posts[0]!, content: 'a'.repeat(100_001) }] };
    expect(() => toSql(big)).toThrow(/100KB/);
  });

  it('같은 입력이면 같은 SQL', () => {
    expect(toSql(dump)).toBe(toSql(structuredClone(dump)));
  });
});

describe('DUMP_QUERIES', () => {
  it('시간은 Postgres에서 UTC epoch ms로, boolean은 ::int로 변환해 꺼낸다(클라이언트 시간대 무관)', () => {
    expect(DUMP_QUERIES.posts).toContain('(extract(epoch from published_at) * 1000)::bigint AS published_at');
    expect(DUMP_QUERIES.posts).toContain('published::int AS published');
    for (const q of Object.values(DUMP_QUERIES)) expect(q).not.toMatch(/\bnow\(\)/);
    expect(Object.keys(DUMP_QUERIES)).toEqual(TABLE_ORDER);
  });
});
