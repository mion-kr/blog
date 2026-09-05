'use client';

import {
  useTransition,
  useCallback,
  useMemo,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

import { PostsFilter, SortPreset } from './posts-filter';
import { PostsPagination } from './posts-pagination';

import type {
  PostSummary,
  PostsQuery,
  ApiPaginationMeta,
} from '@repo/shared';
import {
  AlertCircle,
  Search,
} from 'lucide-react';
import {
  parsePostsSearchParams,
  extractPostsSearchParams,
} from './query-utils';
import {
  formatReadingTimeMinutes,
} from '@/lib/reading-time';
import { formatKoreanNumericDate } from '@/lib/date-format';

interface PostsContentProps {
  initialPosts: PostSummary[];
  initialMeta: ApiPaginationMeta;
  initialQuery: PostsQuery;
  initialError?: string | null;
}

type PostsURLParams = Partial<PostsQuery> & {
  sortPreset?: SortPreset;
};

/**
 * posts 목록 페이지 콘텐츠(필터/목록/페이지네이션).
 * - 네온 posts 전용 UI는 여기에서 렌더링합니다.
 */
export function PostsContent({
  initialPosts,
  initialMeta,
  initialQuery,
  initialError,
}: PostsContentProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();

  const posts = initialPosts;
  const pagination = mapPagination(initialMeta, initialQuery, initialPosts.length);
  const [loading, startTransition] = useTransition();
  const error = initialError;

  const currentQuery = useMemo(
    () =>
      parsePostsSearchParams(extractPostsSearchParams(urlSearchParams)),
    [urlSearchParams],
  );

  const currentSortPreset = useMemo<SortPreset>(() => {
    // URL에 sortPreset가 있으면 UI 상태를 고정합니다.
    const preset = urlSearchParams.get('sortPreset');
    if (preset === 'latest' || preset === 'viewed' || preset === 'liked') {
      return preset;
    }

    // URL에 preset이 없을 때는 API 쿼리(sort)로부터 유추합니다.
    if (currentQuery.sort === 'viewCount') {
      return 'viewed';
    }
    return 'latest';
  }, [currentQuery.sort, urlSearchParams]);

  // URL 업데이트 함수
  const updateURL = useCallback((newParams: PostsURLParams) => {
    const params = new URLSearchParams(urlSearchParams.toString());

    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      } else {
        params.delete(key);
      }
    });

    // 이전 파라미터 키(`category`, `tag`)가 남아있다면 제거해 일관성 유지
    if (Object.prototype.hasOwnProperty.call(newParams, 'categorySlug')) {
      params.delete('category');
    }
    if (Object.prototype.hasOwnProperty.call(newParams, 'tagSlug')) {
      params.delete('tag');
    }

    // 페이지가 변경되지 않았다면 1페이지로 리셋
    if (!newParams.page) {
      params.set('page', '1');
    }

    startTransition(() => router.push(`/posts?${params.toString()}`, { scroll: false }));
  }, [router, urlSearchParams]);

  // 핸들러 함수들
  const handleSearch = useCallback((search: string) => {
    updateURL({ search, page: 1 });
  }, [updateURL]);

  const handleSortPresetChange = useCallback((preset: SortPreset) => {
    // 'Most Liked'는 준비 중이므로 최신순으로 fallback합니다(주인님 결정).
    if (preset === 'viewed') {
      updateURL({ sort: 'viewCount', order: 'desc', sortPreset: preset, page: 1 });
      return;
    }

    updateURL({ sort: 'publishedAt', order: 'desc', sortPreset: preset, page: 1 });
  }, [updateURL]);

  const getPageHref = useCallback((page: number) => {
    const params = new URLSearchParams(urlSearchParams.toString());
    params.set('page', String(page));
    return `/posts?${params.toString()}`;
  }, [urlSearchParams]);

  const handleClearFilters = useCallback(() => {
    startTransition(() => router.push('/posts'));
  }, [router]);

  // 활성 필터 확인
  const hasActiveFilters = !!(
    currentQuery.search ||
    currentQuery.categorySlug ||
    currentQuery.tagSlug
  );

  if (error) {
    return (
      <div className="filter-bar" role="alert">
        <div className="filter-row" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
            <strong>포스트를 불러올 수 없습니다</strong>
          </div>
          <button
            type="button"
            className="page-btn"
            disabled={loading}
            onClick={() => startTransition(() => router.refresh())}
          >
            Retry
          </button>
        </div>
        <div className="filter-note">{error}</div>
      </div>
    );
  }

  return (
    <>
      <PostsFilter
        currentSearch={currentQuery.search ?? ''}
        currentSortPreset={currentSortPreset}
        onSearch={handleSearch}
        onSortPresetChange={handleSortPresetChange}
      />

      {hasActiveFilters && !loading && (
        <div className="filter-note" style={{ marginBottom: 16 }}>
          필터 적용됨 ·{' '}
          <button
            type="button"
            className="tag-item"
            onClick={handleClearFilters}
          >
            Reset
          </button>
        </div>
      )}

      {loading && posts.length > 0 && (
        <div className="filter-note" role="status" style={{ marginBottom: 16 }}>
          Updating…
        </div>
      )}

      {/* 포스트 목록 */}
      {posts.length > 0 ? (
        <div className={`posts-list ${loading ? 'is-updating' : ''}`} aria-busy={loading}>
          {posts.map((post) => (
            <PostsNeonPostCard
              key={post.id}
              post={post}
              readingTimeMinutes={post.readingTimeMinutes}
            />
          ))}
        </div>
      ) : loading ? (
        <div className="posts-list" aria-busy="true">
          {Array.from({ length: 10 }, (_, i) => (
            <PostsNeonPostSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="filter-bar">
          <div className="filter-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Search className="h-5 w-5" aria-hidden="true" />
              <strong>{hasActiveFilters ? '검색 결과가 없습니다' : '등록된 포스트가 없습니다'}</strong>
            </div>
            {hasActiveFilters && (
              <button type="button" className="page-btn" onClick={handleClearFilters}>
                Reset
              </button>
            )}
          </div>
          <div className="filter-note">
            {hasActiveFilters ? '다른 검색어/정렬을 시도해보세요.' : '새로운 포스트가 등록되면 이곳에 표시됩니다.'}
          </div>
        </div>
      )}

      {/* 페이지네이션 */}
      {posts.length > 0 && (
        <PostsPagination
          currentPage={pagination.page}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
          hasNext={pagination.hasNext}
          hasPrev={pagination.hasPrev}
          getPageHref={getPageHref}
        />
      )}
    </>
  );
}

/**
 * 목록 페이지에서 사용할 페이지네이션 값을 계산합니다.
 */
function mapPagination(
  meta?: ApiPaginationMeta,
  query?: PostsQuery,
  fallbackLength: number = 0,
) {
  const page = meta?.page ?? query?.page ?? 1;
  const limit = meta?.limit ?? query?.limit ?? 12;
  const total = meta?.total ?? fallbackLength;
  const totalPages =
    meta?.totalPages ?? (limit > 0 ? Math.ceil(total / limit) : 0);

  return {
    page,
    limit,
    total,
    hasNext: meta?.hasNext ?? page < totalPages,
    hasPrev: meta?.hasPrev ?? page > 1,
  };
}

/**
 * 조회수를 compact 포맷으로 표시합니다.
 */
function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact' }).format(value);
}

/**
 * 목록 카드 한 개를 렌더링합니다.
 */
function PostsNeonPostCard({
  post,
  readingTimeMinutes,
}: {
  post: PostSummary;
  readingTimeMinutes: number;
}) {
  const displayDate = post.publishedAt ?? post.createdAt;
  const readingTimeLabel = formatReadingTimeMinutes(readingTimeMinutes);
  const postHref = `/posts/${post.slug}`;

  return (
    <article className="post-card-neon">
      <Link
        href={postHref}
        prefetch={false}
        className="absolute inset-0 z-10"
        aria-label={`${post.title} 상세 보기`}
      />
      <div className="neon-side-border" aria-hidden="true" />

      <div className="post-thumbnail">
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover"
            sizes="240px"
          />
        ) : (
          <span className="post-thumbnail-placeholder" aria-hidden="true">
            🖼️
          </span>
        )}
      </div>

      <div className="post-content">
        <div className="post-content-meta">
          <Link
            href={`/posts?categorySlug=${post.category.slug}`}
            className="category-tag relative z-20"
          >
            {post.category.name}
          </Link>
          <time className="post-date" dateTime={new Date(displayDate).toISOString()}>
            {formatKoreanNumericDate(displayDate)}
          </time>
        </div>

        <Link href={postHref} prefetch={false} className="post-title-link relative z-20">
          {post.title}
        </Link>

        {post.excerpt && <p className="post-excerpt">{post.excerpt}</p>}

        <div className="post-card-footer">
          <div className="tag-list" role="group" aria-label="태그">
            {post.tags.slice(0, 3).map((tag) => (
              <Link
                key={tag.id}
                href={`/posts?tagSlug=${tag.slug}`}
                className="tag-item relative z-20"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
          <div className="read-stats" role="group" aria-label="읽기/조회수">
            <span>👁️ {formatCompactNumber(post.viewCount)}</span>
            <span>⏱️ {readingTimeLabel}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * 목록 로딩 중 스켈레톤 카드를 렌더링합니다.
 */
function PostsNeonPostSkeleton() {
  return (
    <article className="post-card-neon" aria-hidden="true">
      <div className="neon-side-border" />
      <div className="post-thumbnail">
        <span className="post-thumbnail-placeholder">…</span>
      </div>
      <div className="post-content">
        <div className="post-content-meta">
          <span className="category-tag">Loading</span>
          <span className="post-date">0000.00.00</span>
        </div>
        <div className="post-title-link" style={{ opacity: 0.6 }}>
          Loading title…
        </div>
        <div className="post-excerpt" style={{ opacity: 0.5 }}>
          Loading excerpt…
        </div>
        <div className="post-card-footer">
          <div className="tag-list">
            <span className="tag-item">#…</span>
            <span className="tag-item">#…</span>
            <span className="tag-item">#…</span>
          </div>
          <div className="read-stats">
            <span>👁️ …</span>
            <span>⏱️ …</span>
          </div>
        </div>
      </div>
    </article>
  );
}
