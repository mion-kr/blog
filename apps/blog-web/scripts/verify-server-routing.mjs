import assert from 'node:assert/strict';

// run-local-validation.py가 만든 실제 Nest/PostgreSQL 개발 데이터를 검증합니다.
const base = 'http://localhost:3120';
const results = [];

async function get(path, expected = 200, options = {}) {
  const response = await fetch(`${base}${path}`, { redirect: 'manual', ...options });
  assert.equal(response.status, expected, path);
  const body = await response.text();
  assert.ok(!body.includes('127.0.0.1:3121'), `${path}: backend URL exposure`);
  results.push({ path, status: response.status });
  return body;
}

const home = await get('/');
assert.equal(home.match(/<title>(.*?)<\/title>/)?.[1].replaceAll('&#x27;', "'"), "Mion's Blog");
assert.ok(home.includes('로컬 경로 검증'));
const posts = await get('/posts');
assert.ok(posts.includes('로컬 경로 검증 1'));
assert.ok(posts.includes('rel="canonical"'));
const second = await get('/posts?page=2');
assert.ok(second.includes('로컬 경로 검증 13'));
assert.ok(second.includes('전체 포스트 2페이지'));
const search = await get('/posts?search=' + encodeURIComponent('검증 15'));
assert.ok(search.includes('로컬 경로 검증 15'));
assert.ok(search.includes('noindex'));
await get('/posts?sort=viewCount&order=desc');
await get('/posts?categorySlug=web-validation');
await get('/posts?tagSlug=web-validation');
const detail = await get('/posts/web-validation-1');
assert.ok(detail.includes('로컬 검증 본문 1'));
assert.ok(detail.includes('application/ld+json'));
await get('/about');
await get('/terms');
await get('/privacy-policy');
const sitemap = await get('/sitemap.xml');
assert.equal((sitemap.match(/<loc>[^<]*\/posts\/web-validation-/g) ?? []).length, 15);
const feed = await get('/feed.xml');
assert.equal((feed.match(/<item>/g) ?? []).length, 15);
await get('/robots.txt');

for (const path of ['/api/posts', '/api/categories', '/api/tags', '/api/site/settings']) {
  await get(path, 404);
}
for (const path of ['/api/admin/posts', '/api/admin/categories', '/api/admin/tags', '/api/admin/overview']) {
  await get(path, 401);
}
await get('/api/admin/uploads/pre-signed', 401, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
});
for (const path of ['/admin', '/admin/posts', '/admin/posts/new', '/admin/posts/web-validation-1/edit', '/admin/categories', '/admin/tags', '/admin/settings']) {
  await get(path, 307);
}
const validationError = await get('/posts?limit=101');
assert.ok(validationError.includes('포스트를 불러올 수 없습니다'));

const scripts = new Set([...posts.matchAll(/<script[^>]+src="([^"]+\.js[^\"]*)"/g)].map((match) => match[1]));
for (const script of scripts) {
  const body = await (await fetch(`${base}${script}`)).text();
  for (const marker of ['127.0.0.1:3121', 'NEXT_PUBLIC_API_URL', 'X-Mion-Caller-OIDC', 'X-Mion-Local-Caller']) {
    assert.ok(!body.includes(marker), `browser script exposes ${marker}`);
  }
}
console.log(JSON.stringify({ results, browserScriptsChecked: scripts.size, result: '통과' }, null, 2));
