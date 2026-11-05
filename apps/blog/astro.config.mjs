// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({ imageService: 'passthrough' }),
  integrations: [react()],
  // 세션은 jose 쿠키로 직접 처리한다(design.md D1). KV 자동 생성을 막는다.
  session: false,
  // 출처 검사는 middleware가 관리자 쓰기·로그아웃 전체에 content-type과 무관하게 한다(design.md D1 ⑥).
  security: { checkOrigin: false },
  vite: { plugins: [tailwindcss()] },
});
