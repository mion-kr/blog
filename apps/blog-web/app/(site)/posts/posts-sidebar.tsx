'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

import type { Category, Tag } from '@repo/shared';

/**
 * posts 화면 사이드바(카테고리·인기 태그)입니다.
 * - 데이터는 route 계층에서 받고, client 상호작용은 현재 필터 하이라이트만 담당합니다.
 */
export function PostsSidebar({
  initialCategories,
  initialTags,
}: {
  initialCategories: Category[];
  initialTags: Tag[];
}) {
  const searchParams = useSearchParams();

  const activeCategorySlug = searchParams.get('categorySlug') ?? searchParams.get('category') ?? '';
  const activeTagSlug = searchParams.get('tagSlug') ?? searchParams.get('tag') ?? '';

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
    <aside className="list-side" aria-label="사이드바">
      <section className="side-block" aria-labelledby="cat-h">
        <h2 id="cat-h">Categories</h2>
        {initialCategories.length > 0 ? (
          <ul className="cat-list">
            {initialCategories.map((category) => (
              <li key={category.id}>
                <Link
                  href={buildPostsHref({ categorySlug: category.slug })}
                  aria-current={category.slug === activeCategorySlug ? 'true' : undefined}
                >
                  {category.name}
                  <span className="num">{category.postCount || 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="note">카테고리가 없어요.</p>
        )}
      </section>

      <section className="side-block" aria-labelledby="tag-h">
        <h2 id="tag-h">Popular Tags</h2>
        {initialTags.length > 0 ? (
          <div className="chips">
            {initialTags.map((tag) => (
              <Link
                key={tag.id}
                className="chip"
                href={buildPostsHref({
                  tagSlug: tag.slug === activeTagSlug ? null : tag.slug,
                })}
                aria-current={tag.slug === activeTagSlug ? 'true' : undefined}
              >
                {tag.name}
              </Link>
            ))}
          </div>
        ) : (
          <p className="note">태그가 없어요.</p>
        )}
      </section>
    </aside>
  );
}
