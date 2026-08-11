import { expect, test } from '@playwright/test'
import http from 'http'

import { buildApiResponse } from './test-helpers'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:43110'
const apiUrl = new URL(API_BASE_URL)

const mermaidPost = {
  id: 'post-mermaid-label-visibility',
  title: 'Mermaid 노드 레이블 표시 검증',
  slug: 'mermaid-label-visibility',
  content: [
    '# Mermaid 레이블 회귀 테스트',
    '',
    '일반 본문 문단 색상입니다.',
    '',
    '```mermaid',
    'flowchart LR',
    '  start[시작 노드] --> done[완료 노드]',
    '```',
  ].join('\n'),
  excerpt: 'Mermaid 노드 레이블의 글자색을 검증합니다.',
  coverImage: null,
  published: true,
  viewCount: 0,
  categoryId: 'category-test',
  authorId: 'author-test',
  createdAt: '2026-08-11T00:00:00.000Z',
  updatedAt: '2026-08-11T00:00:00.000Z',
  publishedAt: '2026-08-11T00:00:00.000Z',
  category: {
    id: 'category-test',
    name: '테스트',
    slug: 'test',
    description: '',
    postCount: 1,
    createdAt: '2026-08-11T00:00:00.000Z',
    updatedAt: '2026-08-11T00:00:00.000Z',
  },
  author: {
    id: 'author-test',
    name: '테스트 작성자',
    image: null,
  },
  tags: [],
}

let mockServer: http.Server

test.beforeAll(async () => {
  mockServer = http.createServer((req, res) => {
    if (!req.url) {
      res.statusCode = 400
      res.end()
      return
    }

    const requestUrl = new URL(req.url, API_BASE_URL)

    if (requestUrl.pathname === `/api/posts/${mermaidPost.slug}`) {
      const body = JSON.stringify(
        buildApiResponse(mermaidPost, `/api/posts/${mermaidPost.slug}`),
      )

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

test.describe('[UI] Mermaid 노드 레이블', () => {
  test('[UI] SVG 내부 문단은 노드 레이블 색상을 상속해 표시한다', async ({
    page,
  }) => {
    await page.goto(`/posts/${mermaidPost.slug}`)

    const svg = page
      .locator('[data-mermaid-chart] svg')
      .filter({ hasText: '시작 노드' })
    const nodeLabel = svg
      .locator('.nodeLabel')
      .filter({ hasText: '시작 노드' })
      .first()
    const labelParagraph = nodeLabel.locator('p')
    const proseParagraph = page.getByText('일반 본문 문단 색상입니다.')

    await expect(svg).toBeVisible()
    await expect(labelParagraph).toBeVisible()
    await expect(labelParagraph).toHaveText('시작 노드')

    const [nodeLabelColor, labelParagraphStyle, proseParagraphColor] =
      await Promise.all([
        nodeLabel.evaluate((element) => getComputedStyle(element).color),
        labelParagraph.evaluate((element) => {
          const style = getComputedStyle(element)

          return {
            color: style.color,
            marginBottom: style.marginBottom,
            marginTop: style.marginTop,
          }
        }),
        proseParagraph.evaluate((element) => getComputedStyle(element).color),
      ])

    expect(labelParagraphStyle.color).toBe(nodeLabelColor)
    expect(labelParagraphStyle.color).not.toBe(proseParagraphColor)
    expect(labelParagraphStyle.marginTop).toBe('0px')
    expect(labelParagraphStyle.marginBottom).toBe('0px')

    const svgBox = await svg.boundingBox()
    expect(svgBox).not.toBeNull()
    expect(svgBox?.width).toBeGreaterThan(0)
    expect(svgBox?.height).toBeGreaterThan(0)

    await page.setViewportSize({ width: 390, height: 844 })
    await expect(labelParagraph).toBeVisible()

    const diagramViewport = page.locator('[data-mermaid-chart] > div').first()
    await expect(diagramViewport).toHaveCSS('overflow-x', 'auto')
  })
})
