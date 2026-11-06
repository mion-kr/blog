import { describe, expect, it } from 'vitest';

// 맨 `wrangler deploy`는 기본 `astro build` 산출물(.wrangler/deploy/config.json → dist/server/wrangler.json)을 배포한다.
// glob으로 읽어 빌드 전에도 타입 검사가 통과한다(`pnpm test`가 먼저 빌드한다).
const [deployed] = Object.values(import.meta.glob<{ name: string; vars: Record<string, string> }>('../dist/server/wrangler.json', { eager: true, import: 'default' }));

describe('기본 빌드 배포 설정', () => {
  it('설정값 없이 배포해도 운영 값이 나간다', () => {
    expect(deployed, '먼저 astro build').toBeDefined();
    expect(deployed!.name).toBe('mion-blog');
    expect(deployed!.vars).toMatchObject({
      SITE_URL: 'https://mion-space.dev',
      ROBOTS_INDEXABLE: 'true',
      ADMIN_WRITES_FROZEN: 'false',
      MEDIA_BASE_URL: 'https://media.mion-space.dev/',
      SERVE_MEDIA_FROM_BINDING: 'false',
    });
  });
});
