'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import type { Category, PaginatedResponse, Tag } from '@repo/shared';

interface SidebarState {
  categories: Category[];
  tags: Tag[];
  isLoading: boolean;
}

const SIDEBAR_CACHE_KEY = 'posts-neon-sidebar-cache:v1';

function readCachedSidebarState(): Pick<SidebarState, 'categories' | 'tags'> | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const cached = window.sessionStorage.getItem(SIDEBAR_CACHE_KEY);
    if (!cached) {
      return null;
    }

    const parsed = JSON.parse(cached) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('categories' in parsed) ||
      !('tags' in parsed)
    ) {
      return null;
    }

    const categories = (parsed as any).categories;
    const tags = (parsed as any).tags;

    if (!Array.isArray(categories) || !Array.isArray(tags)) {
      return null;
    }

    return { categories, tags };
  } catch {
    return null;
  }
}

function writeCachedSidebarState(state: Pick<SidebarState, 'categories' | 'tags'>) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(SIDEBAR_CACHE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage가 막힌 환경에서도 UI는 동작해야 합니다.
  }
}

/**
 * 네온 posts 화면 전용 사이드바(클라이언트 fetch).
 * - 카테고리/태그 클릭 시 `/posts` 쿼리로 필터링합니다.
 */
export function PostsNeonSidebar() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<SidebarState>({
    categories: [],
    tags: [],
    isLoading: true,
  });

  useLayoutEffect(() => {
    // hydration mismatch를 막기 위해, 캐시는 "첫 렌더"가 아니라 mount 이후에만 적용합니다.
    const cached = readCachedSidebarState();
    if (cached) {
      setState({ ...cached, isLoading: false });
    }
  }, []);

  useEffect(() => {
    const fetchSidebarData = async () => {
      try {
        // 사이드바는 기존처럼 클라이언트에서 데이터 fetch + 스켈레톤을 유지합니다.
        setState((prev) => ({
          ...prev,
          // 캐시/기존 데이터가 있으면 스켈레톤 대신 기존 UI를 유지합니다.
          isLoading: prev.categories.length === 0 && prev.tags.length === 0,
        }));

        const [categoriesResponse, tagsResponse] = await Promise.all([
          fetch('/api/categories?limit=50&sort=postCount&order=desc'),
          fetch('/api/tags?limit=30&sort=postCount&order=desc'),
        ]);

        if (!categoriesResponse.ok || !tagsResponse.ok) {
          setState({ categories: [], tags: [], isLoading: false });
          return;
        }

        const [categoriesPayload, tagsPayload] = (await Promise.all([
          categoriesResponse.json(),
          tagsResponse.json(),
        ])) as [PaginatedResponse<Category>, PaginatedResponse<Tag>];

        const next = {
          categories:
            categoriesPayload?.success && Array.isArray(categoriesPayload.data)
              ? categoriesPayload.data
              : [],
          tags:
            tagsPayload?.success && Array.isArray(tagsPayload.data)
              ? tagsPayload.data
              : [],
        };

        writeCachedSidebarState(next);
        setState({ ...next, isLoading: false });
      } catch (error) {
        console.error('Failed to load sidebar data:', error);
        setState({ categories: [], tags: [], isLoading: false });
      }
    };

    fetchSidebarData();
  }, []);

  const activeCategorySlug = searchParams.get('categorySlug') ?? searchParams.get('category') ?? '';
  const activeTagSlug = searchParams.get('tagSlug') ?? searchParams.get('tag') ?? '';

  const maxTagCount = useMemo(() => {
    return Math.max(0, ...state.tags.map((tag) => tag.postCount || 0));
  }, [state.tags]);

  return (
    <aside className="sidebar" aria-label="사이드바">
      <div className="sidebar-widget">
        <h3 className="widget-title">Categories</h3>
        <div className="category-list" aria-busy={state.isLoading}>
          {state.isLoading ? (
            <>
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="category-item"
                  style={{ opacity: 0.75 }}
                >
                  <span>Loading…</span>
                  <span className="category-count">—</span>
                </div>
              ))}
            </>
          ) : state.categories.length > 0 ? (
            <>
              {state.categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/posts?categorySlug=${category.slug}`}
                  className={`category-item ${category.slug === activeCategorySlug ? 'is-active' : ''}`}
                  aria-current={category.slug === activeCategorySlug ? 'true' : undefined}
                >
                  <span>{category.name}</span>
                  <span className="category-count">{category.postCount || 0}</span>
                </Link>
              ))}
            </>
          ) : (
            <div className="filter-note">카테고리가 없어요.</div>
          )}
        </div>
      </div>

      <div className="sidebar-widget">
        <h3 className="widget-title">Popular Tags</h3>
        <div className="tag-cloud" aria-busy={state.isLoading}>
          {state.isLoading ? (
            <>
              {Array.from({ length: 10 }).map((_, index) => (
                <span key={index} className="tag-cloud-item">
                  Loading…
                </span>
              ))}
            </>
          ) : state.tags.length > 0 ? (
            <>
              {state.tags.map((tag) => {
                const ratio = maxTagCount > 0 ? (tag.postCount || 0) / maxTagCount : 0;
                const weight = ratio >= 0.8 ? 1 : ratio >= 0.5 ? 0.75 : 0.5;

                return (
                  <Link
                    key={tag.id}
                    href={`/posts?tagSlug=${tag.slug}`}
                    className={`tag-cloud-item ${tag.slug === activeTagSlug ? 'is-active' : ''}`}
                    aria-current={tag.slug === activeTagSlug ? 'true' : undefined}
                    style={{ opacity: 0.7 + weight * 0.3 }}
                  >
                    {tag.name}
                  </Link>
                );
              })}
            </>
          ) : (
            <div className="filter-note">태그가 없어요.</div>
          )}
        </div>
      </div>
    </aside>
  );
}
