import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { adminCookie } from '../helpers/auth';
import { clearTables } from '../helpers/db';
import { fetchPage, ids, seedBasic } from '../helpers/seed';

// 섬 props는 HTML 속성으로 직렬화된다. &quot;를 풀어 확인한다.
const page = async (path: string) => {
  const res = await fetchPage(path, { headers: { cookie: await adminCookie() } });
  return { status: res.status, html: (await res.text()).replaceAll('&quot;', '"').replaceAll('&amp;', '&') };
};
// 글 항목만: "title" 바로 뒤의 "slug"
const slugsIn = (html: string) => [...html.matchAll(/"title":\[0,"[^"]*"\],"slug":\[0,"([^"]+)"\]/g)].map((m) => m[1]);

describe('관리자 글 화면', () => {
  beforeEach(async () => {
    await clearTables();
    await seedBasic();
  });

  it('/admin/posts: 초안 포함, updated_at 내림차순, 한 페이지 postsPerPage(기본 10)', async () => {
    const { status, html } = await page('/admin/posts');
    expect(status).toBe(200);
    expect(html).toContain('포스트 관리');
    expect(slugsIn(html)).toEqual(['draft-post', 'second-post', 'first-post']);
    expect(html).toContain('"postsPerPage":[0,10]');
    expect(html).toContain('"total":[0,3]');
  });

  it('/admin/posts: published·search 필터, 설정의 postsPerPage', async () => {
    expect(slugsIn((await page('/admin/posts?published=false')).html)).toEqual(['draft-post']);
    expect(slugsIn((await page('/admin/posts?published=yes')).html)).toEqual(['second-post', 'first-post']);
    expect(slugsIn((await page('/admin/posts?search=%20NestJS%20')).html)).toEqual(['second-post']);
    await env.DB.prepare("INSERT INTO settings (id,key,value,updated_at) VALUES ('s1','posts_per_page','5',0)").run();
    expect((await page('/admin/posts')).html).toContain('"postsPerPage":[0,5]');
  });

  it('/admin/posts: status·message 쿼리로 배너', async () => {
    const { html } = await page('/admin/posts?status=created');
    expect(html).toContain('새 포스트가 저장되었어요!');
  });

  it('/admin/posts/new: 카테고리·태그 목록과 새 draftUuid', async () => {
    const { status, html } = await page('/admin/posts/new');
    expect(status).toBe(200);
    expect(html).toContain('새 포스트 작성');
    expect(html).toMatch(/"defaultDraftUuid":\[0,"[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-/);
    expect(html).toContain('"name":[0,"Skills"]');
    expect(html).toContain('"name":[0,"Nest.js"]');
  });

  it('/admin/posts/{slug}/edit: 초안도 열리고, 없으면 404, 열어도 조회수는 그대로(사용자 결정 1)', async () => {
    const draft = await page('/admin/posts/draft-post/edit');
    expect(draft.status).toBe(200);
    expect(draft.html).toContain('포스트 수정');
    expect(draft.html).toContain('"title":[0,"초안"]');
    expect(draft.html).toContain(`"postId":[0,"${ids.draft}"]`);
    const before = await env.DB.prepare('SELECT view_count FROM posts WHERE id=?').bind(ids.post1).first('view_count');
    await page('/admin/posts/first-post/edit');
    expect(await env.DB.prepare('SELECT view_count FROM posts WHERE id=?').bind(ids.post1).first('view_count')).toBe(before);
    expect((await page('/admin/posts/nope/edit')).status).toBe(404);
  });

  it('/admin/posts/{slug}/edit: 주소를 한 번 더 디코드하지 않는다(공개 상세와 같은 slug를 연다)', async () => {
    // Astro가 이미 디코드한 params를 다시 풀면 %40이 @로 바뀌어 다른 slug를 찾는다.
    await env.DB.prepare("UPDATE posts SET slug='a%40b' WHERE id=?").bind(ids.post2).run();
    expect((await fetchPage('/posts/a%2540b')).status).toBe(200);
    const res = await page('/admin/posts/a%2540b/edit');
    expect(res.status).toBe(200);
    expect(res.html).toContain(`"postId":[0,"${ids.post2}"]`);
  });
});
