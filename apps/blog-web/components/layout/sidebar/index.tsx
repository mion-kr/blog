"use client";

import { useState, useEffect } from "react";
import { CategoryList } from "./category-list";
import { TagCloud } from "./tag-cloud";

import type { Category, PaginatedResponse, Tag } from "@repo/shared";

interface BlogSidebarProps {
  className?: string;
}

export function BlogSidebar({ className }: BlogSidebarProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 카테고리와 태그 데이터 로딩
  useEffect(() => {
    const fetchSidebarData = async () => {
      try {
        setIsLoading(true);

        const [categoriesResponse, tagsResponse] = await Promise.all([
          fetch("/api/categories?limit=50&sort=postCount&order=desc"),
          fetch("/api/tags?limit=30&sort=postCount&order=desc"),
        ]);

        if (categoriesResponse.ok && tagsResponse.ok) {
          const [categoriesPayload, tagsPayload] = (await Promise.all([
            categoriesResponse.json(),
            tagsResponse.json(),
          ])) as [PaginatedResponse<Category>, PaginatedResponse<Tag>];

          if (
            categoriesPayload?.success &&
            Array.isArray(categoriesPayload.data)
          ) {
            setCategories(categoriesPayload.data);
          }

          if (tagsPayload?.success && Array.isArray(tagsPayload.data)) {
            setTags(tagsPayload.data);
          }
        }
      } catch (error) {
        console.error("Failed to load sidebar data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSidebarData();
  }, []);

  if (isLoading) {
    return (
      <aside className={`blog-sidebar ${className || ""}`}>
        <div className="space-y-8">
          <div className="blog-sidebar-section">
            <h2 className="blog-sidebar-title">카테고리</h2>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-6 bg-[var(--color-secondary)] rounded"></div>
                </div>
              ))}
            </div>
          </div>

          <div className="blog-sidebar-section">
            <h2 className="blog-sidebar-title">태그</h2>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-8 bg-[var(--color-secondary)] rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`blog-sidebar ${className || ""}`}>
      <div className="space-y-8">
        {/* 카테고리 섹션 */}
        <div className="blog-sidebar-section">
          <h2 className="blog-sidebar-title">카테고리</h2>
          <CategoryList categories={categories} />
        </div>

        {/* 태그 클라우드 섹션 */}
        <div className="blog-sidebar-section">
          <h2 className="blog-sidebar-title">태그</h2>
          <TagCloud tags={tags} />
        </div>
      </div>
    </aside>
  );
}
