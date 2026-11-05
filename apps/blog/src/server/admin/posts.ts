import { getSettings } from '../settings/read';
import { listCategories, listPosts, listTags } from '../posts/list';
import type { PostResponseDto } from '@repo/shared';

// 섬에 넘길 글 목록 항목: 화면이 쓰는 필드만(본문 제외)
const summary = (p: Awaited<ReturnType<typeof listPosts>>['items'][number]) =>
  ({ id: p.id, title: p.title, slug: p.slug, excerpt: p.excerpt ?? undefined, coverImage: p.coverImage ?? undefined, published: p.published, viewCount: p.viewCount, categoryId: p.categoryId, createdAt: p.createdAt, updatedAt: p.updatedAt, publishedAt: p.publishedAt ?? undefined, category: p.category, tags: p.tags }) as unknown as PostResponseDto;

const parseBoolean = (v: string | null) => {
  if (v === null) return undefined;
  if (['true', '1', 'yes'].includes(v.toLowerCase())) return true;
  if (['false', '0', 'no'].includes(v.toLowerCase())) return false;
  return undefined;
};

/** 이관 전 get-admin-posts.ts: page·search·published만, limit = postsPerPage, updated_at 내림차순 */
export async function getAdminPosts(params: URLSearchParams) {
  const page = Number(params.get('page') ?? '1') || 1;
  const search = params.get('search')?.trim() ?? '';
  const published = parseBoolean(params.get('published'));
  const postsPerPage = await getSettings().then((s) => (s.postsPerPage > 0 ? s.postsPerPage : 10)).catch(() => 10);
  const query = { page, limit: postsPerPage, order: 'desc' as const, sort: 'updatedAt' as const, search: search || undefined, published };
  const result = await listPosts(query);
  return { posts: result.items.map(summary), total: result.total, postsPerPage, query };
}

/** 글 폼용 카테고리·태그(각 100개, 이관 전과 같음) */
export async function getPostFormOptions() {
  const [categories, tags] = await Promise.all([listCategories({ limit: 100 }), listTags({ limit: 100 })]);
  return { categories: categories.items, tags: tags.items };
}
