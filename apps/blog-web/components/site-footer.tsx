import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-card)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1 text-sm text-[var(--color-text-secondary)]">
          <p className="font-medium text-[var(--color-text-primary)]">Mion&apos;s Blog</p>
          <p>© {year} Mion. All rights reserved.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-secondary)]">
          <Link href="/rss.xml" className="transition-colors hover:text-[var(--color-primary)]">
            RSS
          </Link>
          <a
            href="https://github.com/mion-lab"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[var(--color-primary)]"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
