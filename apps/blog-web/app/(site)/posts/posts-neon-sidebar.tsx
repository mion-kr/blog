'use client';

import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import type { Category, Tag } from '@repo/shared';

/**
 * 네온 posts 화면 전용 사이드바입니다.
 * - 데이터는 route 계층에서 받고, client 상호작용은 현재 필터 하이라이트만 담당합니다.
 */
export function PostsNeonSidebar({
  initialCategories,
  initialTags,
}: {
  initialCategories: Category[];
  initialTags: Tag[];
}) {
  const searchParams = useSearchParams();

  const activeCategorySlug = searchParams.get('categorySlug') ?? searchParams.get('category') ?? '';
  const activeTagSlug = searchParams.get('tagSlug') ?? searchParams.get('tag') ?? '';

  const maxTagCount = useMemo(() => {
    return Math.max(0, ...initialTags.map((tag) => tag.postCount || 0));
  }, [initialTags]);

  /**
   * 현재 검색 파라미터를 유지하면서 category/tag 필터 목적지만 갱신합니다.
   */
  const buildPostsHref = useCallback(
    (updates: { categorySlug?: string | null; tagSlug?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (Object.prototype.hasOwnProperty.call(updates, 'categorySlug')) {
        params.delete('category');

        if (updates.categorySlug) {
          params.set('categorySlug', updates.categorySlug);
        } else {
          params.delete('categorySlug');
        }
      }

      if (Object.prototype.hasOwnProperty.call(updates, 'tagSlug')) {
        params.delete('tag');

        if (updates.tagSlug) {
          params.set('tagSlug', updates.tagSlug);
        } else {
          params.delete('tagSlug');
        }
      }

      params.set('page', '1');

      const query = params.toString();
      return query ? `/posts?${query}` : '/posts';
    },
    [searchParams],
  );

  return (
    <aside className="sidebar" aria-label="사이드바">
      <div className="sidebar-widget">
        <h3 className="widget-title">Categories</h3>
        <div className="category-list">
          {initialCategories.length > 0 ? (
            <>
              {initialCategories.map((category) => (
                <Link
                  key={category.id}
                  href={buildPostsHref({ categorySlug: category.slug })}
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
        <div className="tag-cloud">
          {initialTags.length > 0 ? (
            <>
              {initialTags.map((tag) => {
                const ratio = maxTagCount > 0 ? (tag.postCount || 0) / maxTagCount : 0;
                const weight = ratio >= 0.8 ? 1 : ratio >= 0.5 ? 0.75 : 0.5;

                return (
                  <Link
                    key={tag.id}
                    href={buildPostsHref({
                      tagSlug: tag.slug === activeTagSlug ? null : tag.slug,
                    })}
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
