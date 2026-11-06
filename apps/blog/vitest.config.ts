import path from 'node:path';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

// 계약 테스트는 `astro build` 산출물(dist/server)을 workerd에서 띄워 호출한다.
const worker = (vars: Record<string, string> = {}) =>
  cloudflareTest(async () => ({
    wrangler: { configPath: './dist/server/wrangler.json' },
    miniflare: {
      bindings: {
        TEST_MIGRATIONS: await readD1Migrations(path.join(import.meta.dirname, 'migrations')),
        // 로컬 값(wrangler.jsonc env.local과 같음). 빌드 산출물의 기본 vars는 운영 값이다.
        SITE_URL: 'http://localhost:4321',
        ROBOTS_INDEXABLE: 'false',
        MEDIA_BASE_URL: 'http://localhost:4321/local-media/',
        SERVE_MEDIA_FROM_BINDING: 'true',
        // 테스트 전용 값(비밀 아님)
        SESSION_SECRET: 'test-session-secret-0123456789abcdef',
        ADMIN_EMAIL: 'admin@example.com',
        GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
        GOOGLE_CLIENT_SECRET: 'test-client-secret',
        ...vars,
      },
    },
  }));

const shared = {
  setupFiles: ['./test/apply-migrations.ts'],
  // hangul-romanize(CommonJS)를 테스트에서도 ESM으로 미리 묶는다. 빌드는 Rolldown이 변환한다.
  deps: { optimizer: { ssr: { enabled: true, include: ['hangul-romanize/dist/index.js'] } } },
};

export default defineConfig({
  test: {
    projects: [
      { plugins: [worker()], test: { ...shared, name: 'main', include: ['test/**/*.test.ts'], exclude: ['test/frozen/**'] } },
      { plugins: [worker({ ADMIN_WRITES_FROZEN: 'true', SERVE_MEDIA_FROM_BINDING: 'false' })], test: { ...shared, name: 'frozen', include: ['test/frozen/**/*.test.ts'] } },
    ],
  },
});
