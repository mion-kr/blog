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
  vite: {
    plugins: [tailwindcss()],
    // 이관 전 관리자 React 컴포넌트를 그대로 쓰기 위한 별칭(Next 전용 모듈은 shim)
    resolve: {
      alias: {
        '@/': new URL('./src/', import.meta.url).pathname,
        '@repo/shared': new URL('./src/shared/index.ts', import.meta.url).pathname,
        'next/link': new URL('./src/shims/next-link.tsx', import.meta.url).pathname,
        'next/navigation': new URL('./src/shims/next-navigation.tsx', import.meta.url).pathname,
        'next/image': new URL('./src/shims/next-image.tsx', import.meta.url).pathname,
      },
    },
  },
});
