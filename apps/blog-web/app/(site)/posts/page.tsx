import { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PostsContent } from './posts-content';
import { postsApi } from '@/lib/api-client';
import { toPostSummaries } from '@/lib/posts/post-summary';
import { buildPostsQueryKey, parsePostsSearchParams } from './query-utils';
import { PostsNeonSidebar } from './posts-neon-sidebar';
import { getPostsSidebarData } from '@/features/site/server/get-posts-sidebar-data';
import styles from './posts-neon-grid.module.css';
import { cn } from '@/lib/utils';
import { NeonHeader } from '@/components/layout/neon-header';
import { NOT_FOUND_METADATA } from '@/lib/notFoundMetadata';
import type {
  ApiPaginationMeta,
  PostSummary,
  PostsQuery,
} from '@repo/shared';

export const revalidate = 60; // 1분마다 재검증

const POSTS_DESCRIPTION = '기술 인사이트와 개발 경험을 공유하는 Mion의 블로그 전체 포스트 목록입니다.';

const getPostsByQueryKey = cache(async (queryKey: string) => {
  const query = JSON.parse(queryKey) as PostsQuery;
  return postsApi.getPosts(query);
});

function getPosts(query: PostsQuery) {
  return getPostsByQueryKey(buildPostsQueryKey(query));
}

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
    sortPreset?: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: Pick<PostsPageProps, 'searchParams'>): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const query = parsePostsSearchParams(resolvedSearchParams);
  const page = query.page ?? 1;
  const hasFilteredVariant = Boolean(
    resolvedSearchParams.limit ||
    resolvedSearchParams.search ||
    resolvedSearchParams.categorySlug ||
    resolvedSearchParams.category ||
    resolvedSearchParams.tagSlug ||
    resolvedSearchParams.tag ||
    resolvedSearchParams.sort ||
    resolvedSearchParams.order ||
    resolvedSearchParams.sortPreset
  );
  const isIndexable = !hasFilteredVariant;
  const canonical = page > 1 ? `/posts?page=${page}` : '/posts';
  const title = page > 1
    ? `전체 포스트 ${page}페이지 | Mion's Blog`
    : "전체 포스트 | Mion's Blog";

  if (page > 1) {
    try {
      const response = await getPosts(query);
      const meta = normalizePaginationMeta(response.meta, query, response.data.length);

      if (page > (meta.totalPages ?? 0)) {
        return NOT_FOUND_METADATA;
      }
    } catch {
      // API 실패는 기존 목록 오류 화면으로 처리하고 404로 바꾸지 않습니다.
    }
  }

  return {
    title,
    description: POSTS_DESCRIPTION,
    alternates: {
      canonical: isIndexable ? canonical : '/posts',
    },
    robots: {
      index: isIndexable,
      follow: true,
      googleBot: {
        index: isIndexable,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      title,
      description: POSTS_DESCRIPTION,
      type: 'website',
      url: isIndexable ? canonical : '/posts',
      images: [
        {
          url: '/og/blog.png',
          width: 1200,
          height: 630,
          alt: 'Mion 기술 블로그 포스트 목록 공유 이미지',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: POSTS_DESCRIPTION,
      images: ['/og/blog.png'],
    },
  };
}

/**
 * Posts 목록 페이지(네온 그리드 테마)입니다.
 */
export default async function PostsPage({ searchParams }: PostsPageProps) {
  const resolvedSearchParams = await searchParams;
  const initialQuery = parsePostsSearchParams(resolvedSearchParams);

  let initialPosts: PostSummary[] = [];
  let initialMeta = normalizePaginationMeta(undefined, initialQuery, 0);
  let initialError: string | null = null;
  const [postsResult, sidebarData] = await Promise.all([
    getPosts(initialQuery).catch((error) => error),
    getPostsSidebarData(),
  ]);

  if (!(postsResult instanceof Error) && postsResult.success) {
    initialPosts = toPostSummaries(postsResult.data ?? []);
    initialMeta = normalizePaginationMeta(
      postsResult.meta,
      initialQuery,
      initialPosts.length,
    );

    const totalPages = initialMeta.totalPages ?? 0;
    const requestedPage = initialQuery.page ?? 1;
    if (requestedPage > 1 && requestedPage > totalPages) {
      notFound();
    }
  } else {
    initialError =
      postsResult instanceof Error
        ? postsResult.message
        : postsResult.message ?? '포스트를 불러오지 못했습니다. 다시 시도해주세요.';
  }

  return (
    <div className={cn(styles.root, 'neon-grid-posts')}>
      <div className="neon-grid-bg" aria-hidden="true" />

      <NeonHeader activePath="/posts" />

      <div className="page-hero">
        <div className="page-hero-content">
          <h1>All Technical Stories</h1>
          <p>실무에서 쌓아온 개발 경험과 기술적 깨달음을 정리한 모든 글들을 여기에 있습니다.</p>
        </div>
      </div>

      <main id="main" className="container">
        <div className="main-layout">
          <div className="content-area">
            <PostsContent
              initialPosts={initialPosts}
              initialMeta={initialMeta}
              initialQuery={initialQuery}
              initialError={initialError}
            />
          </div>
          <PostsNeonSidebar
            initialCategories={sidebarData.categories}
            initialTags={sidebarData.tags}
          />
        </div>
      </main>
    </div>
  );
}

/**
 * 페이지네이션 메타를 기본값과 함께 정규화합니다.
 */
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
