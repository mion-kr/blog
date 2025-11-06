import type { PostsQuery } from '@repo/shared';
import type { ReadonlyURLSearchParams } from 'next/navigation';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const DEFAULT_SORT = 'publishedAt';
const DEFAULT_ORDER: PostsQuery['order'] = 'desc';

export type PostsSearchParamsInput = {
  page?: string | null;
  limit?: string | null;
  search?: string | null;
  categorySlug?: string | null;
  category?: string | null;
  tagSlug?: string | null;
  tag?: string | null;
  sort?: string | null;
  order?: string | null;
};

export function parsePostsSearchParams(
  params?: PostsSearchParamsInput | null,
): PostsQuery {
  const page = toPositiveInteger(params?.page, DEFAULT_PAGE);
  const limit = toPositiveInteger(params?.limit, DEFAULT_LIMIT);
  const sort = normalizeEmpty(params?.sort) ?? DEFAULT_SORT;
  const order =
    params?.order === 'asc' || params?.order === 'desc'
      ? params.order
      : DEFAULT_ORDER;
  const search = normalizeEmpty(params?.search);
  const categorySlug = firstNonEmpty(params?.categorySlug, params?.category);
  const tagSlug = firstNonEmpty(params?.tagSlug, params?.tag);

  return {
    page,
    limit,
    search,
    categorySlug: normalizeEmpty(categorySlug),
    tagSlug: normalizeEmpty(tagSlug),
    sort,
    order,
    published: true,
  };
}

export function buildPostsQueryKey(query: PostsQuery): string {
  return JSON.stringify({
    page: query.page ?? DEFAULT_PAGE,
    limit: query.limit ?? DEFAULT_LIMIT,
    search: query.search ?? '',
    categorySlug: query.categorySlug ?? '',
    tagSlug: query.tagSlug ?? '',
    sort: query.sort ?? DEFAULT_SORT,
    order: query.order ?? DEFAULT_ORDER,
    published: query.published ?? true,
  });
}

export function extractPostsSearchParams(
  searchParams: URLSearchParams | ReadonlyURLSearchParams,
): PostsSearchParamsInput {
  const result: PostsSearchParamsInput = {};

  searchParams.forEach((value, key) => {
    switch (key) {
      case 'page':
      case 'limit':
      case 'search':
      case 'category':
      case 'categorySlug':
      case 'tag':
      case 'tagSlug':
      case 'sort':
      case 'order':
        (result as Record<string, string>)[key] = value;
        break;
      default:
        break;
    }
  });

  return result;
}

function toPositiveInteger(
  value: string | null | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeEmpty(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function firstNonEmpty(
  ...values: (string | null | undefined)[]
): string | undefined {
  for (const value of values) {
    const normalized = normalizeEmpty(value);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}
