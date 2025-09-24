"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { ArrowRight, Loader2, PenSquare, Sparkles } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const secondaryButtonStyles =
  "inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-6 py-3 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]";

export function HeroActions() {
  const { isAdmin, isAuthenticated } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signIn("google");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="flex flex-wrap justify-center gap-3 md:justify-start">
      <Link
        href="/posts"
        className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
      >
        <ArrowRight className="h-4 w-4" aria-hidden />
        최신 글 둘러보기
      </Link>

      {isAdmin ? (
        <Link
          href="/admin/write"
          className={cn(secondaryButtonStyles, "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] hover:bg-[var(--color-secondary)]/80")}
        >
          <PenSquare className="h-4 w-4" aria-hidden />
          새 글 작성하기
        </Link>
      ) : isAuthenticated ? (
        <Link
          href="/categories"
          className={secondaryButtonStyles}
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          관심 주제 찾기
        </Link>
      ) : (
        <button
          type="button"
          className={cn(secondaryButtonStyles, "bg-[var(--color-card)]")}
          onClick={handleSignIn}
          disabled={isSigningIn}
        >
          {isSigningIn ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden />
          )}
          Google로 로그인
        </button>
      )}
    </div>
  );
}
