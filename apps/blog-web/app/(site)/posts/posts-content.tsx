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
 * - Editorial 목록·상태 UI는 여기에서 렌더링합니다.
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
      <div className="state state--error" role="alert">
        <h3>포스트를 불러올 수 없습니다</h3>
        <p>{error}</p>
        <button
          type="button"
          className="btn btn--primary"
          disabled={loading}
          onClick={() => startTransition(() => router.refresh())}
        >
          Retry
        </button>
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

      {(hasActiveFilters || (loading && posts.length > 0)) && (
        <div className="note">
          {hasActiveFilters && !loading && (
            <>
              <span role="status">필터 적용됨</span>
              <button type="button" className="btn" onClick={handleClearFilters}>
                Reset
              </button>
            </>
          )}
          {loading && posts.length > 0 && <span role="status">Updating…</span>}
        </div>
      )}

      {/* 포스트 목록 */}
      {posts.length > 0 ? (
        <ol className="entries" aria-busy={loading}>
          {posts.map((post) => (
            <PostEntry
              key={post.id}
              post={post}
              readingTimeMinutes={post.readingTimeMinutes}
            />
          ))}
        </ol>
      ) : loading ? (
        <ol className="entries" aria-busy="true">
          {Array.from({ length: 10 }, (_, i) => (
            <PostEntrySkeleton key={i} />
          ))}
        </ol>
      ) : (
        <div className="state">
          <h3>{hasActiveFilters ? '검색 결과가 없습니다' : '등록된 포스트가 없습니다'}</h3>
          <p>
            {hasActiveFilters ? '다른 검색어/정렬을 시도해보세요.' : '새로운 포스트가 등록되면 이곳에 표시됩니다.'}
          </p>
          {hasActiveFilters && (
            <button type="button" className="btn" onClick={handleClearFilters}>
              Reset
            </button>
          )}
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
 * 목록 한 줄을 렌더링합니다. 제목 링크가 줄 전체를 덮습니다.
 */
function PostEntry({
  post,
  readingTimeMinutes,
}: {
  post: PostSummary;
  readingTimeMinutes: number;
}) {
  const displayDate = post.publishedAt ?? post.createdAt;
  const postHref = `/posts/${post.slug}`;

  return (
    <li className="entry">
      <figure className="fig cover" data-slot="entry">
        {post.coverImage ? (
          <Image src={post.coverImage} alt="" fill sizes="(max-width: 640px) 100vw, 240px" />
        ) : null}
      </figure>
      <div className="entry-body">
        <div className="entry-meta">
          <Link href={`/posts?categorySlug=${post.category.slug}`}>{post.category.name}</Link>
          <time className="num" dateTime={new Date(displayDate).toISOString()}>
            {formatKoreanNumericDate(displayDate)}
          </time>
        </div>
        <h2>
          <Link href={postHref} prefetch={false}>
            {post.title}
          </Link>
        </h2>
        {post.excerpt && <p>{post.excerpt}</p>}
        <div className="entry-foot">
          <div className="chips">
            {post.tags.slice(0, 3).map((tag) => (
              <Link key={tag.id} className="chip" href={`/posts?tagSlug=${tag.slug}`}>
                {tag.name}
              </Link>
            ))}
          </div>
          <div className="stats">
            <span className="num">조회 {formatCompactNumber(post.viewCount)}</span>
            <span className="num">{formatReadingTimeMinutes(readingTimeMinutes)}</span>
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * 목록 로딩 중 스켈레톤 줄을 렌더링합니다.
 */
function PostEntrySkeleton() {
  return (
    <li className="entry entry--skeleton" aria-hidden="true">
      <span className="skeleton cover" />
      <div className="entry-body">
        <span className="skeleton line" style={{ width: '30%' }} />
        <span className="skeleton line" style={{ width: '80%', height: 24 }} />
        <span className="skeleton line" style={{ width: '95%' }} />
        <span className="skeleton line" style={{ width: '60%' }} />
      </div>
    </li>
  );
}
