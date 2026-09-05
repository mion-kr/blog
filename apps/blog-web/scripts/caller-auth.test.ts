import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';

import { getCallerHeaders, resolveBackendUrl } from '../lib/api/caller-auth';

test('서버 호출 인증과 URL 경계는 미설정 및 운영 개발키 사용을 거부한다', async () => {
  const keys = ['NODE_ENV', 'VERCEL', 'VERCEL_OIDC_TOKEN', 'BLOG_API_LOCAL_SECRET', 'BLOG_API_URL'];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    for (const key of keys) delete process.env[key];
    await assert.rejects(getCallerHeaders(), { code: 'CALLER_AUTH_UNAVAILABLE' });
    assert.throws(() => resolveBackendUrl('/api/posts'), { code: 'API_UNAVAILABLE' });

    Object.assign(process.env, { NODE_ENV: 'test' });
    process.env.BLOG_API_URL = 'http://127.0.0.1:3121';
    process.env.BLOG_API_LOCAL_SECRET = randomBytes(32).toString('hex');
    assert.deepEqual(await getCallerHeaders(), {
      'X-Mion-Local-Caller': process.env.BLOG_API_LOCAL_SECRET,
    });
    assert.equal(resolveBackendUrl('/api/posts?search=test'), 'http://127.0.0.1:3121/api/posts?search=test');
    for (const path of ['https://example.com/api/posts', '//example.com/api/posts', '/api/../../outside', '/api/..\\outside']) {
      assert.throws(() => resolveBackendUrl(path), { code: 'INVALID_API_PATH' });
    }

    Object.assign(process.env, { NODE_ENV: 'production' });
    await assert.rejects(getCallerHeaders(), { code: 'CALLER_AUTH_UNAVAILABLE' });
    assert.throws(() => resolveBackendUrl('/api/posts'), { code: 'API_UNAVAILABLE' });

    Object.assign(process.env, { NODE_ENV: 'development' });
    process.env.VERCEL = '1';
    await assert.rejects(getCallerHeaders(), { code: 'CALLER_AUTH_UNAVAILABLE' });
    assert.throws(() => resolveBackendUrl('/api/posts'), { code: 'API_UNAVAILABLE' });

    Object.assign(process.env, { VERCEL: '' });
    await assert.rejects(getCallerHeaders(), { code: 'CALLER_AUTH_UNAVAILABLE' });

    delete process.env.VERCEL;
    process.env.BLOG_API_LOCAL_SECRET = '   ';
    await assert.rejects(getCallerHeaders(), { code: 'CALLER_AUTH_UNAVAILABLE' });
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
