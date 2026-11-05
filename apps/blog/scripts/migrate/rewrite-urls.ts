import type { Dump } from './dump-to-sql';

// 커버·본문·소개 이미지의 Supabase 공개 URL 접두사를 R2 공개 주소로 바꾼다(design.md D4).
export function rewriteMediaUrls<T extends string | null>(value: T, from: string, to: string): T {
  if (!from.endsWith('/') || !to.endsWith('/')) throw new Error('접두사는 / 로 끝나야 한다');
  return (value === null ? null : value.replaceAll(from, to)) as T;
}

export function rewriteDumpUrls(dump: Dump, from: string, to: string): Dump {
  const rewrite = (v: unknown) => (typeof v === 'string' ? rewriteMediaUrls(v, from, to) : v) as string | null;
  return {
    ...dump,
    posts: dump.posts.map((p) => ({ ...p, cover_image: rewrite(p.cover_image), content: rewrite(p.content) })),
    settings: dump.settings.map((s) => (s.key === 'profile_image_url' ? { ...s, value: rewrite(s.value) } : s)),
  };
}
