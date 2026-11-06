import { describe, expect, it } from 'vitest';
import { env } from 'cloudflare:workers';
import { adminCookie } from '../helpers/auth';
import { fetchPage } from '../helpers/seed';

// 화면 이동마다 글자 크기가 바뀌던 문제: 글꼴이 /fonts/(max-age=0)에서 매번 재검증되고, 그동안 대체 글꼴로 그려졌다.
// 빌드된 첫 화면이 실제로 받는 CSS(ASSETS)를 합쳐 본다.
async function servedCss() {
  const html = await (await fetchPage('/')).text();
  const hrefs = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]!);
  const assets = (env as unknown as { ASSETS: Fetcher }).ASSETS;
  return (await Promise.all(hrefs.map(async (h) => (await assets.fetch(`http://localhost${h}`)).text()))).join('\n');
}

describe('글꼴 로딩', () => {
  it('글꼴 파일은 번들(해시 이름, immutable 캐시)로 내보내고 /fonts/ 공개 경로를 쓰지 않는다', async () => {
    const css = await servedCss();
    const faces = css.match(/@font-face\s*\{[^}]*\}/g) ?? [];
    const paperlogy = faces.filter((f) => /font-family:\s*['"]?Paperlogy['"]?;/.test(f));
    expect(paperlogy).toHaveLength(9);
    for (const face of faces.filter((f) => /url\(/.test(f))) {
      expect(face).not.toMatch(/url\(['"]?\/fonts\//);
      expect(face).toMatch(/font-display:\s*swap/);
    }
    for (const face of paperlogy) expect(face).toMatch(/url\(['"]?\/_astro\/Paperlogy-\d\w+\.[\w-]+\.woff2/);
  });

  it('이관 전 next/font처럼 대체 글꼴 크기를 맞춘다(size-adjust)', async () => {
    const css = (await servedCss()).replace(/\s+/g, ' ');
    const fallback = css.match(/@font-face ?\{[^}]*Paperlogy Fallback[^}]*\}/)?.[0] ?? '';
    expect(fallback).toMatch(/src: ?local\(['"]?Arial['"]?\)/);
    expect(fallback).toMatch(/size-adjust: ?114\.16%/);
    expect(fallback).toMatch(/ascent-override: ?85\.65%/);
    expect(fallback).toMatch(/descent-override: ?17\.52%/);
    expect(css).toMatch(/--font-paperlogy: ?['"]?Paperlogy['"]?, ?['"]?Paperlogy Fallback['"]?/);
    expect(css).toMatch(/--font-geist-sans: ?['"]?Geist['"]?, ?['"]?Geist Fallback['"]?/);
  });

  it.each(['/', '/auth/signin', '/admin'])('%s 첫 화면 글꼴(Paperlogy 400·500·800)을 preload한다', async (path) => {
    const res = await fetchPage(path, { headers: path === '/admin' ? { cookie: await adminCookie() } : {} });
    const html = await res.text();
    const links = [...html.matchAll(/<link rel="preload"[^>]*>/g)].map((m) => m[0]);
    for (const name of ['Paperlogy-4Regular', 'Paperlogy-5Medium', 'Paperlogy-8ExtraBold']) {
      const link = links.find((l) => l.includes(name));
      expect(link, name).toBeDefined();
      expect(link).toMatch(/href="\/_astro\/Paperlogy-\d\w+\.[\w-]+\.woff2"/);
      expect(link).toContain('as="font"');
      expect(link).toContain('type="font/woff2"');
      expect(link).toContain('crossorigin');
    }
  });
});
