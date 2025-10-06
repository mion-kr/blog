'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { postsApi, categoriesApi, tagsApi } from '@/lib/api-client';
import { PostCard, PostCardSkeleton } from '@/components/post-card';
import { PostsFilter } from './posts-filter';
import { PostsPagination } from './posts-pagination';

import type {
  PostResponseDto,
  Category,
  Tag,
  PaginatedResponse,
  PostsQuery
} from '@repo/shared';
import {
  AlertCircle,
  Search,
  Filter,
  Grid3X3,
  List,
  SortAsc,
  SortDesc
} from 'lucide-react';

interface PostsContentProps {
  searchParams: {
    page?: string;
    limit?: string;
    search?: string;
    categorySlug?: string;
    category?: string;
    tagSlug?: string;
    tag?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  };
}

type ViewMode = 'grid' | 'list';

export function PostsContent({ searchParams }: PostsContentProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();

  // State
  const [posts, setPosts] = useState<PostResponseDto[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    hasNext: false,
    hasPrev: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // URL에서 쿼리 파라미터 파싱
  const currentQuery: PostsQuery = {
    page: parseInt(searchParams.page ?? '1', 10),
    limit: parseInt(searchParams.limit ?? '12', 10),
    search: searchParams.search || undefined,
    categorySlug: searchParams.categorySlug || searchParams.category || undefined,
    tagSlug: searchParams.tagSlug || searchParams.tag || undefined,
    sort: searchParams.sort || 'publishedAt',
    order: searchParams.order || 'desc',
    published: true, // 발행된 포스트만 보여줌
  };

  // URL 업데이트 함수
  const updateURL = useCallback((newParams: Partial<PostsQuery>) => {
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
        setPagination({
          page: response.meta?.page ?? 1,
          limit: response.meta?.limit ?? 12,
          total: response.meta?.total ?? 0,
          hasNext: response.meta?.hasNext ?? false,
          hasPrev: response.meta?.hasPrev ?? false
        });
      }
    } catch (err) {
      console.error('Failed to load posts:', err);
      setError('포스트를 불러오는데 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFilters = useCallback(async () => {
    try {
      const [categoriesResponse, tagsResponse] = await Promise.allSettled([
        categoriesApi.getCategories({ limit: 50, sort: 'name', order: 'asc' }),
        tagsApi.getTags({ limit: 100, sort: 'name', order: 'asc' })
      ]);

      if (categoriesResponse.status === 'fulfilled' && categoriesResponse.value.success) {
        setCategories(categoriesResponse.value.data ?? []);
      }

      if (tagsResponse.status === 'fulfilled' && tagsResponse.value.success) {
        setTags(tagsResponse.value.data ?? []);
      }
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  }, []);

  // Effects
  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    loadPosts(currentQuery);
  }, [loadPosts, JSON.stringify(currentQuery)]);

  // 핸들러 함수들
  const handleSearch = useCallback((search: string) => {
    updateURL({ search, page: 1 });
  }, [updateURL]);

  const handleCategoryChange = useCallback((categorySlug: string) => {
    updateURL({ categorySlug: categorySlug || undefined, page: 1 });
  }, [updateURL]);

  const handleTagChange = useCallback((tagSlug: string) => {
    updateURL({ tagSlug: tagSlug || undefined, page: 1 });
  }, [updateURL]);

  const handleSortChange = useCallback((sort: string, order: 'asc' | 'desc') => {
    updateURL({ sort, order, page: 1 });
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-error)]/10">
          <AlertCircle className="h-6 w-6 text-[var(--color-accent-error)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
          포스트를 불러올 수 없습니다
        </h3>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{error}</p>
        <button
          onClick={() => loadPosts(currentQuery)}
          className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-[var(--color-primary)] border border-[var(--color-primary)] rounded-md hover:bg-[var(--color-primary)] hover:text-white transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 필터 및 정렬 섹션 */}
      <div className="space-y-6">
        <PostsFilter
          categories={categories}
          tags={tags}
          currentSearch={currentQuery.search ?? ''}
          currentCategorySlug={currentQuery.categorySlug ?? ''}
          currentTagSlug={currentQuery.tagSlug ?? ''}
          currentSort={currentQuery.sort ?? 'publishedAt'}
          currentOrder={currentQuery.order ?? 'desc'}
          onSearch={handleSearch}
          onCategoryChange={handleCategoryChange}
          onTagChange={handleTagChange}
          onSortChange={handleSortChange}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* 결과 상태 및 뷰 모드 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              {loading ? '로딩 중...' : (
                <>
                  총 <span className="font-semibold text-[var(--color-text-primary)]">{pagination.total.toLocaleString()}</span>개의 포스트
                  {hasActiveFilters && (
                    <span className="ml-2 text-xs bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] px-2 py-1 rounded">
                      필터 적용됨
                    </span>
                  )}
                </>
              )}
            </p>
          </div>

          {/* 뷰 모드 토글 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)]'
              }`}
              title="그리드 뷰"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)]'
              }`}
              title="리스트 뷰"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 포스트 그리드/리스트 */}
      {loading ? (
        <div className={`${viewMode === 'grid' ? 'blog-posts-grid' : 'space-y-2'}`}>
          {Array.from({ length: 12 }, (_, i) => (
            <PostCardSkeleton key={i} viewMode={viewMode} />
          ))}
        </div>
      ) : posts.length > 0 ? (
        <div className={`${viewMode === 'grid' ? 'blog-posts-grid' : 'space-y-2'}`}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              viewMode={viewMode}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-secondary)]">
            <Search className="h-6 w-6 text-[var(--color-text-secondary)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {hasActiveFilters ? '검색 결과가 없습니다' : '등록된 포스트가 없습니다'}
          </h3>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {hasActiveFilters
              ? '다른 검색어나 필터를 시도해보세요.'
              : '새로운 포스트가 등록되면 이곳에 표시됩니다.'
            }
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-[var(--color-primary)] border border-[var(--color-primary)] rounded-md hover:bg-[var(--color-primary)] hover:text-white transition-colors"
            >
              모든 필터 지우기
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
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
