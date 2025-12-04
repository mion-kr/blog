"use client";

import { Suspense } from "react";
import type { Category, Tag } from "@repo/shared";

import { BlogSidebar } from "./sidebar";

interface WithSidebarProps {
  children: React.ReactNode;
  className?: string;
  sidebarInitialCategories?: Category[];
  sidebarInitialTags?: Tag[];
}

export function WithSidebar({
  children,
  className,
  sidebarInitialCategories,
  sidebarInitialTags,
}: WithSidebarProps) {
  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className || ''}`}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 py-8">
        <div className="min-w-0">
          {children}
        </div>
        {/* 데스크톱: 우측 고정 사이드바 */}
        <Suspense fallback={<div className="hidden lg:block h-full" aria-label="사이드바 로딩 중" />}>
          <BlogSidebar
            className="hidden lg:block"
            initialCategories={sidebarInitialCategories}
            initialTags={sidebarInitialTags}
          />
        </Suspense>
      </div>
      {/* 태블릿/모바일: 하단 사이드바 */}
      <div className="lg:hidden">
        <Suspense fallback={<div className="mt-8" aria-label="사이드바 로딩 중" />}>
          <BlogSidebar
            className="mt-8"
            initialCategories={sidebarInitialCategories}
            initialTags={sidebarInitialTags}
          />
        </Suspense>
      </div>
    </div>
  );
}
