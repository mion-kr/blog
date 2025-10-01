import { expect, test } from '@playwright/test'
import http from 'http'

import { buildApiResponse, createAdminSessionToken, mockApiRoutes } from './test-helpers'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:43110'
const apiUrl = new URL(API_BASE_URL)

const publishedResponse = buildApiResponse(
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

const draftsResponse = buildApiResponse(
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

const categoriesResponse = buildApiResponse(
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

const tagsResponse = buildApiResponse(
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

const settingsResponse = buildApiResponse(
  {
    siteTitle: 'Mion Blog',
    siteDescription: '테스트용 설명',
    siteUrl: 'https://mion.local',
    postsPerPage: 5,
  },
  '/api/admin/settings'
)

let mockServer: http.Server

test.beforeAll(async () => {
  mockServer = http.createServer((req, res) => {
    if (!req.url) {
      res.statusCode = 400
      res.end()
      return
    }

    const requestUrl = new URL(req.url, API_BASE_URL)

    const sendJson = (body: unknown) => {
      const payload = JSON.stringify(body)
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      })
      res.end(payload)
    }

    if (requestUrl.pathname === '/api/posts') {
      const isPublished = requestUrl.searchParams.get('published') === 'true'
      sendJson(isPublished ? publishedResponse : draftsResponse)
      return
    }

    if (requestUrl.pathname === '/api/categories') {
      sendJson(categoriesResponse)
      return
    }

    if (requestUrl.pathname === '/api/tags') {
      sendJson(tagsResponse)
      return
    }

    if (requestUrl.pathname === '/api/admin/settings') {
      sendJson(settingsResponse)
      return
    }

    res.statusCode = 404
    res.end()
  })

  await new Promise<void>((resolve) => {
    mockServer.listen(Number(apiUrl.port || 80), apiUrl.hostname, resolve)
  })
})

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    if (!mockServer.listening) {
      resolve()
      return
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

test.beforeEach(async ({ page }) => {
  await mockApiRoutes(page, (request) => {
    const url = new URL(request.url())

    if (url.pathname === '/api/posts') {
      const isPublished = url.searchParams.get('published') === 'true'

      if (isPublished) {
        return { body: publishedResponse }
      }

      return { body: draftsResponse }
    }

    if (url.pathname === '/api/categories') {
      return { body: categoriesResponse }
    }

    if (url.pathname === '/api/tags') {
      return { body: tagsResponse }
    }

    if (url.pathname === '/api/admin/settings') {
      return { body: settingsResponse }
    }

    return undefined
  })
})

test.describe('[UI] Admin dashboard', () => {
  test('[UI] 관리자 대시보드가 카드와 액션을 노출한다', async ({ page, context, baseURL }) => {
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
    await expect(page.getByText('카테고리').first()).toBeVisible()
    await expect(page.getByText('태그').first()).toBeVisible()

    // 초안 카드 내용은 인증 상태에 따라 달라질 수 있으므로 핵심 CTA까지만 검증해요.
  })
})
