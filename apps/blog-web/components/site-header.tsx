"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { AuthButton } from "@/components/auth-button";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/posts", label: "Posts" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="blog-header">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-primary)]"
            onClick={closeMenu}
          >
            Mion&apos;s Blog
          </Link>
        </div>

        <nav className="hidden md:flex md:items-center md:gap-6">
          {navigation.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === item.href
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "blog-nav-link",
                  isActive && "blog-nav-link-active"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <AuthButton className="hidden sm:inline-flex" />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-hover)] hover:text-[var(--color-primary)] md:hidden"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
            aria-label="모바일 메뉴 토글"
            onClick={toggleMenu}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" aria-hidden />
            ) : (
              <Menu className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div
          id="mobile-nav"
          className="border-t border-[var(--color-border)] bg-[var(--color-card)] md:hidden"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-4 py-4">
            <nav className="flex flex-col gap-2">
              {navigation.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === item.href
                    : pathname?.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "blog-nav-link",
                      "py-2",
                      isActive && "blog-nav-link-active"
                    )}
                    onClick={closeMenu}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <AuthButton className="sm:hidden" />
          </div>
        </div>
      )}
    </header>
  );
}
