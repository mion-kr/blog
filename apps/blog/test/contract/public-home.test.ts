import { beforeEach, describe, expect, it } from 'vitest';
import { clearTables } from '../helpers/db';
import { fetchPage, seedBasic, seedManyPublished } from '../helpers/seed';

const home = async () => (await fetchPage('/')).text();

describe('GET /', () => {
  beforeEach(async () => {
    await clearTables();
    await seedBasic();
  });

  it('메타: 제목·설명·canonical(끝 슬래시 없음)·og, keywords 없음', async () => {
    const html = await home();
    expect(html).toContain('<title>미온 블로그 — AI로 만들고 배우기</title>');
    expect(html).toContain('<link rel="canonical" href="http://localhost:4321">');
    expect(html).toContain('<meta property="og:site_name" content="미온 블로그">');
    expect(html).toContain('<meta property="og:locale" content="ko_KR">');
    expect(html).not.toContain('name="keywords"');
  });

  it('대표 글은 최신 발행 글, 최근 글은 나머지 최대 6편, 초안 제외', async () => {
    await seedManyPublished(8);
    const html = await home();
    const lead = /<article class="lead-story">[\s\S]*?<\/article>/.exec(html)![0];
    expect(lead).toContain('href="/posts/second-post"');
    const latest = /<ol class="latest-list">([\s\S]*?)<\/ol>/.exec(html)![1]!;
    expect([...latest.matchAll(/<h3><a href="\/posts\/([^"]+)"/g)].map((m) => m[1])).toEqual(['first-post', 'extra-0', 'extra-1', 'extra-2', 'extra-3', 'extra-4']);
    expect(html).not.toContain('draft-post');
  });

  it('인기 글: 조회수 순 최대 5편, 순위·조회 표시', async () => {
    const html = await home();
    const table = /<table class="register">[\s\S]*?<\/table>/.exec(html)![0];
    expect([...table.matchAll(/href="\/posts\/([^"]+)"/g)].map((m) => m[1])).toEqual(['first-post', 'second-post']);
    expect(table).toContain('<td class="rank num">01</td>');
    expect(table).toContain('41회');
  });

  it('주제로 찾기: 글 수, 발행 글이 있는 카테고리(이름순), 태그(이름순)', async () => {
    const html = await home();
    expect(html).toContain('지금까지 쓴 글 <span class="num">2</span>편을');
    expect(html).toMatch(/href="\/posts\?categorySlug=development">개발<span class="num">2<\/span>/);
    expect(html).not.toContain('categorySlug=skills');
    expect(html.indexOf('tagSlug=ai"')).toBeLessThan(html.indexOf('tagSlug=nestjs"'));
  });

  it('JSON-LD: WebSite·Organization, 설명에 글·카테고리·태그 수', async () => {
    const html = await home();
    const data = JSON.parse(/<script type="application\/ld\+json">([^<]*)<\/script>/.exec(html)![1]!);
    expect(data[0]).toMatchObject({ '@type': 'WebSite', url: 'http://localhost:4321', name: '미온 블로그' });
    expect(data[1].description).toBe('2개의 포스트와 1개 카테고리, 2개 태그를 운영하는 기술 블로그입니다.');
  });
});
