// 이관 전 app/(site)/posts/query-utils.ts + blog-api PostQueryDto 검증(허용 밖 sort, limit > 100이면 목록 오류).
export const POST_SORTS = ['createdAt', 'updatedAt', 'publishedAt', 'title', 'viewCount'] as const;
export type PostSort = (typeof POST_SORTS)[number];

export type PostsQuery = {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
  search: string | undefined;
  categorySlug: string | undefined;
  tagSlug: string | undefined;
  invalid: boolean;
};

const positive = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const clean = (value: string | null) => value?.trim() || undefined;

export function parsePostsQuery(params: URLSearchParams): PostsQuery {
  const page = positive(params.get('page'), 1);
  const limit = positive(params.get('limit'), 12);
  const sort = clean(params.get('sort')) ?? 'publishedAt';
  const order = params.get('order') === 'asc' ? 'asc' : 'desc';
  return {
    page,
    limit,
    sort,
    order,
    search: clean(params.get('search')),
    categorySlug: clean(params.get('categorySlug')) ?? clean(params.get('category')),
    tagSlug: clean(params.get('tagSlug')) ?? clean(params.get('tag')),
    invalid: !(POST_SORTS as readonly string[]).includes(sort) || limit > 100,
  };
}
