"use client";

import Link from "next/link";
import { Hash } from "lucide-react";

import type { Tag } from "@repo/shared";

interface TagCloudProps {
  tags: Tag[];
  className?: string;
}

// 태그 사용 빈도에 따른 크기 및 색상 분류
const getTagVariant = (postCount: number, maxCount: number) => {
  const ratio = maxCount > 0 ? postCount / maxCount : 0;

  if (ratio >= 0.8) {
    return {
      size: 'text-lg font-semibold',
      color: 'text-[var(--color-primary)] hover:text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary)]',
      popularity: 'high' as const
    };
  } else if (ratio >= 0.5) {
    return {
      size: 'text-base font-medium',
      color: 'text-[var(--color-accent-secondary)] hover:text-[var(--color-primary-foreground)] hover:bg-[var(--color-accent-secondary)]',
      popularity: 'medium' as const
    };
  } else {
    return {
      size: 'text-sm font-normal',
      color: 'text-[var(--color-text-secondary)] hover:text-[var(--color-primary-foreground)] hover:bg-[var(--color-text-secondary)]',
      popularity: 'low' as const
    };
  }
};

export function TagCloud({ tags, className }: TagCloudProps) {
  if (tags.length === 0) {
    return (
      <div className="blog-sidebar-tag-empty">
        <p className="text-[var(--color-text-secondary)] text-sm">
          아직 태그가 없습니다.
        </p>
      </div>
    );
  }

  // 최대 포스트 수 계산 (정규화를 위해)
  const maxPostCount = Math.max(...tags.map(tag => tag.postCount || 0));

  return (
    <div className={`blog-sidebar-tag ${className || ''}`}>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const variant = getTagVariant(tag.postCount || 0, maxPostCount);

          return (
            <Link
              key={tag.id}
              href={`/posts?tag=${tag.slug}`}
              className="blog-sidebar-tag-item"
            >
              <span
                className={`
                  inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-transparent
                  transition-all duration-200 cursor-pointer
                  ${variant.size} ${variant.color}
                  hover:border-[var(--color-border-hover)] hover:shadow-sm
                `}
                title={`${tag.name} (${tag.postCount || 0}개 포스트)`}
              >
                <Hash className="h-3 w-3" />
                {tag.name}
                <span className="ml-1 text-xs opacity-60">
                  {tag.postCount || 0}
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="mt-4 pt-4 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></div>
            <span>인기</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[var(--color-accent-secondary)]"></div>
            <span>보통</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[var(--color-text-secondary)]"></div>
            <span>적음</span>
          </div>
        </div>
      </div>
    </div>
  );
}