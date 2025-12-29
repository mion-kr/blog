'use client';

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

import { postsApi } from '@/lib/api-client';
import { PostsFilter, SortPreset } from './posts-filter';
import { PostsPagination } from './posts-pagination';

import type {
  PostResponseDto,
  PostsQuery,
  ApiPaginationMeta,
} from '@repo/shared';
import {
  AlertCircle,
  Search,
} from 'lucide-react';
import {
  parsePostsSearchParams,
  buildPostsQueryKey,
  extractPostsSearchParams,
} from './query-utils';
import {
  calculateReadingTimeMinutesFromMdx,
  formatReadingTimeMinutes,
} from '@/lib/reading-time';

interface PostsContentProps {
  initialPosts: PostResponseDto[];
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

  // State
  const [posts, setPosts] = useState<PostResponseDto[]>(initialPosts);
  const [pagination, setPagination] = useState(() =>
    mapPagination(initialMeta, initialQuery, initialPosts.length),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const searchParamsString = useMemo(
    () => urlSearchParams.toString(),
    [urlSearchParams],
  );
  const currentQuery = useMemo(
    () =>
      parsePostsSearchParams(extractPostsSearchParams(urlSearchParams)),
    [searchParamsString, urlSearchParams],
  );
  const currentQueryKey = useMemo(
    () => buildPostsQueryKey(currentQuery),
    [currentQuery],
  );
  const lastLoadedQueryKeyRef = useRef(buildPostsQueryKey(initialQuery));

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
  }, [currentQuery.sort, searchParamsString, urlSearchParams]);

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

    router.push(`/posts?${params.toString()}`, { scroll: false });
  }, [router, urlSearchParams]);

  // 데이터 로딩 함수들
  const loadPosts = useCallback(async (query: PostsQuery) => {
    try {
      setLoading(true);
      setError(null);

      const response = await postsApi.getPosts(query);

      if (response.success && response.data) {
        setPosts(response.data);
        setPagination(
          mapPagination(response.meta, query, response.data.length),
        );
        lastLoadedQueryKeyRef.current = buildPostsQueryKey(query);
      }
    } catch (err) {
      console.error('Failed to load posts:', err);
      setError('포스트를 불러오는데 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Effects
  useEffect(() => {
    // 동일한 쿼리를 이미 로드했다면 중복 요청을 막습니다.
    // (이전 구현은 초기 쿼리로 돌아갈 때 fetch를 스킵해서 reset이 동작하지 않는 문제가 있었습니다.)
    if (currentQueryKey === lastLoadedQueryKeyRef.current && !initialError) {
      return;
    }

    loadPosts(currentQuery);
  }, [currentQuery, currentQueryKey, initialError, loadPosts]);

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

  const handlePageChange = useCallback((page: number) => {
    updateURL({ page });
  }, [updateURL]);

  const handleClearFilters = useCallback(() => {
    router.push('/posts');
  }, [router]);

  // 활성 필터 확인
  const hasActiveFilters = !!(
    currentQuery.search ||
    currentQuery.categorySlug ||
    currentQuery.tagSlug
  );

  const readingTimeByPostId = useMemo(() => {
    // 목록 렌더링 비용을 줄이기 위해 reading time을 미리 계산합니다.
    return new Map(
      posts.map((post) => {
        const minutes = calculateReadingTimeMinutesFromMdx(post.content);
        return [post.id, minutes] as const;
      }),
    );
  }, [posts]);

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
            onClick={() => loadPosts(currentQuery)}
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
              readingTimeMinutes={readingTimeByPostId.get(post.id) ?? 1}
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
          onPageChange={handlePageChange}
        />
      )}
    </>
  );
}

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

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact' }).format(value);
}

function formatNeonDate(value: Date | string): string {
  const dateObj = typeof value === 'string' ? new Date(value) : value;
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

function PostsNeonPostCard({
  post,
  readingTimeMinutes,
}: {
  post: PostResponseDto;
  readingTimeMinutes: number;
}) {
  const displayDate = post.publishedAt ?? post.createdAt;
  const readingTimeLabel = formatReadingTimeMinutes(readingTimeMinutes);

  return (
    <article className="post-card-neon">
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
          <span className="category-tag">{post.category.name}</span>
          <time className="post-date" dateTime={new Date(displayDate).toISOString()}>
            {formatNeonDate(displayDate)}
          </time>
        </div>

        <Link href={`/posts/${post.slug}`} className="post-title-link">
          {post.title}
        </Link>

        {post.excerpt && <p className="post-excerpt">{post.excerpt}</p>}

        <div className="post-card-footer">
          <div className="tag-list" aria-label="태그">
            {post.tags.slice(0, 3).map((tag) => (
              <Link key={tag.id} href={`/posts?tagSlug=${tag.slug}`} className="tag-item">
                #{tag.name}
              </Link>
            ))}
          </div>
          <div className="read-stats" aria-label="읽기/조회수">
            <span>👁️ {formatCompactNumber(post.viewCount)}</span>
            <span>⏱️ {readingTimeLabel}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

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
