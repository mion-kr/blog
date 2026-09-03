"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/**
 * (site) 라우트용 크롬(헤더/푸터) 래퍼.
 * - 네온 테마 경로는 페이지가 직접 렌더링하는 헤더를 유지합니다.
 * - 모든 공개 경로는 공용 SiteFooter를 렌더링합니다.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const hasNeonHeader =
    pathname === "/" ||
    pathname === "/about" ||
    pathname === "/posts" ||
    pathname.startsWith("/posts/");

  if (hasNeonHeader) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
