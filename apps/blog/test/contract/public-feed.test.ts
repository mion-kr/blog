import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearTables } from '../helpers/db';
import { fetchPage, seedBasic, T0 } from '../helpers/seed';

describe('GET /feed.xml', () => {
  beforeEach(async () => {
    await clearTables();
    await seedBasic();
  });

  it('RSS 2.0, 헤더, 발행 글만 created_at 내림차순', async () => {
    const res = await fetchPage('/feed.xml');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/rss+xml; charset=utf-8');
    expect(res.headers.get('cache-control')).toBe('public, s-maxage=3600, stale-while-revalidate=86400');
    const xml = await res.text();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8" ?>\n<rss version="2.0">\n  <channel>\n    <title>Mion&apos;s Blog</title>\n    <link>http://localhost:4321</link>')).toBe(true);
    expect([...xml.matchAll(/<link>http:\/\/localhost:4321\/posts\/([^<]+)<\/link>/g)].map((m) => m[1])).toEqual(['second-post', 'first-post']);
  });

  it('항목: guid는 글 주소, 날짜는 publishedAt, 제목·설명 XML 이스케이프', async () => {
    const xml = await (await fetchPage('/feed.xml')).text();
    expect(xml).toContain(`    <item>
      <title>첫 글 &lt;/script&gt;</title>
      <link>http://localhost:4321/posts/first-post</link>
      <guid isPermaLink="true">http://localhost:4321/posts/first-post</guid>
      <pubDate>${new Date(T0).toUTCString()}</pubDate>
      <description>첫 글 요약</description>
    </item>`);
    expect(xml).toContain('<description>NestJS 검색 글에 대한 Mion의 기술 블로그 포스트입니다.</description>');
  });

  it('RSS_ITEMS_LIMIT(기본 50)만큼만', async () => {
    const db = env.DB;
    await db.batch(Array.from({ length: 55 }, (_, i) => db.prepare("INSERT INTO posts (id,title,slug,content,published,category_id,author_id,created_at,updated_at,published_at) VALUES (?,?,?,'c',1,?,?,?,?,?)").bind(`f${i}`, `t${i}`, `f-${i}`, '01900000-0000-7000-8000-0000000000c1', '01900000-0000-7000-8000-000000000001', T0, T0, T0)));
    const xml = await (await fetchPage('/feed.xml')).text();
    expect(xml.match(/<item>/g)).toHaveLength(50);
  });
});
