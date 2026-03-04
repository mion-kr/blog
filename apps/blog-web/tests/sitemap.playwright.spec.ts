import { expect, test } from '@playwright/test'
import http from 'http'

import { buildApiResponse } from './test-helpers'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:43110'
const apiUrl = new URL(API_BASE_URL)
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://blog.mion-space.dev').replace(/\/$/, '')

const postForSitemap = {
  id: 'post-sitemap-1',
  title: 'Sitemap 대상 포스트',
  slug: 'sitemap-target-post',
  content: '# Sitemap',
  excerpt: '사이트맵 상세 URL 테스트용 포스트입니다.',
  coverImage: null,
  published: true,
  viewCount: 0,
  categoryId: 'category-dev',
  authorId: 'author-1',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-02T00:00:00.000Z',
  publishedAt: '2026-03-01T00:00:00.000Z',
  category: {
    id: 'category-dev',
    name: '개발',
    slug: 'development',
    description: '',
    postCount: 1,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  author: {
    id: 'author-1',
    name: '미온',
    image: 'https://example.com/author.png',
  },
  tags: [],
}

let mockServer: http.Server
let detailTrackViewValues: string[] = []

test.beforeAll(async () => {
  mockServer = http.createServer((req, res) => {
    if (!req.url) {
      res.statusCode = 400
      res.end()
      return
    }

    const requestUrl = new URL(req.url, API_BASE_URL)
    if (requestUrl.pathname === '/api/posts') {
      const payload = buildApiResponse(
        [postForSitemap],
        '/api/posts',
        {
          total: 1,
          limit: 50,
          page: 1,
          hasNext: false,
          hasPrev: false,
          totalPages: 1,
        },
      )

      const body = JSON.stringify(payload)
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      })
      res.end(body)
      return
    }

    if (requestUrl.pathname === `/api/posts/${postForSitemap.slug}`) {
      detailTrackViewValues.push(requestUrl.searchParams.get('trackView') ?? 'true')

      const payload = buildApiResponse(
        postForSitemap,
        `/api/posts/${postForSitemap.slug}`,
      )

      const body = JSON.stringify(payload)
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      })
      res.end(body)
      return
    }

    res.statusCode = 404
    res.end()
  })

  await new Promise<void>((resolve) => {
    mockServer.listen(Number(apiUrl.port || 80), apiUrl.hostname, resolve)
  })
})

test.beforeEach(() => {
  detailTrackViewValues = []
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
        return
      }
      resolve()
    })
  })
})

test('sitemap.xml에 상세 포스트 URL이 포함되어야 함', async ({ request }) => {
  const response = await request.get('/sitemap.xml')
  expect(response.ok()).toBeTruthy()

  const xml = await response.text()

  expect(xml).toContain(`<loc>${SITE_URL}/</loc>`)
  expect(xml).toContain(`<loc>${SITE_URL}/posts</loc>`)
  expect(xml).toContain(`<loc>${SITE_URL}/about</loc>`)
  expect(xml).toContain(`<loc>${SITE_URL}/posts/sitemap-target-post</loc>`)
})

test('/posts 초기 HTML에 실제 포스트 링크가 포함되어야 함', async ({ request }) => {
  const response = await request.get('/posts')
  expect(response.ok()).toBeTruthy()

  const html = await response.text()

  expect(html).toContain('/posts/sitemap-target-post')
  expect(html).not.toContain('Loading title…')
})

test('/posts/:slug SSR에서 metadata와 본문 렌더가 trackView 정책대로 분리되어야 함', async ({ request }) => {
  const response = await request.get(`/posts/${postForSitemap.slug}`)
  expect(response.ok()).toBeTruthy()

  const html = await response.text()

  expect(html).toContain(`<link rel=\"canonical\" href=\"${SITE_URL}/posts/${postForSitemap.slug}\"`)
  expect(html).toContain('application/ld+json')
  expect(html).toContain('"@type":"BlogPosting"')
  expect(html).not.toContain('noindex')
  expect(detailTrackViewValues).toContain('false')
  expect(detailTrackViewValues).toContain('true')
})
