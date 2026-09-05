// 실제 로컬 Next/Nest 및 run-local-validation.py의 임시 DB만 사용합니다.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { encode } from 'next-auth/jwt';
import { uuidv7 } from 'uuidv7';
import { encodeReply } from 'next/dist/compiled/react-server-dom-webpack/client.node.js';

const base = 'http://localhost:3120';
const sql = (query) => execFileSync('docker', ['exec', '-i', 'mion-blog-web-validation',
  'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], { input: query, encoding: 'utf8' }).trim();
assert.equal(sql("SELECT count(*) FROM posts WHERE slug LIKE 'web-validation-%'"), '15');
const config = JSON.parse(execFileSync('doppler', ['secrets', 'download', '--project',
  'mion-blog', '--config', 'local_web', '--no-file', '--format', 'json'], { encoding: 'utf8' }));
const adminId = uuidv7();
const categoryId = uuidv7();
const tagId = uuidv7();
const email = `integrated-${adminId}@example.invalid`;
const title = `Integrated ${adminId}`;
const token = await encode({ secret: config.NEXTAUTH_SECRET, maxAge: 600,
  token: { sub: adminId, googleId: adminId, email, name: '로컬 통합 관리자', role: 'ADMIN' } });
const headers = { cookie: `next-auth.session-token=${token}` };
async function actionId(path, name) {
  const response = await fetch(base + path, { headers, redirect: 'manual' });
  assert.equal(response.status, 200, path);
  const body = await response.text();
  const chunks = [...body.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)]
    .map((match) => JSON.parse(match[1])).join('');
  const line = chunks.split('\n').find((item) => item.includes(`"name":"${name}"`));
  assert.ok(line, name);
  return JSON.parse(line.slice(line.indexOf(':') + 1)).id;
}
async function action(path, name, fields, status) {
  const id = await actionId(path, name);
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  const body = await encodeReply([form]);
  const response = await fetch(base + path, { method: 'POST', redirect: 'manual', body,
    headers: { ...headers, origin: base, 'Next-Action': id, accept: 'text/x-component' } });
  assert.ok([200, 303].includes(response.status), name);
  assert.ok(response.headers.get('x-action-redirect')?.includes(`status=${status}`), name);
  console.log(`${name}: ${response.status} (${status})`);
}
try {
  sql(`INSERT INTO users(id,email,name,google_id,role) VALUES ('${adminId}','${email}','로컬 통합 관리자','${adminId}','ADMIN');
    INSERT INTO categories(id,name,slug) VALUES ('${categoryId}','통합 카테고리','${categoryId}');
    INSERT INTO tags(id,name,slug) VALUES ('${tagId}','통합 태그','${tagId}');`);
  for (const path of ['/api/admin/posts', '/api/admin/categories', '/api/admin/tags', '/api/admin/overview', '/admin/posts/new']) {
    const response = await fetch(base + path, { headers, redirect: 'manual' });
    assert.equal(response.status, 200, path);
    await response.text();
    console.log(`${path}: 200`);
  }
  await action('/admin/posts/new', 'createAdminPostAction', {
    title, content: '# 실제 통합 생성', categoryId, tagIds: tagId,
  }, 'created');
  const slug = sql(`SELECT slug FROM posts WHERE author_id='${adminId}'`);
  assert.ok(slug);
  assert.equal((await fetch(base + `/posts/${slug}`)).status, 404);
  await action(`/admin/posts/${slug}/edit`, 'updateAdminPostAction', {
    slug, title, content: '# 실제 통합 수정', categoryId, tagIds: tagId, published: 'on',
  }, 'updated');
  assert.equal(sql(`SELECT content FROM posts WHERE author_id='${adminId}'`), '# 실제 통합 수정');
  assert.equal((await fetch(base + `/posts/${slug}`)).status, 200);
  await action(`/admin/posts/${slug}/edit`, 'deleteAdminPostAction', { slug }, 'deleted');
  assert.equal(sql(`SELECT count(*) FROM posts WHERE author_id='${adminId}'`), '0');
  const invalidUpload = await fetch(base + '/api/admin/uploads/pre-signed', {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}',
  });
  assert.equal(invalidUpload.status, 400);
  console.log('관리자 이미지 발급 입력 검증: 400 (스토리지 호출 없음)');
  const providers = await (await fetch(base + '/api/auth/providers')).json();
  assert.equal(providers.google.type, 'oauth');
  assert.ok((await (await fetch(base + '/api/auth/csrf')).json()).csrfToken);
  console.log('Google OAuth provider/CSRF 진입점: 200 (Google 로그인 왕복은 미실행)');
} finally {
  sql(`DELETE FROM posts WHERE author_id='${adminId}'; DELETE FROM categories WHERE id='${categoryId}';
    DELETE FROM tags WHERE id='${tagId}'; DELETE FROM users WHERE id='${adminId}';`);
}
