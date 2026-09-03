import Link from "next/link";

const legalLinks = [
  { href: "/terms", label: "이용약관" },
  { href: "/privacy-policy", label: "개인정보처리방침" },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="neon-footer">
      <div className="neon-footer-inner text-sm">
        <p className="neon-footer-text">
          © {year}{" "}
          <Link href="/" className="neon-footer-brand font-semibold">
            Mion&apos;s Blog
          </Link>
          . All rights reserved.
        </p>

        <nav
          aria-label="푸터 네비게이션"
          className="flex flex-wrap items-center gap-x-4 gap-y-2"
        >
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} className="neon-footer-link">
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/mion-kr"
            target="_blank"
            rel="noopener noreferrer"
            className="neon-footer-link"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
