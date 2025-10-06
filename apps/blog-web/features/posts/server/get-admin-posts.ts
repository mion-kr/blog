import type { PostsQuery, PostResponseDto } from '@repo/shared';

import { apiClient, isSuccessResponse } from '@/lib/api-client';

interface PostsSearchParams {
  page?: string;
  search?: string;
  published?: string;
}

interface GetAdminPostsParams {
  searchParams?: PostsSearchParams;
  token: string | null;
}

export interface AdminPostsResult {
  posts: PostResponseDto[];
  total: number;
  postsPerPage: number;
  query: PostsQuery;
  statusParam?: string;
  messageParam?: string;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (['true', '1', 'yes'].includes(value.toLowerCase())) return true;
  if (['false', '0', 'no'].includes(value.toLowerCase())) return false;
  return undefined;
}

export async function getAdminPosts({
  searchParams,
  token,
}: GetAdminPostsParams): Promise<AdminPostsResult | null> {
  const resolved = searchParams ?? {};

  const pageParam = resolved.page;
  const searchParam = resolved.search;
  const publishedParam = resolved.published;

  const page = Number(pageParam ?? '1') || 1;
  const search = searchParam?.trim() ?? '';
  const published = parseBoolean(publishedParam);

  let postsPerPage = 10;

  if (token) {
    try {
      const settingsRes = await apiClient.settings.getSettings({ token });
      if (
        settingsRes.success &&
        settingsRes.data?.postsPerPage &&
        settingsRes.data.postsPerPage > 0
      ) {
        postsPerPage = settingsRes.data.postsPerPage;
      }
    } catch {
      // 설정 조회 실패는 기본값 유지
    }
  }

  const query: PostsQuery = {
    page,
    limit: postsPerPage,
    order: 'desc',
    sort: 'updatedAt',
    search: search || undefined,
    published,
  };

  const response = token
    ? await apiClient.posts.getPosts(query, { token })
    : await apiClient.posts.getPosts(query);

  if (!response || !isSuccessResponse(response)) {
    return null;
  }

  return {
    posts: response.data ?? [],
    total: response.meta?.total ?? response.data?.length ?? 0,
    postsPerPage,
    query,
    statusParam: (resolved as Record<string, string>).status,
    messageParam: (resolved as Record<string, string>).message,
  };
}
