import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearTables } from './helpers/db';

const db = env.DB;
const now = Date.now();

async function seed() {
  await db.batch([
    db.prepare("INSERT INTO users (id,email,name,google_id,role,created_at,updated_at) VALUES ('u1','a@x.dev','A','g1','ADMIN',?,?)").bind(now, now),
    db.prepare("INSERT INTO categories (id,name,slug,created_at,updated_at) VALUES ('c1','개발','development',?,?)").bind(now, now),
    db.prepare("INSERT INTO tags (id,name,slug,created_at,updated_at) VALUES ('t1','AI','ai',?,?)").bind(now, now),
    db.prepare("INSERT INTO posts (id,title,slug,content,category_id,author_id,created_at,updated_at) VALUES ('p1','제목','slug-1','본문','c1','u1',?,?)").bind(now, now),
    db.prepare("INSERT INTO post_tags (post_id,tag_id,created_at) VALUES ('p1','t1',?)").bind(now),
  ]);
}

describe('D1 스키마', () => {
  beforeEach(clearTables);

  it('기본값: published 0, view_count 0, post_count 0, role USER', async () => {
    await seed();
    await db.prepare("INSERT INTO users (id,email,name,google_id,created_at,updated_at) VALUES ('u2','b@x.dev','B','g2',?,?)").bind(now, now).run();
    const post = await db.prepare("SELECT published, view_count, published_at FROM posts WHERE id='p1'").first();
    expect(post).toEqual({ published: 0, view_count: 0, published_at: null });
    expect(await db.prepare("SELECT post_count FROM categories WHERE id='c1'").first('post_count')).toBe(0);
    expect(await db.prepare("SELECT role FROM users WHERE id='u2'").first('role')).toBe('USER');
  });

  it('UNIQUE: posts.slug, categories.name·slug, tags.name·slug, users.email·google_id, settings.key', async () => {
    await seed();
    const dup = [
      "INSERT INTO posts (id,title,slug,content,category_id,author_id,created_at,updated_at) VALUES ('p2','t','slug-1','c','c1','u1',0,0)",
      "INSERT INTO categories (id,name,slug,created_at,updated_at) VALUES ('c2','개발','other',0,0)",
      "INSERT INTO categories (id,name,slug,created_at,updated_at) VALUES ('c2','다른','development',0,0)",
      "INSERT INTO tags (id,name,slug,created_at,updated_at) VALUES ('t2','AI','other',0,0)",
      "INSERT INTO tags (id,name,slug,created_at,updated_at) VALUES ('t2','B','ai',0,0)",
      "INSERT INTO users (id,email,name,google_id,created_at,updated_at) VALUES ('u3','a@x.dev','A','g9',0,0)",
      "INSERT INTO users (id,email,name,google_id,created_at,updated_at) VALUES ('u3','z@x.dev','A','g1',0,0)",
    ];
    for (const sql of dup) await expect(db.prepare(sql).run(), sql).rejects.toThrow(/UNIQUE/);
    await db.prepare("INSERT INTO settings (id,key,value,updated_at) VALUES ('s1','site_title','a',0)").run();
    await expect(db.prepare("INSERT INTO settings (id,key,value,updated_at) VALUES ('s2','site_title','b',0)").run()).rejects.toThrow(/UNIQUE/);
  });

  it('post_tags는 (post_id, tag_id) 중복을 막는다', async () => {
    await seed();
    await expect(db.prepare("INSERT INTO post_tags (post_id,tag_id,created_at) VALUES ('p1','t1',0)").run()).rejects.toThrow(/UNIQUE|PRIMARY/);
  });

  it('외래 키: 없는 카테고리 글 거부, 글이 있는 카테고리 삭제 거부, 글 삭제 시 post_tags 연쇄 삭제', async () => {
    await seed();
    await expect(db.prepare("INSERT INTO posts (id,title,slug,content,category_id,author_id,created_at,updated_at) VALUES ('p3','t','s3','c','nope','u1',0,0)").run()).rejects.toThrow(/FOREIGN KEY/);
    await expect(db.prepare("DELETE FROM categories WHERE id='c1'").run()).rejects.toThrow(/FOREIGN KEY/);
    await db.prepare("DELETE FROM posts WHERE id='p1'").run();
    expect(await db.prepare('SELECT count(*) AS n FROM post_tags').first('n')).toBe(0);
  });

  it('role은 ADMIN·USER만 허용한다', async () => {
    await expect(db.prepare("INSERT INTO users (id,email,name,google_id,role,created_at,updated_at) VALUES ('u4','c@x.dev','C','g4','ROOT',0,0)").run()).rejects.toThrow(/CHECK/);
  });
});
