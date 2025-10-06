"use client"

import { useCallback } from "react"
import { signIn, useSession } from "next-auth/react"

import { isReauthenticationError } from "../lib/api-errors"

export function useAuth() {
  const { data: session, status } = useSession()
  
  return {
    user: session?.user,
    isAuthenticated: !!session?.user,
    isAdmin: session?.user?.role === "ADMIN",
    isLoading: status === "loading",
    session,
  }
}

export function useRequireAuth() {
  const auth = useAuth()
  
  if (!auth.isLoading && !auth.isAuthenticated) {
    throw new Error("Authentication required")
  }
  
  return auth
}

export function useRequireAdmin() {
  const auth = useAuth()
  
  if (!auth.isLoading && !auth.isAdmin) {
    throw new Error("Admin access required")
  }
  
  return auth
}

// API 호출에서 인증 오류가 발생했을 때 재로그인으로 유도하는 헬퍼
export function useAuthReauthentication(options: { callbackUrl?: string } = {}) {
  return useCallback(
    (error: unknown) => {
      if (!isReauthenticationError(error)) {
        return false
      }

      const callbackUrl = options.callbackUrl ??
        (typeof window !== "undefined" ? window.location.href : "/admin")

      // NextAuth signIn 호출로 재인증 유도
      void signIn(undefined, {
        callbackUrl,
      })

      return true
    },
    [options.callbackUrl]
  )
}
