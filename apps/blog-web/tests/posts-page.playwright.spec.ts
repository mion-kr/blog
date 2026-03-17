import { expect, test } from '@playwright/test'
import http from 'http'

import { buildApiResponse, mockApiRoutes } from './test-helpers'

const MOCK_IMAGE_BASE_URL = 'https://bucket-production-d421.up.railway.app/test'

const primaryPost = {
  id: 'post-primary',
  title: 'NestJS 운영 기록',
  slug: 'nestjs-ops-log',
  content: '# NestJS 운영 기록\n\n이 문장은 목록 SSR HTML에 그대로 노출되면 안 되는 상세 원문입니다.',
  excerpt: 'NestJS 운영 경험을 요약한 글입니다.',
  coverImage: `${MOCK_IMAGE_BASE_URL}/nestjs.png`,
  published: true,
  publishedAt: '2025-10-01T00:00:00.000Z',
  createdAt: '2025-09-20T00:00:00.000Z',
  updatedAt: '2025-10-01T00:00:00.000Z',
  categoryId: 'category-dev',
  category: {
    id: 'category-dev',
    name: '개발',
    slug: 'development',
    description: '개발 관련 아카이브',
    color: '#1f2937',
    postCount: 20,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
  tags: [
    {
      id: 'tag-nest',
      name: 'Nest.js',
      slug: 'nestjs',
      postCount: 12,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  ],
  author: {
    id: 'author-mion',
    name: '미온',
    image: 'https://example.com/mion.png',
  },
  viewCount: 12,
}

const secondaryPost = {
  id: 'post-secondary',
  title: 'MCP 자동화 메모',
  slug: 'mcp-automation-note',
  content: '# MCP\n\n이 상세 본문도 목록 SSR HTML에 포함되면 안 됩니다.',
  excerpt: undefined,
  coverImage: `${MOCK_IMAGE_BASE_URL}/mcp.png`,
  published: true,
  publishedAt: '2025-09-30T00:00:00.000Z',
  createdAt: '2025-09-28T00:00:00.000Z',
  updatedAt: '2025-09-30T00:00:00.000Z',
  categoryId: 'category-dev',
  category: {
    id: 'category-dev',
    name: '개발',
    slug: 'development',
    description: '개발 관련 아카이브',
    color: '#1f2937',
    postCount: 20,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
  tags: [
    {
      id: 'tag-nextjs',
      name: 'Next.js',
      slug: 'nextjs',
      postCount: 8,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  ],
  author: {
    id: 'author-mion',
    name: '미온',
    image: 'https://example.com/mion.png',
  },
  viewCount: 21,
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:43110'
const apiUrl = new URL(API_BASE_URL)

const postsResponse = buildApiResponse(
  [primaryPost, secondaryPost],
  '/api/posts',
  {
    total: 2,
    limit: 12,
    page: 1,
    hasNext: false,
    hasPrev: false,
    totalPages: 1,
  },
)

const categoriesResponse = buildApiResponse(
  [
    { id: 'category-dev', name: '개발', slug: 'development', description: '', color: '#1f2937', postCount: 20, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z' },
  ],
  '/api/categories',
  {
    total: 1,
    limit: 50,
    page: 1,
    hasNext: false,
    hasPrev: false,
    totalPages: 1,
  },
)

const tagsResponse = buildApiResponse(
  [
    { id: 'tag-nest', name: 'Nest.js', slug: 'nestjs', postCount: 12, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z' },
  ],
  '/api/tags',
  {
    total: 1,
    limit: 30,
    page: 1,
    hasNext: false,
    hasPrev: false,
    totalPages: 1,
  },
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
      sendJson(postsResponse)
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
      return { body: postsResponse }
    }

    if (url.pathname === '/api/categories') {
      return { body: categoriesResponse }
    }

    if (url.pathname === '/api/tags') {
      return { body: tagsResponse }
    }

    return undefined
  })
})

test.describe('[UI] 포스트 목록 화면', () => {
  test('[UI] summary와 fallback excerpt를 노출한다', async ({ page }) => {
    await page.goto('/posts')

    await expect(page.getByRole('heading', { name: 'All Technical Stories' })).toBeVisible()
    await expect(page.getByText('NestJS 운영 경험을 요약한 글입니다.')).toBeVisible()
    await expect(page.getByText('MCP 자동화 메모 글의 핵심 내용을 빠르게 확인해보세요.')).toBeVisible()
  })

  test('[UI] 목록 SSR HTML에는 상세 원문이 포함되지 않는다', async ({ request }) => {
    const response = await request.get('/posts')
    const html = await response.text()

    expect(response.ok()).toBeTruthy()
    expect(html).toContain('NestJS 운영 경험을 요약한 글입니다.')
    expect(html).toContain('MCP 자동화 메모 글의 핵심 내용을 빠르게 확인해보세요.')
    expect(html).not.toContain('이 문장은 목록 SSR HTML에 그대로 노출되면 안 되는 상세 원문입니다.')
    expect(html).not.toContain('이 상세 본문도 목록 SSR HTML에 포함되면 안 됩니다.')
  })
})
