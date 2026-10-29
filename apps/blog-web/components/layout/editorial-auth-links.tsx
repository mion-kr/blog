"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

import { useAuth } from "@/hooks/use-auth";

/**
 * 로그인한 사용자에게만 관리자 이동과 로그아웃을 보여 줍니다. 방문자에게는 아무것도 렌더링하지 않습니다.
 */
export function EditorialAuthLinks() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut({ callbackUrl: "/" });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <>
      {isAdmin ? <Link href="/admin">Admin</Link> : null}
      <button type="button" onClick={handleSignOut} disabled={isSigningOut}>
        {isSigningOut ? "로그아웃 중…" : "로그아웃"}
      </button>
    </>
  );
}
