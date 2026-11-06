// R2 공개 주소(MEDIA_BASE_URL)와 객체 키 변환. 이 접두사가 아닌 URL(옛 Supabase 주소 등)은 키가 없다고 본다.
const withSlash = (base: string) => (base.endsWith('/') ? base : `${base}/`);

export const publicUrl = (key: string, base: string) => `${withSlash(base)}${key}`;

export function keyFromUrl(url: string | null | undefined, base: string): string | null {
  if (!url) return null;
  const clean = url.split('#')[0]!.split('?')[0]!;
  const prefix = withSlash(base);
  return clean.startsWith(prefix) && clean.length > prefix.length ? clean.slice(prefix.length) : null;
}
