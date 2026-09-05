'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import type { Category, Tag } from '@repo/shared';
import { Folder, Tag as TagIcon, Hash } from 'lucide-react';

interface BlogSidebarProps {
  className?: string;
  initialCategories?: Category[];
  initialTags?: Tag[];
}

export function BlogSidebar({
  className,
  initialCategories: initialCategoriesProp,
  initialTags: initialTagsProp,
}: BlogSidebarProps) {
  const searchParams = useSearchParams();
  const currentCategorySlug = searchParams.get('categorySlug') ?? searchParams.get('category');
  const currentTagSlug = searchParams.get('tagSlug') ?? searchParams.get('tag');

  const categories = initialCategoriesProp ?? [];
  const tags = initialTagsProp ?? [];
  const loading = false;

  // 전체 포스트 수 계산
  const totalPostCount = categories.reduce((sum, category) => sum + category.postCount, 0);

  const buildPostsHref = useCallback((updates: { categorySlug?: string | null; tagSlug?: string | null }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (Object.prototype.hasOwnProperty.call(updates, 'categorySlug')) {
      params.delete('category');
      const nextCategory = updates.categorySlug;
      if (nextCategory) {
        params.set('categorySlug', nextCategory);
      } else {
        params.delete('categorySlug');
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'tagSlug')) {
      params.delete('tag');
      const nextTag = updates.tagSlug;
      if (nextTag) {
        params.set('tagSlug', nextTag);
      } else {
        params.delete('tagSlug');
      }
    }

    params.set('page', '1');

    const query = params.toString();
    return query ? `/posts?${query}` : '/posts';
  }, [searchParams]);

  return (
    <div className={`space-y-6 ${className ?? ''}`}>
      {/* 카테고리 섹션 */}
      <div className="bg-[var(--color-card)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Folder className="h-5 w-5 text-[var(--color-primary)]" />
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            카테고리
          </h3>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-8 bg-[var(--color-secondary)] rounded animate-pulse" />
            ))}
          </div>
        ) : categories.length > 0 ? (
          <div className="space-y-2">
            {/* 전체 카테고리 링크 */}
            <Link
              href={buildPostsHref({ categorySlug: null })}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                !currentCategorySlug
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)]'
              }`}
            >
              <Hash className="h-4 w-4" />
              <span className="flex-1">전체</span>
              <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">
                {totalPostCount}
              </span>
            </Link>

            {/* 카테고리 목록 */}
            {categories.map((category) => (
              <Link
                key={category.id}
                href={buildPostsHref({ categorySlug: category.slug })}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors group ${
                  currentCategorySlug === category.slug
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)]'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full ${
                    category.color ? '' : 'bg-[var(--color-primary)]'
                  }`}
                  style={category.color ? { backgroundColor: category.color } : undefined}
                />
                <span className="flex-1">{category.name}</span>
                <span className={`text-xs rounded-full px-2 py-0.5 ${
                  currentCategorySlug === category.slug
                    ? 'bg-white/20 text-white'
                    : 'bg-[var(--color-secondary)] text-[var(--color-text-secondary)]'
                }`}>
                  {category.postCount}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-secondary)]">
            카테고리가 없습니다.
          </p>
        )}
      </div>

      {/* 태그 섹션 */}
      <div className="bg-[var(--color-card)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <TagIcon className="h-5 w-5 text-[var(--color-primary)]" />
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            인기 태그
          </h3>
        </div>

        {loading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="h-6 bg-[var(--color-secondary)] rounded-full animate-pulse" style={{ width: `${60 + (i * 10) % 40}px` }} />
            ))}
          </div>
        ) : tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={buildPostsHref({ tagSlug: currentTagSlug === tag.slug ? null : tag.slug })}
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  currentTagSlug === tag.slug
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-secondary-foreground)]'
                }`}
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-secondary)]">
            태그가 없습니다.
          </p>
        )}
      </div>

      {/* 검색 안내 */}
      <div className="bg-gradient-to-br from-[var(--color-secondary)] to-[var(--color-secondary)]/80 rounded-lg p-4">
        <p className="text-sm text-[var(--color-text-secondary)] text-center">
          💡 <strong>팁:</strong> 카테고리와 태그를 클릭해서<br />
          관심 있는 포스트를 찾아보세요!
        </p>
      </div>
    </div>
  );
}
