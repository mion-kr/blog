import { describe, expect, it } from 'vitest';
import adsTxt from '../../public/ads.txt?raw';
import { fetchPage } from '../helpers/seed';

describe('정적 페이지', () => {
  for (const [path, title, canonical] of [
    ['/about', "블로그 소개 | Mion&#39;s Blog", '/about'],
    ['/terms', "이용약관 | Mion&#39;s Blog", '/terms'],
    ['/privacy-policy', "개인정보처리방침 | Mion&#39;s Blog", '/privacy-policy'],
  ] as const) {
    it(`${path} 200, 제목·canonical`, async () => {
      const res = await fetchPage(path);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain(`<title>${title}</title>`);
      expect(html).toContain(`<link rel="canonical" href="http://localhost:4321${canonical}">`);
    });
  }

  it('/about "이 사이트는"은 지금 구성만 짧게 말하고 내부 운영 정보를 담지 않는다', async () => {
    const html = await (await fetchPage('/about')).text();
    const section = html.slice(html.indexOf('id="about-site"'), html.indexOf('id="about-contact"'));
    for (const word of ['Astro', 'Cloudflare Workers', 'D1', 'R2']) expect(section).toContain(word);
    for (const word of ['Next.js', 'NestJS', 'Vercel', 'PostgreSQL', 'Supabase', 'pre-signed', 'Doppler', 'Turborepo', 'PNPM']) expect(section).not.toContain(word);
    expect(section).toContain('href="https://github.com/mion-kr/blog"');
    expect(section).toContain('href="https://github.com/mion-kr"');
  });

  it('/about은 소개 OG 이미지', async () => {
    expect(await (await fetchPage('/about')).text()).toContain('<meta property="og:image" content="http://localhost:4321/og/about.png">');
  });

  it('약관·개인정보처리방침은 googlebot 메타 없이 index, follow', async () => {
    const html = await (await fetchPage('/terms')).text();
    expect(html).toContain('<meta name="robots" content="index, follow">');
    expect(html).not.toContain('name="googlebot"');
  });

  it('없는 주소는 404 화면', async () => {
    const res = await fetchPage('/nope/really');
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('<p class="meta">404</p>');
  });
});

describe('정적 파일', () => {
  for (const [path, type] of [
    ['/ads.txt', 'text/plain'],
    ['/og/blog.png', 'image/png'],
    ['/og/about.png', 'image/png'],
    ['/icon.svg', 'image/svg+xml'],
    ['/apple-icon.png', 'image/png'],
    ['/favicon.ico', 'image/'],
  ] as const) {
    it(`${path} 200 ${type}`, async () => {
      const res = await fetchPage(path);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain(type);
    });
  }

  it('/ads.txt 본문이 이관 전과 같다', async () => {
    expect(await (await fetchPage('/ads.txt')).text()).toBe(adsTxt);
  });
});
