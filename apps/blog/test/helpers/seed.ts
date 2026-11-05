import { env } from 'cloudflare:workers';

// 공개 화면 테스트용 기본 데이터: 발행 2·초안 1, 카테고리 2, 태그 2.
export const T0 = Date.UTC(2026, 7, 23, 15, 0, 0); // KST 2026-08-24 00:00
export const ids = {
  user: '01900000-0000-7000-8000-000000000001',
  catDev: '01900000-0000-7000-8000-0000000000c1',
  catSkills: '01900000-0000-7000-8000-0000000000c2',
  tagAi: '01900000-0000-7000-8000-0000000000a1',
  tagNest: '01900000-0000-7000-8000-0000000000a2',
  post1: '01900000-0000-7000-8000-000000000101',
  post2: '01900000-0000-7000-8000-000000000102',
  draft: '01900000-0000-7000-8000-0000000001d1',
};

export async function seedBasic() {
  const db = env.DB;
  const run = (sql: string, ...args: unknown[]) => db.prepare(sql).bind(...args);
  await db.batch([
    run('INSERT INTO users (id,email,name,image,google_id,role,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)', ids.user, 'admin@example.com', '미온', null, 'g-1', 'ADMIN', T0, T0),
    run('INSERT INTO categories (id,name,slug,description,post_count,created_at,updated_at) VALUES (?,?,?,?,?,?,?)', ids.catDev, '개발', 'development', '개발 이야기', 3, T0, T0),
    run('INSERT INTO categories (id,name,slug,description,post_count,created_at,updated_at) VALUES (?,?,?,?,?,?,?)', ids.catSkills, 'Skills', 'skills', null, 0, T0, T0),
    run('INSERT INTO tags (id,name,slug,post_count,created_at,updated_at) VALUES (?,?,?,?,?,?)', ids.tagAi, 'AI', 'ai', 2, T0, T0),
    run('INSERT INTO tags (id,name,slug,post_count,created_at,updated_at) VALUES (?,?,?,?,?,?)', ids.tagNest, 'Nest.js', 'nestjs', 1, T0, T0),
    run('INSERT INTO posts (id,title,slug,content,excerpt,cover_image,published,view_count,category_id,author_id,created_at,updated_at,published_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      ids.post1, '첫 글 </script>', 'first-post', '# 소개\n\n본문 **굵게**\n\n```ts\nconst a = 1;\n```', '첫 글 요약', 'https://media.mion-space.dev/posts/p1/thumbnail/a.webp', 1, 41, ids.catDev, ids.user, T0, T0 + 1000, T0),
    run('INSERT INTO posts (id,title,slug,content,excerpt,cover_image,published,view_count,category_id,author_id,created_at,updated_at,published_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      ids.post2, 'NestJS 검색 글', 'second-post', 'NestJS 내용', null, null, 1, 5, ids.catDev, ids.user, T0 + 2000, T0 + 2000, T0 + 86_400_000),
    run('INSERT INTO posts (id,title,slug,content,excerpt,cover_image,published,view_count,category_id,author_id,created_at,updated_at,published_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      ids.draft, '초안', 'draft-post', '초안 본문', null, null, 0, 0, ids.catDev, ids.user, T0 + 3000, T0 + 3000, null),
    run('INSERT INTO post_tags (post_id,tag_id,created_at) VALUES (?,?,?)', ids.post1, ids.tagAi, T0),
    run('INSERT INTO post_tags (post_id,tag_id,created_at) VALUES (?,?,?)', ids.post1, ids.tagNest, T0),
    run('INSERT INTO post_tags (post_id,tag_id,created_at) VALUES (?,?,?)', ids.draft, ids.tagAi, T0),
  ]);
}

export const fetchPage = (path: string, init?: RequestInit) =>
  import('cloudflare:workers').then(({ exports }) => exports.default.fetch(`http://localhost:4321${path}`, init));

/** 발행 글 n개를 더 넣는다(published_at = T0 - i일). */
export async function seedManyPublished(n: number) {
  const db = env.DB;
  await db.batch(
    Array.from({ length: n }, (_, i) =>
      db.prepare('INSERT INTO posts (id,title,slug,content,published,view_count,category_id,author_id,created_at,updated_at,published_at) VALUES (?,?,?,?,1,0,?,?,?,?,?)')
        .bind(`extra-${String(i).padStart(3, '0')}`, `추가 글 ${i}`, `extra-${i}`, '본문', ids.catDev, ids.user, T0, T0, T0 - (i + 1) * 86_400_000),
    ),
  );
}
