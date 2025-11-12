import { Suspense } from 'react';
import { Metadata } from 'next';

import { PostsContent } from './posts-content';
import { PostsPageSkeleton } from './loading';
import { WithSidebar } from '@/components/layout/with-sidebar';
import { categoriesApi, postsApi, tagsApi } from '@/lib/api-client';
import { parsePostsSearchParams } from './query-utils';
import type {
  ApiPaginationMeta,
  Category,
  PostResponseDto,
  PostsQuery,
  Tag,
} from '@repo/shared';

export const metadata: Metadata = {
  title: '전체 포스트 | Mion\'s Blog',
  description: '기술 인사이트와 개발 경험을 공유하는 Mion의 블로그 전체 포스트 목록입니다.',
  alternates: {
    canonical: '/posts',
  },
  openGraph: {
    title: '전체 포스트 | Mion\'s Blog',
    description: '기술 인사이트와 개발 경험을 공유하는 Mion의 블로그 전체 포스트 목록입니다.',
    type: 'website',
    url: '/posts',
  },
};

export const revalidate = 60; // 1분마다 재검증

interface PostsPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    categorySlug?: string;
    category?: string;
    tagSlug?: string;
    tag?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }>;
}

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const resolvedSearchParams = await searchParams;
  const initialQuery = parsePostsSearchParams(resolvedSearchParams);

  let initialPosts: PostResponseDto[] = [];
  let initialMeta = normalizePaginationMeta(undefined, initialQuery, 0);
  let initialError: string | null = null;
  let initialSidebarCategories: Category[] | undefined;
  let initialSidebarTags: Tag[] | undefined;
  const [postsResult, categoriesResult, tagsResult] = await Promise.allSettled([
    postsApi.getPosts(initialQuery),
    categoriesApi.getCategories({ limit: 20, sort: 'name', order: 'asc' }),
    tagsApi.getTags({ limit: 30, sort: 'name', order: 'asc' }),
  ]);

  if (postsResult.status === 'fulfilled') {
    const response = postsResult.value;

    if (response.success) {
      initialPosts = response.data ?? [];
      initialMeta = normalizePaginationMeta(
        response.meta,
        initialQuery,
        initialPosts.length,
      );
    } else {
      initialError =
        response.message ?? '포스트를 불러오지 못했습니다. 다시 시도해주세요.';
    }
  } else {
    const error = postsResult.reason;
    initialError =
      error instanceof Error
        ? error.message
        : '포스트를 불러오지 못했습니다. 다시 시도해주세요.';
  }

  if (
    categoriesResult.status === 'fulfilled' &&
    categoriesResult.value.success
  ) {
    initialSidebarCategories = categoriesResult.value.data ?? [];
  }

  if (tagsResult.status === 'fulfilled' && tagsResult.value.success) {
    initialSidebarTags = tagsResult.value.data ?? [];
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* 페이지 헤더 */}
      <section className="bg-gradient-to-b from-[var(--color-hero-gradient-from)] via-[var(--color-hero-gradient-via)] to-[var(--color-background)] py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-[var(--color-text-primary)] md:text-5xl">
              모든 기술 이야기
            </h1>
            <p className="text-lg text-[var(--color-text-secondary)] md:text-xl max-w-2xl mx-auto">
              실무에서 쌓아온 개발 경험과 기술적 깨달음을 정리한 모든 글들이 여기에 있습니다.
              필터와 검색으로 원하는 이야기를 찾아보세요.
            </p>
          </div>
        </div>
      </section>

      {/* 메인 콘텐츠 (사이드바 포함) */}
      <WithSidebar
        sidebarInitialCategories={initialSidebarCategories}
        sidebarInitialTags={initialSidebarTags}
      >
        <Suspense fallback={<PostsPageSkeleton />}>
          <PostsContent
            initialPosts={initialPosts}
            initialMeta={initialMeta}
            initialQuery={initialQuery}
            initialError={initialError}
          />
        </Suspense>
      </WithSidebar>
    </div>
  );
}

function normalizePaginationMeta(
  meta: ApiPaginationMeta | undefined,
  query: PostsQuery,
  fallbackLength: number,
): ApiPaginationMeta {
  const page = meta?.page ?? query.page ?? 1;
  const limit = meta?.limit ?? query.limit ?? 12;
  const total = meta?.total ?? fallbackLength;
  const totalPages =
    meta?.totalPages ?? (limit > 0 ? Math.ceil(total / limit) : 0);

  return {
    page,
    limit,
    total,
    hasNext: meta?.hasNext ?? page < totalPages,
    hasPrev: meta?.hasPrev ?? page > 1,
    totalPages,
  };
}
