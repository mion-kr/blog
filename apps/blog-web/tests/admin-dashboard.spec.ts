import { expect, test } from '@playwright/test'
import { encode } from 'next-auth/jwt'
import http from 'http'

async function createAdminSessionToken() {
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
      // next-auth/jwt encode는 exp를 자동 부여하지만, 명시적으로 유효기간 설정
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      iat: Math.floor(Date.now() / 1000),
    },
    secret,
    maxAge: 60 * 60,
  })
}

function buildApiResponse<T>(data: T, path: string, meta?: Record<string, unknown>) {
  return {
    success: true,
    message: 'ok',
    timestamp: new Date().toISOString(),
    path,
    data,
    ...(meta ? { meta } : {}),
  }
}

const apiBaseUrlString = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:43110'
const apiBaseUrl = new URL(apiBaseUrlString)
const mockApiPort = Number(apiBaseUrl.port || 43110)
const mockApiHost = apiBaseUrl.hostname

let mockServer: http.Server

test.beforeAll(async () => {
  mockServer = http.createServer((req, res) => {
    if (!req.url) {
      res.statusCode = 400
      return res.end()
    }

    const requestUrl = new URL(req.url, apiBaseUrlString)

    const jsonResponse = (data: unknown) => {
      const body = JSON.stringify(data)
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      })
      res.end(body)
    }

    if (requestUrl.pathname === '/api/posts') {
      const isPublished = requestUrl.searchParams.get('published') === 'true'

      if (isPublished) {
        return jsonResponse(
          buildApiResponse(
            [
              {
                id: 'published-1',
                title: '첫 번째 게시글',
                slug: 'first-post',
                published: true,
                updatedAt: new Date().toISOString(),
              },
            ],
            '/api/posts',
            { total: 32, limit: 1, page: 1 }
          )
        )
      }

      return jsonResponse(
        buildApiResponse(
          [
            {
              id: 'draft-1',
              title: '운영 가이드 초안',
              slug: 'operating-guide-draft',
              published: false,
              updatedAt: new Date().toISOString(),
            },
          ],
          '/api/posts',
          { total: 5, limit: 5, page: 1 }
        )
      )
    }

    if (requestUrl.pathname === '/api/categories') {
      return jsonResponse(
        buildApiResponse(
          [
            {
              id: 'category-1',
              name: '뉴스',
              slug: 'news',
              createdAt: new Date().toISOString(),
            },
          ],
          '/api/categories',
          { total: 4, limit: 1, page: 1 }
        )
      )
    }

    if (requestUrl.pathname === '/api/tags') {
      return jsonResponse(
        buildApiResponse(
          [
            {
              id: 'tag-1',
              name: 'Playwright',
              slug: 'playwright',
              createdAt: new Date().toISOString(),
            },
          ],
          '/api/tags',
          { total: 12, limit: 1, page: 1 }
        )
      )
    }

    res.statusCode = 404
    res.end()
  })

  await new Promise<void>((resolve) => {
    mockServer.listen(mockApiPort, mockApiHost, resolve)
  })
})

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    if (!mockServer.listening) {
      return resolve()
    }

    mockServer.close((error) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
})

test.describe('Admin dashboard', () => {
  test('관리자 대시보드가 카드와 액션을 노출한다', async ({ page, context, baseURL }) => {
    if (!baseURL) {
      throw new Error('Playwright baseURL이 설정되어 있어야 합니다.')
    }

    const sessionToken = await createAdminSessionToken()

    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: sessionToken,
        domain: new URL(baseURL).hostname,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        expires: Math.floor(Date.now() / 1000) + 60 * 60,
      },
    ])

    await page.goto('/admin')

    await expect(page.getByRole('heading', { name: '관리자 콘솔' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /어서 오세요/ })).toBeVisible()
    await expect(page.getByRole('link', { name: '새 글 작성하기' })).toBeVisible()
    await expect(page.getByText('발행된 포스트')).toBeVisible()
    await expect(page.getByText('작성 중 초안')).toBeVisible()
    await expect(page.getByText('카테고리')).toBeVisible()
    await expect(page.getByText('태그')).toBeVisible()

    await expect(page.getByText('운영 가이드 초안')).toBeVisible()
    await expect(page.getByRole('link', { name: '편집' })).toBeVisible()
  })
})
