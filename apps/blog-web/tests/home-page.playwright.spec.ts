import { expect, test } from '@playwright/test'
import http from 'http'

import { buildApiResponse, mockApiRoutes } from './test-helpers'

const featuredPost = {
  id: 'post-nextauth',
  title: 'NextAuth',
  slug: 'nextauth',
  content: '# NextAuth',
  excerpt: 'NextAuth에 대한 설명 입니다.',
  coverImage: 'https://example.com/nextauth.png',
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
      id: 'tag-nextjs',
      name: 'Next.js',
      slug: 'nextjs',
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
  id: 'post-success',
  title: '최종 성공 포스트 - MCP 수정 확인',
  slug: '최종-성공-포스트-수정됨',
  content: '# MCP',
  excerpt: 'MCP로 자동 편집 시나리오 검증 중입니다.',
  coverImage: 'https://example.com/mcp.png',
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
      id: 'tag-typescript',
      name: 'TypeScript',
      slug: 'typescript',
      postCount: 4,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
    {
      id: 'tag-nextjs',
      name: 'Next.js',
      slug: 'nextjs',
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
  viewCount: 21,
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:43110'
const apiUrl = new URL(API_BASE_URL)

const latestPostsResponse = buildApiResponse(
  [featuredPost, secondaryPost],
  '/api/posts',
  {
    total: 2,
    limit: 10,
    page: 1,
    hasNext: false,
    hasPrev: false,
    totalPages: 1,
  }
)

const trendingPostsResponse = buildApiResponse(
  [secondaryPost],
  '/api/posts',
  {
    total: 1,
    limit: 5,
    page: 1,
    hasNext: false,
    hasPrev: false,
    totalPages: 1,
  }
)

const categoriesResponse = buildApiResponse(
  [
    { id: 'category-dev', name: '개발', slug: 'development', description: '', color: '#1f2937', postCount: 20, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z' },
    { id: 'category-ai', name: '으아아이', slug: 'euaai', description: '', color: '#1f2937', postCount: 10, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z' },
    { id: 'category-tutorial', name: '튜토리얼', slug: 'tutorial', description: '', color: '#1f2937', postCount: 8, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z' },
    { id: 'category-fe', name: '프론트엔드', slug: 'peuronteuendeu', description: '', color: '#1f2937', postCount: 7, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z' },
    { id: 'category-retro', name: '회고', slug: 'retrospective', description: '', color: '#1f2937', postCount: 5, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z' },
  ],
  '/api/categories',
  {
    total: 5,
    limit: 8,
    page: 1,
    hasNext: false,
    hasPrev: false,
    totalPages: 1,
  }
)

const tagsResponse = buildApiResponse(
  [
    { id: 'tag-ai', name: 'AI', slug: 'ai', postCount: 5, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z' },
    { id: 'tag-nextjs', name: 'Next.js', slug: 'nextjs', postCount: 12, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z' },
    { id: 'tag-nodejs', name: 'Node.js', slug: 'nodejs', postCount: 4, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z' },
    { id: 'tag-ts', name: 'TypeScript', slug: 'typescript', postCount: 6, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z' },
  ],
  '/api/tags',
  {
    total: 4,
    limit: 14,
    page: 1,
    hasNext: false,
    hasPrev: false,
    totalPages: 1,
  }
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
      const sort = requestUrl.searchParams.get('sort')

      if (sort === 'viewCount') {
        sendJson(trendingPostsResponse)
        return
      }

      sendJson(latestPostsResponse)
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
      const sort = url.searchParams.get('sort')

      if (sort === 'publishedAt') {
        return { body: latestPostsResponse }
      }

      if (sort === 'viewCount') {
        return { body: trendingPostsResponse }
      }

      return { body: latestPostsResponse }
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

test.describe('[UI] 홈 화면', () => {
  test('[UI] 핵심 콘텐츠를 노출한다', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: "Mion's 기술 블로그에 오신 것을 환영합니다" })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Google로 로그인' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: '최신 글 둘러보기' })).toBeVisible()

    const statCards = page.locator('.blog-stat-card')
    await expect(statCards).toHaveCount(3)
    await expect(statCards.nth(0)).toContainText('전체 포스트')
    await expect(statCards.nth(1)).toContainText('카테고리 & 태그')
    await expect(statCards.nth(2)).toContainText('마지막 업데이트')

    await expect(page.getByText('첫 번째 포스트를 기다리고 있어요')).toBeVisible()
    await expect(page.getByText('관리자 로그인을 통해 새로운 포스트를 작성해보세요.')).toBeVisible()
  })
})
