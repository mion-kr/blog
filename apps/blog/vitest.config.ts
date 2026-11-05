import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

// 계약 테스트는 `astro build` 산출물(dist/server)을 workerd에서 띄워 호출한다.
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './dist/server/wrangler.json' },
    }),
  ],
  test: {
    include: ['test/**/*.test.ts'],
  },
});
