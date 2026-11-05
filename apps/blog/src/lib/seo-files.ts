// 이관 전 app/feed.xml/route.ts, app/sitemap.ts, app/robots.ts와 같은 출력.
const escapeXml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export type FeedPost = { slug: string; title: string; excerpt: string | null; publishedAt: Date | null; createdAt: Date };

export function buildRss(siteUrl: string, posts: FeedPost[]): string {
  const items = posts
    .map((p) => {
      const link = `${siteUrl}/posts/${p.slug}`;
      const description = escapeXml(p.excerpt ?? `${p.title}에 대한 Mion의 기술 블로그 포스트입니다.`);
      return `\n    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${(p.publishedAt ?? p.createdAt).toUTCString()}</pubDate>
      <description>${description}</description>
    </item>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${escapeXml("Mion's Blog")}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml('Mion의 기술 블로그 최신 글')}</description>
    <language>ko-kr</language>
    <ttl>60</ttl>${items}
  </channel>
</rss>`;
}

export type SitemapEntry = { url: string; lastModified?: Date; changeFrequency: string; priority: number };

export function staticSitemapEntries(siteUrl: string): SitemapEntry[] {
  return [
    { url: `${siteUrl}/`, priority: 1.0, changeFrequency: 'daily' },
    { url: `${siteUrl}/posts`, priority: 0.8, changeFrequency: 'daily' },
    { url: `${siteUrl}/about`, priority: 0.5, changeFrequency: 'monthly' },
    { url: `${siteUrl}/terms`, priority: 0.3, changeFrequency: 'monthly' },
    { url: `${siteUrl}/privacy-policy`, priority: 0.3, changeFrequency: 'monthly' },
  ];
}

export function buildSitemap(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => `<url>\n<loc>${escapeXml(e.url)}</loc>\n${e.lastModified ? `<lastmod>${e.lastModified.toISOString()}</lastmod>\n` : ''}<changefreq>${e.changeFrequency}</changefreq>\n<priority>${e.priority}</priority>\n</url>\n`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}</urlset>\n`;
}

export function buildRobots(siteUrl: string, indexable: boolean): string {
  const rules = indexable ? 'User-Agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\n' : 'User-Agent: *\nDisallow: /\n';
  return `${rules}\nHost: ${siteUrl}\nSitemap: ${siteUrl}/sitemap.xml\n`;
}
