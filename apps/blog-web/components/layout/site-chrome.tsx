"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { EditorialFooter } from "@/components/layout/editorial-footer";
import {
  EditorialHeader,
  type EditorialHeaderProps,
} from "@/components/layout/editorial-header";
import styles from "@/components/layout/editorial.module.css";

function getActivePath(pathname: string): EditorialHeaderProps["activePath"] {
  if (pathname === "/" || pathname === "/about") return pathname;
  if (pathname === "/posts" || pathname.startsWith("/posts/")) return "/posts";
  return undefined;
}

/**
 * (site) 라우트용 크롬(헤더/푸터) 래퍼.
 * - 모든 공개 경로를 Editorial 테마 헤더/푸터와 토큰 영역으로 감쌉니다.
 * - 각 페이지가 `<main id="main">`을 직접 렌더링합니다.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className={styles.root}>
      <EditorialHeader activePath={getActivePath(pathname)} />
      <div className="chrome-body">{children}</div>
      <EditorialFooter />
    </div>
  );
}
