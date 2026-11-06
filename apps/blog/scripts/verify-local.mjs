// 실제 데이터 확인: 운영 덤프를 적재한 로컬 D1로 띄운 서버(astro dev/preview)에 요청해 이관 전 응답과 비교한다.
// 사용: node scripts/verify-local.mjs [base=http://localhost:4321] [이관 전 feed.xml] [이관 전 sitemap.xml]
// 이관 전 파일은 운영에서 미리 받아 둔다(curl -s https://mion-space.dev/feed.xml). 운영 글 상세는 조회수가 오르므로 열지 않는다.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const [base = 'http://localhost:4321', oldFeedPath, oldSitemapPath] = process.argv.slice(2);
const toProd = (s) => s.replaceAll(base, 'https://mion-space.dev');
const get = async (path, init) => fetch(`${base}${path}`, { redirect: 'manual', ...init });

const sitemap = await (await get('/sitemap.xml')).text();
const postPaths = [...sitemap.matchAll(/<loc>[^<]*?(\/posts\/[^<]+)<\/loc>/g)].map((m) => m[1]);
assert.ok(postPaths.length > 0, '글이 없다');
for (const path of postPaths) assert.equal((await get(path)).status, 200, path);
console.log(`공개 글 ${postPaths.length}편 200`);

if (oldFeedPath) {
  assert.equal(toProd(await (await get('/feed.xml')).text()), readFileSync(oldFeedPath, 'utf8'), 'RSS가 이관 전과 다르다');
  console.log('RSS 이관 전과 같음');
}
if (oldSitemapPath) {
  assert.equal(toProd(sitemap), readFileSync(oldSitemapPath, 'utf8'), 'sitemap이 이관 전과 다르다');
  console.log('sitemap 이관 전과 같음');
}
for (const path of ['/admin', '/admin/posts', '/admin/posts/new', '/admin/categories', '/admin/tags', '/admin/settings']) {
  assert.equal((await get(path)).status, 307, path);
}
assert.equal((await get('/api/admin/posts', { method: 'POST', headers: { origin: base } })).status, 401);
assert.equal((await get('/posts?limit=101').then((r) => r.text())).includes('포스트를 불러올 수 없습니다'), true);
console.log('관리자 보호·목록 오류 문구 확인');
