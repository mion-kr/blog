import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearTables } from '../helpers/db';
import { fetchPage, seedBasic, T0 } from '../helpers/seed';

describe('GET /sitemap.xml', () => {
  beforeEach(async () => {
    await clearTables();
    await seedBasic();
  });

  it('이관 전 형식: 고정 경로 5개 + 발행 글(updatedAt), 초안 제외', async () => {
    const res = await fetchPage('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/xml');
    const xml = await res.text();
    expect(xml.startsWith(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>http://localhost:4321/</loc>
<changefreq>daily</changefreq>
<priority>1</priority>
</url>
<url>
<loc>http://localhost:4321/posts</loc>
<changefreq>daily</changefreq>
<priority>0.8</priority>
</url>
<url>
<loc>http://localhost:4321/about</loc>
<changefreq>monthly</changefreq>
<priority>0.5</priority>
</url>
<url>
<loc>http://localhost:4321/terms</loc>
<changefreq>monthly</changefreq>
<priority>0.3</priority>
</url>
<url>
<loc>http://localhost:4321/privacy-policy</loc>
<changefreq>monthly</changefreq>
<priority>0.3</priority>
</url>
`)).toBe(true);
    expect(xml).toContain(`<url>
<loc>http://localhost:4321/posts/first-post</loc>
<lastmod>${new Date(T0 + 1000).toISOString()}</lastmod>
<changefreq>weekly</changefreq>
<priority>0.7</priority>
</url>`);
    expect(xml).not.toContain('draft-post');
    expect(xml.endsWith('</urlset>\n')).toBe(true);
  });

  it('50개가 넘는 글도 모두 넣는다', async () => {
    const db = env.DB;
    await db.batch(Array.from({ length: 60 }, (_, i) => db.prepare("INSERT INTO posts (id,title,slug,content,published,category_id,author_id,created_at,updated_at,published_at) VALUES (?,?,?,'c',1,?,?,?,?,?)").bind(`s${i}`, `t${i}`, `s-${i}`, '01900000-0000-7000-8000-0000000000c1', '01900000-0000-7000-8000-000000000001', T0, T0, T0)));
    const xml = await (await fetchPage('/sitemap.xml')).text();
    expect(xml.match(/<url>/g)).toHaveLength(5 + 62);
  });
});
