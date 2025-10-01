import type { Page, Request } from '@playwright/test'
import { encode } from 'next-auth/jwt'

export interface JsonMockResponse {
  status?: number
  body: unknown
  headers?: Record<string, string>
}

export type ApiRouteResolver = (request: Request) => JsonMockResponse | undefined | Promise<JsonMockResponse | undefined>

const apiPattern = /^(?:https?:\/\/(?:127\.0\.0\.1|localhost|0\.0\.0\.0)(?::\d+)?\/api\/.*|https?:\/\/[^/]+\/api\/.*|\/api\/.*)$/

export async function mockApiRoutes(page: Page, resolver: ApiRouteResolver) {
  await page.route(apiPattern, async (route) => {
    const request = route.request()
    const result = await resolver(request)

    if (!result) {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: result.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(result.body),
      headers: result.headers,
    })
  })
}

export function buildApiResponse<T>(data: T, path: string, meta?: Record<string, unknown>) {
  return {
    success: true,
    message: 'ok',
    timestamp: new Date().toISOString(),
    path,
    data,
    ...(meta ? { meta } : {}),
  }
}

export async function createAdminSessionToken() {
  const secret = process.env.NEXTAUTH_SECRET ?? 'test-secret'
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@example.com'

  return encode({
    token: {
      name: '테스트 관리자',
      email: adminEmail,
      picture: 'https://example.com/avatar.png',
      role: 'ADMIN',
      sub: 'admin-user-id',
      googleId: 'fake-google-id',
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      iat: Math.floor(Date.now() / 1000),
    },
    secret,
    maxAge: 60 * 60,
  })
}
