import Link from "next/link";

import styles from "./post-detail-neon-grid.module.css";

import { NeonHeader } from "@/components/layout/neon-header";
import { cn } from "@/lib/utils";

/**
 * 포스트를 찾을 수 없을 때 표시되는 404 페이지
 */
export default function PostNotFound() {
  return (
    <div className={cn(styles.root, "neon-grid-post-detail")}>
      <div className="neon-grid-bg" aria-hidden="true" />
      <NeonHeader activePath="/posts" />

      <main id="main" className="article-container">
        <div className="content-card" style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 44, fontWeight: 950, letterSpacing: "-0.04em", marginBottom: 16 }}>
            포스트를 찾을 수 없습니다
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 18, marginBottom: 28 }}>
            요청하신 포스트가 존재하지 않거나 이동되었을 수 있습니다.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/" className="btn-neon">
              홈으로 돌아가기
            </Link>
            <Link href="/posts" className="btn-neon">
              모든 포스트 보기
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
