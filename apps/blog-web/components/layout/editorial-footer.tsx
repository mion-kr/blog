import Link from "next/link";

/**
 * Editorial 테마 공통 푸터입니다. 굵은 선 아래 저작권 한 줄과 링크만 둡니다.
 */
export function EditorialFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="foot">
      <div className="container">
        <div className="foot-row">
          <small>© {year} Mion’s Blog. All rights reserved.</small>
          <nav className="foot-links" aria-label="푸터 네비게이션">
            <Link href="/terms">이용약관</Link>
            <Link href="/privacy-policy">개인정보처리방침</Link>
            <a href="https://github.com/mion-kr" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
