import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearTables } from '../helpers/db';
import { fetchPage, ids, seedBasic, seedManyPublished } from '../helpers/seed';

const page = async (q: string) => {
  const res = await fetchPage(`/posts${q}`);
  return { status: res.status, html: await res.text() };
};
const titles = (html: string) => [...html.matchAll(/<h2><a href="\/posts\/([^"]+)"/g)].map((m) => m[1]);

describe('GET /posts', () => {
  beforeEach(async () => {
    await clearTables();
    await seedBasic();
  });

  it('기본: 발행 글만 publishedAt 내림차순, 색인 허용, canonical /posts', async () => {
    const { status, html } = await page('');
    expect(status).toBe(200);
    expect(titles(html)).toEqual(['second-post', 'first-post']);
    expect(html).toContain("<title>전체 포스트 | Mion&#39;s Blog</title>");
    expect(html).toContain('<meta name="robots" content="index, follow">');
    expect(html).toContain('<link rel="canonical" href="http://localhost:4321/posts">');
    expect(html).toContain('<meta property="og:image" content="http://localhost:4321/og/blog.png">');
  });

  it('목록 줄: 요약 없으면 대체 문구, 조회수, 읽는 시간, 태그 최대 3개', async () => {
    const { html } = await page('');
    expect(html).toContain('<p>NestJS 검색 글 글의 핵심 내용을 빠르게 확인해보세요.</p>');
    expect(html).toContain('조회 41');
    expect(html).toContain('1 min read');
    expect(html).toContain('<a class="chip" href="/posts?tagSlug=ai">AI</a>');
  });

  it('필터가 붙으면 noindex, follow + canonical /posts', async () => {
    const { html } = await page('?categorySlug=development');
    expect(html).toContain('<meta name="robots" content="noindex, follow">');
    expect(html).toContain('<link rel="canonical" href="http://localhost:4321/posts">');
    expect(html).toContain('필터 적용됨');
  });

  it('카테고리·태그 필터와 별칭(category, tag), 없는 slug는 빈 목록', async () => {
    expect(titles((await page('?categorySlug=development')).html)).toEqual(['second-post', 'first-post']);
    expect(titles((await page('?category=development')).html)).toEqual(['second-post', 'first-post']);
    expect(titles((await page('?tagSlug=nestjs')).html)).toEqual(['first-post']);
    expect(titles((await page('?tag=ai')).html)).toEqual(['first-post']);
    const empty = await page('?categorySlug=nope');
    expect(titles(empty.html)).toEqual([]);
    expect(empty.html).toContain('검색 결과가 없습니다');
  });

  it('검색은 제목·본문·요약에서 ASCII 대소문자 무시로 찾는다', async () => {
    expect(titles((await page('?search=nestjs')).html)).toEqual(['second-post']);
    expect(titles((await page('?search=%EA%B5%B5%EA%B2%8C')).html)).toEqual(['first-post']);
    expect(titles((await page('?search=%EC%9A%94%EC%95%BD')).html)).toEqual(['first-post']);
    expect(titles((await page('?search=NESTJS')).html)).toEqual(['second-post']);
    expect(titles((await page('?search=nEsTjS%20%EB%82%B4%EC%9A%A9')).html)).toEqual(['second-post']);
  });

  it('검색어가 50바이트를 넘어도(한글 19자) 행이 있는 상태에서 목록을 찾는다', async () => {
    const long = '클라우드플레어로시작하는이유를정리한다';
    await env.DB.prepare('UPDATE posts SET excerpt=? WHERE id=?').bind(`${long} 요약`, ids.post2).run();
    const { status, html } = await page(`?search=${encodeURIComponent(long)}`);
    expect(status).toBe(200);
    expect(html).not.toContain('포스트를 불러올 수 없습니다');
    expect(titles(html)).toEqual(['second-post']);
  });

  it('조회수 정렬', async () => {
    expect(titles((await page('?sort=viewCount&order=desc')).html)).toEqual(['first-post', 'second-post']);
    expect(titles((await page('?sort=viewCount&order=asc')).html)).toEqual(['second-post', 'first-post']);
  });

  it('허용 밖 sort·limit > 100은 200 + 목록 자리에 오류 문구', async () => {
    for (const q of ['?sort=foo', '?limit=101']) {
      const { status, html } = await page(q);
      expect(status).toBe(200);
      expect(html).toContain('포스트를 불러올 수 없습니다');
    }
  });

  it('2페이지: 색인 허용, canonical /posts?page=2, 범위 밖은 404', async () => {
    await seedManyPublished(12);
    const p2 = await page('?page=2');
    expect(p2.status).toBe(200);
    expect(p2.html).toContain("<title>전체 포스트 2페이지 | Mion&#39;s Blog</title>");
    expect(p2.html).toContain('<link rel="canonical" href="http://localhost:4321/posts?page=2">');
    expect(titles(p2.html)).toHaveLength(2);
    const p9 = await page('?page=9');
    expect(p9.status).toBe(404);
    expect(p9.html).toContain('<meta name="robots" content="noindex">');
  });

  it('사이드바: 발행 글이 있는 카테고리만 실시간 글 수, 태그 목록', async () => {
    const { html } = await page('');
    expect(html).toMatch(/<a href="\/posts\?categorySlug=development&amp;page=1"[^>]*>개발<span class="num">2<\/span><\/a>/);
    expect(html).not.toContain('categorySlug=skills');
    expect(html).toContain('Nest.js</a>');
  });
});
