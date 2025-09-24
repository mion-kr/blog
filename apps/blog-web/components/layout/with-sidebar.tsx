"use client";

import { BlogSidebar } from "./sidebar";

interface WithSidebarProps {
  children: React.ReactNode;
  className?: string;
}

export function WithSidebar({ children, className }: WithSidebarProps) {
  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className || ''}`}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 py-8">
        <div className="min-w-0">
          {children}
        </div>
        {/* 데스크톱: 우측 고정 사이드바 */}
        <BlogSidebar className="hidden lg:block" />
      </div>
      {/* 태블릿/모바일: 하단 사이드바 */}
      <div className="lg:hidden">
        <BlogSidebar className="mt-8" />
      </div>
    </div>
  );
}