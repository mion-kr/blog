import Link from "next/link";

import { EditorialAuthLinks } from "@/components/layout/editorial-auth-links";

export type EditorialHeaderProps = {
  activePath?: "/" | "/posts" | "/about";
};

const navigation = [
  { href: "/", label: "Home" },
  { href: "/posts", label: "Posts" },
  { href: "/about", label: "About" },
] as const;

/**
 * Editorial 테마 공통 헤더입니다. 스타일은 editorial.module.css의 `.nav`가 담당합니다.
 */
export function EditorialHeader({ activePath }: EditorialHeaderProps) {
  return (
    <header className="nav">
      <div className="container nav-in">
        <Link className="wordmark" href="/">
          Mion’s Blog
        </Link>
        <nav className="nav-links" aria-label="메인 네비게이션">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.href === activePath ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
          <EditorialAuthLinks />
        </nav>
      </div>
    </header>
  );
}
