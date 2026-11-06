import { describe, expect, it } from 'vitest';
import { buildRobots } from '../src/lib/seo-files';

describe('buildRobots', () => {
  it('색인 허용(운영): 이관 전 운영 robots.txt와 같다', () => {
    expect(buildRobots('https://mion-space.dev', true)).toBe('User-Agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\n\nHost: https://mion-space.dev\nSitemap: https://mion-space.dev/sitemap.xml\n');
  });
});
