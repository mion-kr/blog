// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({ imageService: 'passthrough' }),
  integrations: [react()],
  // 세션은 jose 쿠키로 직접 처리한다(design.md D1). KV 자동 생성을 막는다.
  session: false,
});
