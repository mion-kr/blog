"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/**
 * (site) 라우트용 크롬(헤더/푸터) 래퍼.
 * - 홈(`/`)은 샘플 홈이 페이지에서 직접 header/footer를 렌더링하므로 크롬을 숨깁니다.
 * - 그 외 경로는 기존 SiteHeader/SiteFooter 레이아웃을 유지합니다.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/" || pathname === "/posts" || pathname === "/about") {
    return <>{children}</>;
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
