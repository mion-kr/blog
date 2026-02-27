import { expect, test } from '@playwright/test'
import http from 'http'

import { buildApiResponse, createAdminSessionToken } from './test-helpers'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:43110'
const apiUrl = new URL(API_BASE_URL)

const createdPostResponse = buildApiResponse(
  {
    id: '018f1aeb-4b58-79f7-b555-725f0c602114',
    title: '이미지 업로드 테스트',
    slug: 'image-upload-test',
    content: '# 테스트',
    excerpt: null,
    coverImage: null,
    published: false,
    viewCount: 0,
    categoryId: '018f1aeb-4b58-79f7-b555-725f0c602111',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: null,
    category: {
      id: '018f1aeb-4b58-79f7-b555-725f0c602111',
      name: '개발',
      slug: 'development',
      description: null,
    },
    tags: [
      {
        id: '018f1aeb-4b58-79f7-b555-725f0c602112',
        name: 'Next.js',
        slug: 'nextjs',
      },
    ],
    author: {
      id: '018f1aeb-4b58-79f7-b555-725f0c602110',
      name: '테스트 관리자',
      email: 'admin@example.com',
      image: null,
    },
  },
  '/api/posts',
)

const categoriesResponse = buildApiResponse(
  [
    {
      id: '018f1aeb-4b58-79f7-b555-725f0c602111',
      name: '개발',
      slug: 'development',
      description: null,
      color: null,
      postCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  '/api/categories',
  { total: 1, limit: 100, page: 1, hasNext: false, hasPrev: false, totalPages: 1 },
)

const tagsResponse = buildApiResponse(
  [
    {
      id: '018f1aeb-4b58-79f7-b555-725f0c602112',
      name: 'Next.js',
      slug: 'nextjs',
      postCount: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  '/api/tags',
  { total: 1, limit: 100, page: 1, hasNext: false, hasPrev: false, totalPages: 1 },
)

const adminSettingsResponse = buildApiResponse(
  {
    siteTitle: 'Mion Blog',
    siteDescription: '테스트용',
    siteUrl: 'https://mion.local',
    postsPerPage: 10,
  },
  '/api/admin/settings',
)

const adminPostsResponse = buildApiResponse(
  [
    {
      id: '018f1aeb-4b58-79f7-b555-725f0c602114',
      title: '이미지 업로드 테스트',
      slug: 'image-upload-test',
      content: '# 테스트',
      excerpt: null,
      coverImage: null,
      published: false,
      viewCount: 0,
      categoryId: '018f1aeb-4b58-79f7-b555-725f0c602111',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: null,
      category: {
        id: '018f1aeb-4b58-79f7-b555-725f0c602111',
        name: '개발',
        slug: 'development',
        description: null,
      },
      tags: [
        {
          id: '018f1aeb-4b58-79f7-b555-725f0c602112',
          name: 'Next.js',
          slug: 'nextjs',
        },
      ],
      author: {
        id: '018f1aeb-4b58-79f7-b555-725f0c602110',
        name: '테스트 관리자',
        email: 'admin@example.com',
        image: null,
      },
    },
  ],
  '/api/posts',
  { total: 1, limit: 10, page: 1, hasNext: false, hasPrev: false, totalPages: 1 },
)

let createdPostPayload: Record<string, unknown> | null = null
let mockServer: http.Server

/**
 * 요청 본문을 문자열로 수집합니다.
 */
function readRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []

    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })

    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf-8'))
    })

    req.on('error', (error) => {
      reject(error)
    })
  })
}

/**
 * mock API 응답을 JSON으로 반환합니다.
 */
function sendJson(res: http.ServerResponse, body: unknown) {
  const payload = JSON.stringify(body)
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

test.beforeAll(async () => {
  mockServer = http.createServer(async (req, res) => {
    if (!req.url) {
      res.statusCode = 400
      res.end()
      return
    }

    const requestUrl = new URL(req.url, API_BASE_URL)

    // 관리자 포스트 생성 요청 본문을 캡처해 본문 자동삽입 결과를 검증한다.
    if (requestUrl.pathname === '/api/posts' && req.method === 'POST') {
      const body = await readRequestBody(req)
      createdPostPayload = body.length > 0 ? (JSON.parse(body) as Record<string, unknown>) : {}
      sendJson(res, createdPostResponse)
      return
    }

    if (requestUrl.pathname === '/api/categories') {
      sendJson(res, categoriesResponse)
      return
    }

    if (requestUrl.pathname === '/api/tags') {
      sendJson(res, tagsResponse)
      return
    }

    if (requestUrl.pathname === '/api/admin/settings') {
      sendJson(res, adminSettingsResponse)
      return
    }

    if (requestUrl.pathname === '/api/posts' && req.method === 'GET') {
      sendJson(res, adminPostsResponse)
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

test.describe.serial('[E2E] 포스트 본문 이미지 업로드', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    if (!baseURL) {
      throw new Error('Playwright baseURL이 설정되어 있어야 합니다.')
    }

    createdPostPayload = null

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
  })

  test('[E2E] 본문 이미지 업로드 시 MDX 문법이 자동 삽입되고 저장 payload에 포함된다', async ({
    page,
  }) => {
    const uploadedPublicUrl =
      'https://bucket-production-d421.up.railway.app/development/draft/test-draft/content/1700000000000-diagram-flow.png'

    await page.route('**/api/admin/uploads/pre-signed', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          buildApiResponse(
            {
              uploadUrl: '/mock-upload/content-image',
              objectKey:
                'development/draft/test-draft/content/1700000000000-diagram-flow.png',
              publicUrl: uploadedPublicUrl,
              expiresIn: 300,
            },
            '/api/admin/uploads/pre-signed',
          ),
        ),
      })
    })

    await page.route('**/mock-upload/content-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: 'ok',
      })
    })

    await page.goto('/admin/posts/new')
    await expect(page.getByRole('heading', { name: '새 포스트 작성' })).toBeVisible()

    await page.getByLabel('제목').fill('본문 이미지 업로드 테스트')
    await page.getByLabel('요약 (선택)').fill('본문 이미지 자동삽입 검증')
    await page.getByLabel('본문 (MDX)').fill('# 본문 이미지 테스트\n\n업로드 전 텍스트')
    await page.getByLabel('카테고리').selectOption('018f1aeb-4b58-79f7-b555-725f0c602111')

    const tagInput = page.getByPlaceholder('태그 이름 또는 슬러그 입력').first()
    await tagInput.click()
    await tagInput.fill('Next')
    await page.getByRole('button', { name: 'Next.js /nextjs' }).click()

    const contentInput = page.getByLabel('본문 (MDX)')
    await contentInput.click()
    await page.keyboard.press('End')

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: '본문 이미지 업로드' }).click(),
    ])

    await fileChooser.setFiles({
      name: 'diagram[flow].png',
      mimeType: 'image/png',
      buffer: Buffer.from('png-content'),
    })

    await expect(contentInput).toHaveValue(
      /!\[diagram\\\[flow\\\]\]\(https:\/\/bucket-production-d421\.up\.railway\.app\/development\/draft\/test-draft\/content\/1700000000000-diagram-flow\.png\)/,
    )

    await page.getByRole('button', { name: '포스트 저장' }).click()
    await expect(page).toHaveURL(/\/admin\/posts\?status=created/)

    expect(createdPostPayload).not.toBeNull()
    expect(createdPostPayload?.content).toEqual(
      expect.stringContaining(
        '![diagram\\[flow\\]](https://bucket-production-d421.up.railway.app/development/draft/test-draft/content/1700000000000-diagram-flow.png)',
      ),
    )
  })
})

