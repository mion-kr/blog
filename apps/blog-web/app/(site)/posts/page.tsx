import { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';

import { PostsContent } from './posts-content';
import { PostsPageSkeleton } from './posts-skeleton';
import { postsApi } from '@/lib/api-client';
import { parsePostsSearchParams } from './query-utils';
import { PostsNeonSidebar } from './posts-neon-sidebar';
import styles from './posts-neon-grid.module.css';
import { cn } from '@/lib/utils';
import type {
  ApiPaginationMeta,
  PostResponseDto,
  PostsQuery,
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
  const [postsResult] = await Promise.allSettled([
    postsApi.getPosts(initialQuery),
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

  return (
    <div className={cn(styles.root, 'neon-grid-posts')}>
      <div className="neon-grid-bg" aria-hidden="true" />

      <header className="header" aria-label="페이지 헤더">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="Mion's Blog 홈">
            <div className="brand-icon" aria-hidden="true">
              M
            </div>
            <span>Mion&apos;s Blog</span>
          </Link>
          <nav className="nav" aria-label="메인 네비게이션">
            <Link href="/" className="nav-link">
              Home
            </Link>
            <Link href="/posts" className="nav-link active" aria-current="page">
              Posts
            </Link>
            <Link href="/about" className="nav-link">
              About
            </Link>
          </nav>
          <div className="header-actions" />
        </div>
      </header>

      <div className="page-hero">
        <div className="page-hero-content">
          <h1>All Technical Stories</h1>
          <p>실무에서 쌓아온 개발 경험과 기술적 깨달음을 정리한 모든 글들을 여기에 있습니다.</p>
        </div>
      </div>

      <main id="main" className="container">
        <div className="main-layout">
          <div className="content-area">
            <Suspense fallback={<PostsPageSkeleton />}>
              <PostsContent
                initialPosts={initialPosts}
                initialMeta={initialMeta}
                initialQuery={initialQuery}
                initialError={initialError}
              />
            </Suspense>
          </div>
          <PostsNeonSidebar />
        </div>
      </main>
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
