"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { Loader2, LogIn, LogOut, Shield } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface AuthButtonProps {
  className?: string;
}

const buttonStyles =
  "inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-70";

export function AuthButton({ className }: AuthButtonProps) {
  const { isAuthenticated, isAdmin, user, isLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsProcessing(true);
      await signIn("google");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsProcessing(true);
      await signOut({ callbackUrl: "/" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <button className={cn(buttonStyles, className)} type="button" disabled>
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span className="sr-only">세션 확인 중</span>
      </button>
    );
  }

  if (!isAuthenticated) {
    return (
      <button
        className={cn(
          buttonStyles,
          "bg-[var(--color-primary)] text-white hover:bg-[var(--color-accent-primary-hover)]",
          className,
        )}
        type="button"
        onClick={handleSignIn}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <LogIn className="h-4 w-4" aria-hidden />
        )}
        Google로 로그인
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Link
        href={isAdmin ? "/admin" : "/posts"}
        className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-primary)]"
      >
        {user?.image ? (
          <Image
            src={user.image}
            alt={`${user.name ?? "사용자"} 아바타`}
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]">
            {(user?.name ?? "M").slice(0, 1)}
          </div>
        )}
        <span className="hidden sm:flex sm:flex-col sm:items-start">
          <span>{user?.name ?? "사용자"}</span>
          <span className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
            {isAdmin && <Shield className="h-3 w-3 text-[var(--color-accent-success)]" aria-hidden />}
            {isAdmin ? "ADMIN" : "USER"}
          </span>
        </span>
      </Link>
      <button
        className={cn(buttonStyles, "px-3 py-2 text-sm")}
        type="button"
        onClick={handleSignOut}
        disabled={isProcessing}
        aria-label="로그아웃"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <LogOut className="h-4 w-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
