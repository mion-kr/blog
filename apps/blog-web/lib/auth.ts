import { getServerSession } from "next-auth/next"
import { getToken } from "next-auth/jwt"
import type { JWT } from "next-auth/jwt"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { ReauthenticationRequiredError } from "./api-errors"
import { authOptions } from "./auth-config"

async function createRequestFromCookies(): Promise<Request | null> {
  const cookieStore = await cookies()
  const serialized = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ")

  if (!serialized) {
    return null
  }

  const headers = new Headers({ cookie: serialized })
  return new Request('http://localhost', { headers })
}

// 서버 사이드에서 세션 가져오기
export async function getSession() {
  return await getServerSession(authOptions)
}

// 서버에서 JWT payload 가져오기
export async function getJwt(): Promise<JWT | null> {
  const req = await createRequestFromCookies()
  if (!req) {
    return null
  }

  return (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })) as JWT | null
}

// 서버에서 Authorization 헤더로 사용할 RAW JWT 문자열 반환
export async function getAuthorizationToken(): Promise<string | null> {
  const req = await createRequestFromCookies()
  if (!req) {
    return null
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    raw: true,
  })

  return typeof token === "string" ? token : null
}

// 서버에서 API 호출 시 사용할 Authorization 헤더 생성
export async function getAuthorizationHeader(): Promise<Record<string, string>> {
  const token = await getAuthorizationToken()
  if (!token) {
    return {}
  }

  return {
    Authorization: `Bearer ${token}`,
  }
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

// 401/403 에러를 재인증 페이지로 안내
export function handleServerAuthError(
  error: unknown,
  options: { returnTo?: string } = {}
): never {
  if (error instanceof ReauthenticationRequiredError) {
    const params = new URLSearchParams({
      error: error.reason === "FORBIDDEN" ? "AccessDenied" : "SessionExpired",
    })

    if (options.returnTo) {
      params.set("callbackUrl", options.returnTo)
    }

    redirect(`/auth/signin?${params.toString()}`)
  }

  throw error
}
