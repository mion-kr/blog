"use client"

import { useSession } from "next-auth/react"

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