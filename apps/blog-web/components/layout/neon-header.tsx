import Link from "next/link";

export type NeonHeaderProps = {
  activePath: "/" | "/posts" | "/about";
  ariaLabel?: string;
};

const navigation = [
  { href: "/", label: "Home" },
  { href: "/posts", label: "Posts" },
  { href: "/about", label: "About" },
] as const;

/**
 * 네온 그리드 테마(Home/Posts/About)에서 공통으로 사용하는 헤더 컴포넌트입니다.
 * - 각 페이지에서 `activePath`로 현재 메뉴(active)를 표시합니다.
 */
export function NeonHeader({ activePath, ariaLabel = "페이지 헤더" }: NeonHeaderProps) {
  return (
    <header className="header" aria-label={ariaLabel}>
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="Mion's Blog 홈">
          <div className="brand-icon" aria-hidden="true">
            M
          </div>
          <span>Mion&apos;s Blog</span>
        </Link>

        <nav className="nav" aria-label="메인 네비게이션">
          {navigation.map((item) => {
            // 현재 페이지(active) 링크에만 active class/aria-current를 적용합니다.
            const isActive = item.href === activePath;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link${isActive ? " active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="header-actions" />
      </div>
    </header>
  );
}
