import Link from "next/link";

import styles from "./post.module.css";

/**
 * 포스트를 찾을 수 없을 때 표시되는 404 페이지
 */
export default function PostNotFound() {
  return (
    <main id="main" tabIndex={-1} className={styles.root}>
      <div className="post-head">
        <div className="container grid12">
          <div>
            <h1>포스트를 찾을 수 없습니다</h1>
            <p className="lead">요청하신 포스트가 존재하지 않거나 이동되었을 수 있습니다.</p>
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
      </div>
    </main>
  );
}
