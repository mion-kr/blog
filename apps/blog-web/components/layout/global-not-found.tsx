import Link from "next/link";

import { EditorialFooter } from "@/components/layout/editorial-footer";
import { EditorialHeader } from "@/components/layout/editorial-header";
import styles from "@/components/layout/editorial.module.css";

/**
 * 일치하는 route가 없거나 공개 목록이 범위를 벗어났을 때 표시합니다.
 * (site) 레이아웃 밖이라 Editorial 헤더/푸터를 직접 렌더링합니다.
 */
export function GlobalNotFound() {
  return (
    <div className={styles.root}>
      <EditorialHeader />
      <main id="main" tabIndex={-1} className="chrome-body">
        <div className="page-head">
          <div className="container">
            <p className="meta">404</p>
            <h1>페이지를 찾을 수 없습니다</h1>
            <p className="lead">요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.</p>
            <div className="actions">
              <Link href="/" className="btn">
                홈으로 돌아가기
              </Link>
              <Link href="/posts" className="btn">
                모든 포스트 보기
              </Link>
            </div>
          </div>
        </div>
      </main>
      <EditorialFooter />
    </div>
  );
}
