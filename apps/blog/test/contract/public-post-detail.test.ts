import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearTables } from '../helpers/db';
import { fetchPage, ids, seedBasic, T0 } from '../helpers/seed';

const views = (id: string) => env.DB.prepare('SELECT view_count, updated_at FROM posts WHERE id = ?').bind(id).first<{ view_count: number; updated_at: number }>();

describe('GET /posts/{slug}', () => {
  beforeEach(async () => {
    await clearTables();
    await seedBasic();
  });

  it('발행 글은 200, 제목·본문·메타·태그·커버를 그린다', async () => {
    const res = await fetchPage('/posts/first-post');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('<title>첫 글 &lt;/script&gt; | Mion Blog</title>');
    expect(html).toContain('<h1>첫 글 &lt;/script&gt;</h1>');
    expect(html).toContain('<h2 class="scroll-mt-16">소개</h2>');
    expect(html).toContain('<span>TS</span>');
    expect(html).toContain('href="/posts?categorySlug=development"');
    expect(html).toContain('href="/posts?tagSlug=ai"');
    expect(html).toContain('<dd class="num">42 views</dd>');
    expect(html).toContain('<time datetime="2026-08-23T15:00:00.000Z">2026.08.24</time>');
    expect(html).toContain('1 min read');
    expect(html).toContain('src="https://media.mion-space.dev/posts/p1/thumbnail/a.webp"');
    expect(html).toContain('<link rel="canonical" href="http://localhost:4321/posts/first-post">');
    expect(html).toContain('<meta property="og:type" content="article">');
    expect(html).toContain('<meta name="description" content="첫 글 요약">');
    expect(html).toContain('Copy Link');
  });

  it('JSON-LD BlogPosting은 < 를 \\u003c로 이스케이프한다', async () => {
    const html = await (await fetchPage('/posts/first-post')).text();
    const json = /<script type="application\/ld\+json">([^<]*)<\/script>/.exec(html)?.[1];
    expect(json).toBeDefined();
    expect(json).toContain('\\u003c/script>');
    const data = JSON.parse(json!);
    expect(data).toMatchObject({ '@type': 'BlogPosting', headline: '첫 글 </script>', datePublished: new Date(T0).toISOString(), articleSection: '개발', keywords: 'AI, Nest.js' });
  });

  it('요약이 없으면 설명은 "{제목}에 대한 Mion의 기술 블로그 포스트입니다."', async () => {
    const html = await (await fetchPage('/posts/second-post')).text();
    expect(html).toContain('<meta name="description" content="NestJS 검색 글에 대한 Mion의 기술 블로그 포스트입니다.">');
  });

  it('조회할 때마다 view_count가 1씩 오르고 updated_at은 그대로', async () => {
    await fetchPage('/posts/first-post');
    await fetchPage('/posts/first-post');
    expect(await views(ids.post1)).toEqual({ view_count: 43, updated_at: T0 + 1000 });
  });

  it('미발행·없는 글은 404, 조회수는 그대로, 404 화면과 noindex', async () => {
    for (const slug of ['draft-post', 'nope']) {
      const res = await fetchPage(`/posts/${slug}`);
      expect(res.status).toBe(404);
      const html = await res.text();
      expect(html).toContain('포스트를 찾을 수 없습니다');
      expect(html).toContain('<meta name="robots" content="noindex">');
      expect(html).toContain('<title>페이지를 찾을 수 없습니다 | Mion&#39;s Blog</title>');
    }
    expect((await views(ids.draft))?.view_count).toBe(0);
  });
});
