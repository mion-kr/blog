import { getServerSession } from "next-auth/next"
import { authOptions } from "./auth-config"

// 서버 사이드에서 세션 가져오기
export async function getSession() {
  return await getServerSession(authOptions)
}

// 현재 사용자가 관리자인지 확인
export async function isAdmin() {
  const session = await getSession()
  return session?.user?.role === "ADMIN"
}

// 인증된 사용자인지 확인
export async function isAuthenticated() {
  const session = await getSession()
  return !!session?.user
}

// 관리자 권한 필요한 작업 보호
export async function requireAdmin() {
  const admin = await isAdmin()
  if (!admin) {
    throw new Error("Admin access required")
  }
}

// 인증 필요한 작업 보호
export async function requireAuth() {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    throw new Error("Authentication required")
  }
}