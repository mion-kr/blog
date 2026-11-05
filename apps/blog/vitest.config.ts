import path from 'node:path';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

// 계약 테스트는 `astro build` 산출물(dist/server)을 workerd에서 띄워 호출한다.
export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: './dist/server/wrangler.json' },
      miniflare: {
        bindings: { TEST_MIGRATIONS: await readD1Migrations(path.join(import.meta.dirname, 'migrations')) },
      },
    })),
  ],
  test: {
    include: ['test/**/*.test.ts', 'scripts/**/*.test.ts'],
    setupFiles: ['./test/apply-migrations.ts'],
    // hangul-romanize(CommonJS)를 테스트에서도 ESM으로 미리 묶는다. 빌드는 Rolldown이 변환한다.
    deps: { optimizer: { ssr: { enabled: true, include: ['hangul-romanize/dist/index.js'] } } },
  },
});
