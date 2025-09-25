"use client";

import Link from "next/link";
import { FolderOpen } from "lucide-react";

import type { Category } from "@repo/shared";

interface CategoryListProps {
  categories: Category[];
  className?: string;
}

export function CategoryList({ categories, className }: CategoryListProps) {
  if (categories.length === 0) {
    return (
      <div className="blog-sidebar-category-empty">
        <p className="text-[var(--color-text-secondary)] text-sm">
          아직 카테고리가 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className={`blog-sidebar-category ${className || ''}`}>
      <ul className="space-y-1">
        {categories.map((category) => (
          <li key={category.id} className="blog-sidebar-category-item">
            <Link
              href={`/posts?categorySlug=${category.slug}`}
              className="blog-sidebar-category-link"
            >
              <div className="flex items-center gap-2 py-2 px-3 rounded-md transition-colors duration-200 hover:bg-[var(--color-secondary)] group">
                <FolderOpen className="h-4 w-4 text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)] transition-colors duration-200" />

                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors duration-200 truncate">
                    {category.name}
                  </span>
                </div>

                <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-background)] px-2 py-1 rounded-full group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all duration-200">
                  {category.postCount || 0}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
