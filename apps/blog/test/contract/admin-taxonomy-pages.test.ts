import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { adminCookie } from '../helpers/auth';
import { clearTables } from '../helpers/db';
import { fetchPage, seedBasic, T0 } from '../helpers/seed';

const page = async (path: string) => (await (await fetchPage(path, { headers: { cookie: await adminCookie() } })).text()).replaceAll('&quot;', '"');
const names = (html: string) => [...html.matchAll(/"id":\[0,"[^"]+"\],"name":\[0,"([^"]+)"\]/g)].map((m) => m[1]);

describe('관리자 카테고리·태그 화면', () => {
  beforeEach(async () => {
    await clearTables();
    await seedBasic();
  });

  it('/admin/categories: 이름 오름차순 20개씩, 발행 글 수, 이름 검색', async () => {
    const db = env.DB;
    await db.batch(Array.from({ length: 21 }, (_, i) => db.prepare('INSERT INTO categories (id,name,slug,created_at,updated_at) VALUES (?,?,?,?,?)').bind(`c-${i}`, `가나${String(i).padStart(2, '0')}`, `c-${i}`, T0, T0)));
    const html = await page('/admin/categories');
    expect(html).toContain('카테고리 관리');
    expect(names(html)).toHaveLength(20);
    expect(names(html).slice(0, 2)).toEqual(['Skills', '가나00']);
    expect(names(await page('/admin/categories?page=2'))).toEqual(['가나19', '가나20', '개발']);
    expect(html).toContain('"limit":[0,20]');
    expect(names(await page('/admin/categories?search=%EA%B0%9C%EB%B0%9C'))).toEqual(['개발']);
    expect(await page('/admin/categories?search=%EA%B0%9C%EB%B0%9C')).toContain('"postCount":[0,2]');
  });

  it('/admin/tags: 30개씩, 글 수는 초안 포함', async () => {
    const html = await page('/admin/tags');
    expect(html).toContain('태그 관리');
    expect(names(html)).toEqual(['AI', 'Nest.js']);
    expect(html).toContain('"limit":[0,30]');
    expect(html).toMatch(/"name":\[0,"AI"\],"slug":\[0,"ai"\],"createdAt":\[3,"[^"]+"\],"updatedAt":\[3,"[^"]+"\],"postCount":\[0,2\]/);
  });

  it('카테고리·태그 검색: ASCII 대소문자 무시, 50바이트 넘는 한글 검색어도 찾는다', async () => {
    const long = '클라우드플레어로시작하는이유를정리한다';
    await env.DB.batch([
      env.DB.prepare('INSERT INTO categories (id,name,slug,created_at,updated_at) VALUES (?,?,?,?,?)').bind('c-long', `${long} 모음`, 'c-long', T0, T0),
      env.DB.prepare('INSERT INTO tags (id,name,slug,post_count,created_at,updated_at) VALUES (?,?,?,?,?,?)').bind('t-long', `${long} 태그`, 't-long', 0, T0, T0),
    ]);
    expect(names(await page(`/admin/categories?search=${encodeURIComponent(long)}`))).toEqual([`${long} 모음`]);
    expect(names(await page(`/admin/tags?search=${encodeURIComponent(long)}`))).toEqual([`${long} 태그`]);
    expect(names(await page('/admin/categories?search=sKiLlS'))).toEqual(['Skills']);
    expect(names(await page('/admin/tags?search=NEST'))).toEqual(['Nest.js']);
  });

  it('새 카테고리 링크와 수정 모달(slug 쿼리)', async () => {
    expect(await page('/admin/categories')).toContain('href="/admin/categories?modal=create"');
    expect(await page('/admin/categories?modal=edit&slug=skills')).toContain('카테고리 수정');
  });
});
