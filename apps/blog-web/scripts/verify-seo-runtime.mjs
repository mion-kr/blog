import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import http from 'node:http'
import { encode } from 'next-auth/jwt'

const API_HOST = '127.0.0.1'
const API_PORT = Number(process.env.SEO_RUNTIME_API_PORT ?? 43000 + (process.pid % 1000))
const APP_HOST = '127.0.0.1'
const APP_PORT = 3200
const API_BASE_URL = `http://${API_HOST}:${API_PORT}`
const APP_BASE_URL = `http://${APP_HOST}:${APP_PORT}`
const COVER_URL = '/og/blog.png'
const KST_BOUNDARY_TIMESTAMP = '2026-08-23T15:00:00.000Z'
const AUTH_SECRET = 'seo-runtime-test-secret'
const JSON_LD_CLOSING_SCRIPT_PAYLOAD =
  '</script><script id="json-ld-breakout-probe">window.__jsonLdBreakout = true</script>'
const detailTrackViewValues = []
let failApiRequests = false
let failedApiPathname = null
let failedSitemapPage = null
let postListRequestCount = 0
let successfulApiRequestCount = 0

const category = {
  id: 'category-dev',
  name: '개발',
  slug: 'development',
  description: '개발 관련 아카이브',
  color: '#1f2937',
  postCount: 24,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
}

const tag = {
  id: 'tag-nestjs',
  name: 'NestJS',
  slug: 'nestjs',
  postCount: 24,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
}

const primaryPost = {
  id: 'post-seo-runtime',
  title: 'SEO 런타임 검증 포스트',
  slug: 'seo-runtime-post',
  content:
    '# SEO 런타임 검증\n\nproduction HTML 본문 검증 문장입니다.\n\n이 문장은 홈과 목록 SSR HTML에 노출되면 안 되는 상세 원문입니다.',
  excerpt: 'SEO production 검증용 포스트입니다.',
  coverImage: COVER_URL,
  published: true,
  publishedAt: KST_BOUNDARY_TIMESTAMP,
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-24T00:00:00.000Z',
  categoryId: category.id,
  category,
  tags: [tag],
  author: {
    id: 'author-mion',
    name: '미온',
    image: 'https://example.com/mion.png',
  },
  viewCount: 12,
}

const secondaryPost = {
  ...primaryPost,
  id: 'post-seo-runtime-secondary',
  title: '두 번째 SEO 검증 포스트',
  slug: 'seo-runtime-secondary',
  content: '# 두 번째 SEO 검증\n\n이 상세 본문도 홈과 목록 SSR HTML에 포함되면 안 됩니다.',
  excerpt: null,
  publishedAt: '2026-08-22T00:00:00.000Z',
  viewCount: 8,
}

const draftPost = {
  ...primaryPost,
  id: 'post-seo-runtime-draft',
  title: '사이트맵 제외 초안',
  slug: 'seo-runtime-draft',
  published: false,
  publishedAt: null,
}

const postWithJsonLdClosingScriptPayload = {
  ...primaryPost,
  id: 'post-json-ld-closing-script-payload',
  title: JSON_LD_CLOSING_SCRIPT_PAYLOAD,
  slug: 'json-ld-closing-script-payload',
}

function buildSuccessResponse(data, path, meta) {
  return {
    success: true,
    message: 'ok',
    timestamp: new Date().toISOString(),
    path,
    data,
    ...(meta ? { meta } : {}),
  }
}

function buildPostsResponse(url) {
  const page = Number(url.searchParams.get('page') ?? '1')
  const isSitemapQuery =
    url.searchParams.get('published') === 'true' &&
    url.searchParams.get('limit') === '50'
  const isEmptyFilter = url.searchParams.get('search') === 'no-results'
  const clampsOutOfRangePage = url.searchParams.get('search') === 'api-clamps'
  const hasFilter = Boolean(
    url.searchParams.get('search') ||
    url.searchParams.get('categorySlug') ||
    url.searchParams.get('tagSlug'),
  )

  if (isSitemapQuery) {
    const data = page === 1 ? [primaryPost] : [secondaryPost, draftPost]

    return buildSuccessResponse(
      data,
      '/api/posts',
      {
        total: 3,
        limit: 50,
        page,
        hasNext: page < 2,
        hasPrev: page > 1,
        totalPages: 2,
      },
    )
  }

  if (isEmptyFilter) {
    return buildSuccessResponse([], '/api/posts', {
      total: 0,
      limit: 12,
      page,
      hasNext: false,
      hasPrev: page > 1,
      totalPages: 0,
    })
  }

  const hasPaginationScenario = hasFilter && url.searchParams.get('sort') === 'viewCount'
  const totalPages = !hasFilter || hasPaginationScenario ? 2 : 1
  const data = page <= totalPages ? [primaryPost, secondaryPost] : []

  return buildSuccessResponse(data, '/api/posts', {
    total: totalPages === 2 ? 24 : 2,
    limit: 12,
    page: clampsOutOfRangePage && page > totalPages ? 1 : page,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    totalPages,
  })
}

function sendJson(response, status, body) {
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  })
  response.end(payload)
}

function createMockApiServer() {
  return http.createServer((request, response) => {
    if (!request.url) {
      response.writeHead(400).end()
      return
    }

    const url = new URL(request.url, API_BASE_URL)

    const isFailedSitemapPage =
      url.pathname === '/api/posts' &&
      url.searchParams.get('published') === 'true' &&
      Number(url.searchParams.get('page') ?? '1') === failedSitemapPage

    if (failApiRequests || url.pathname === failedApiPathname || isFailedSitemapPage) {
      sendJson(response, 503, {
        success: false,
        message: '의도된 초기 API 준비 지연',
        timestamp: new Date().toISOString(),
        path: url.pathname,
        error: { code: 'SEO_TEST_BOOTSTRAP_DELAY', statusCode: 503 },
      })
      return
    }

    successfulApiRequestCount += 1

    if (url.pathname === '/api/posts') {
      postListRequestCount += 1

      if (url.searchParams.get('search') === 'api-error') {
        sendJson(response, 500, {
          success: false,
          message: '의도된 API 오류',
          timestamp: new Date().toISOString(),
          path: url.pathname,
          error: { code: 'SEO_TEST_ERROR', statusCode: 500 },
        })
        return
      }

      sendJson(response, 200, buildPostsResponse(url))
      return
    }

    const requestedPost =
      url.pathname === `/api/posts/${primaryPost.slug}`
        ? primaryPost
        : url.pathname === `/api/posts/${postWithJsonLdClosingScriptPayload.slug}`
          ? postWithJsonLdClosingScriptPayload
          : null

    if (requestedPost) {
      detailTrackViewValues.push(url.searchParams.get('trackView') ?? 'true')
      sendJson(response, 200, buildSuccessResponse(requestedPost, url.pathname))
      return
    }

    if (url.pathname === '/api/categories') {
      sendJson(response, 200, buildSuccessResponse([category], url.pathname, {
        total: 1,
        limit: 50,
        page: 1,
        hasNext: false,
        hasPrev: false,
        totalPages: 1,
      }))
      return
    }

    if (url.pathname === '/api/tags') {
      sendJson(response, 200, buildSuccessResponse([tag], url.pathname, {
        total: 1,
        limit: 30,
        page: 1,
        hasNext: false,
        hasPrev: false,
        totalPages: 1,
      }))
      return
    }

    if (url.pathname === '/api/site/settings') {
      sendJson(response, 200, buildSuccessResponse({ profileImageUrl: null }, url.pathname))
      return
    }

    response.writeHead(404).end()
  })
}

function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, host, () => {
      server.off('error', reject)
      resolve()
    })
  })
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

function runCommand(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: 'inherit',
    })

    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command} ${args.join(' ')} failed: code=${code} signal=${signal}`))
    })
  })
}

async function waitForApp(url, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.status < 500) {
        return
      }
    } catch {
      // 서버가 준비될 때까지 짧게 재시도합니다.
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error(`Next.js production server did not become ready: ${url}`)
}

async function fetchHtml(path, headers = {}) {
  const response = await fetch(`${APP_BASE_URL}${path}`, {
    headers: { 'User-Agent': 'Googlebot', ...headers },
    redirect: 'manual',
  })
  return { response, html: await response.text() }
}

function assertIncludes(value, expected, context) {
  assert.ok(value.includes(expected), `${context}: missing ${expected}`)
}

function assertExcludes(value, expected, context) {
  assert.ok(!value.includes(expected), `${context}: unexpected ${expected}`)
}

function assertPublicFooter(html, context) {
  assert.equal(
    html.match(/<footer\b[^>]*class="neon-footer"/g)?.length,
    1,
    `${context} 공용 푸터 수`,
  )
  assertIncludes(html, 'aria-label="푸터 네비게이션"', `${context} 푸터 네비게이션`)
  assertIncludes(html, 'href="/terms"', `${context} 이용약관 링크`)
  assertIncludes(html, 'href="/privacy-policy"', `${context} 개인정보처리방침 링크`)
  assertExcludes(html, 'Google로 로그인', `${context} 공용 Google 로그인 버튼`)
}

function extractSerializedJsonLd(html) {
  const match = html.match(
    /<script\b[^>]*\btype="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/,
  )
  assert.ok(match?.[1], '상세 JSON-LD가 없습니다.')
  return match[1]
}

function extractJsonLd(html) {
  return JSON.parse(extractSerializedJsonLd(html))
}

async function assertPng(path) {
  const response = await fetch(`${APP_BASE_URL}${path}`)
  assert.equal(response.status, 200, `${path} status`)
  assert.equal(response.headers.get('content-type'), 'image/png', `${path} content-type`)

  const bytes = Buffer.from(await response.arrayBuffer())
  assert.equal(bytes.readUInt32BE(16), 1200, `${path} width`)
  assert.equal(bytes.readUInt32BE(20), 630, `${path} height`)
}

async function verifyRuntime() {
  const statusResults = []

  const signIn = await fetchHtml('/auth/signin')
  assert.equal(signIn.response.status, 200, '비인증 로그인 status')
  assertIncludes(signIn.html, 'noindex', '로그인 robots')
  assertExcludes(signIn.html, 'rel="canonical"', '로그인 canonical')
  assertExcludes(signIn.html, 'property="og:', '로그인 Open Graph')
  assertExcludes(signIn.html, 'name="twitter:', '로그인 Twitter')
  assertPublicFooter(signIn.html, '로그인')

  const adminSessionToken = await encode({
    token: {
      name: 'SEO 검증 관리자',
      email: 'admin@example.com',
      role: 'ADMIN',
      sub: 'seo-runtime-admin',
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      iat: Math.floor(Date.now() / 1000),
    },
    secret: AUTH_SECRET,
    maxAge: 60 * 60,
  })
  const authenticatedSignIn = await fetchHtml('/auth/signin?callbackUrl=/admin/posts', {
    Cookie: `__Secure-next-auth.session-token=${adminSessionToken}`,
  })
  assert.equal(authenticatedSignIn.response.status, 307, '인증 로그인 redirect status')
  assert.equal(
    authenticatedSignIn.response.headers.get('location'),
    '/admin/posts',
    '인증 로그인 redirect location',
  )

  const internalCallback = new URLSearchParams({
    callbackUrl: '/admin/posts?status=draft#editor',
  })
  const authenticatedInternalCallback = await fetchHtml(
    `/auth/signin?${internalCallback.toString()}`,
    {
      Cookie: `__Secure-next-auth.session-token=${adminSessionToken}`,
    },
  )
  assert.equal(
    authenticatedInternalCallback.response.status,
    307,
    '인증 내부 callback redirect status',
  )
  assert.equal(
    authenticatedInternalCallback.response.headers.get('location'),
    '/admin/posts?status=draft#editor',
    '인증 내부 callback redirect location',
  )

  for (const callbackUrl of [
    'https://attacker.example',
    '//attacker.example',
    '/\\attacker.example',
    '/%5cattacker.example',
    '/%2f%2fattacker.example',
    '/%252f%252fattacker.example',
    '/%255cattacker.example',
    '/\n/attacker.example',
    '/%0a/attacker.example',
  ]) {
    const unsafeCallback = new URLSearchParams({ callbackUrl })
    const authenticatedUnsafeCallback = await fetchHtml(
      `/auth/signin?${unsafeCallback.toString()}`,
      {
        Cookie: `__Secure-next-auth.session-token=${adminSessionToken}`,
      },
    )
    assert.equal(
      authenticatedUnsafeCallback.response.status,
      307,
      `인증 위험 callback redirect status: ${callbackUrl}`,
    )
    assert.equal(
      authenticatedUnsafeCallback.response.headers.get('location'),
      '/admin',
      `인증 위험 callback fallback: ${callbackUrl}`,
    )
  }

  const duplicateCallback = new URLSearchParams()
  duplicateCallback.append('callbackUrl', '/admin')
  duplicateCallback.append('callbackUrl', '//attacker.example')
  const authenticatedDuplicateCallback = await fetchHtml(
    `/auth/signin?${duplicateCallback.toString()}`,
    {
      Cookie: `__Secure-next-auth.session-token=${adminSessionToken}`,
    },
  )
  assert.equal(
    authenticatedDuplicateCallback.response.status,
    307,
    '인증 중복 callback redirect status',
  )
  assert.equal(
    authenticatedDuplicateCallback.response.headers.get('location'),
    '/admin',
    '인증 중복 callback fallback',
  )

  let unavailableHome
  failApiRequests = true
  try {
    unavailableHome = await fetchHtml('/')
  } finally {
    failApiRequests = false
  }
  assert.equal(unavailableHome.response.status, 200, '초기 API 지연 홈 status')
  assertIncludes(unavailableHome.html, '작성 예정', '초기 API 지연 홈 fallback')
  assertExcludes(unavailableHome.html, primaryPost.excerpt, '초기 API 지연 홈 데이터')

  let partialHome
  failedApiPathname = '/api/tags'
  try {
    partialHome = await fetchHtml('/')
  } finally {
    failedApiPathname = null
  }
  assert.equal(partialHome.response.status, 200, '부분 API 지연 홈 status')
  assertIncludes(partialHome.html, primaryPost.excerpt, '부분 API 지연 홈 정상 데이터')

  const fullHomeRequestCount = successfulApiRequestCount
  const home = await fetchHtml('/')
  assert.equal(home.response.status, 200, '홈 status')
  assert.equal(
    successfulApiRequestCount - fullHomeRequestCount,
    4,
    '부분 실패 결과를 캐시하지 않은 뒤 홈 API 요청 수',
  )
  assertIncludes(home.html, `${APP_BASE_URL}/og/blog.png`, '홈 og:image')
  assertIncludes(home.html, 'max-image-preview:large', '홈 Googlebot 미리보기 robots')
  assertIncludes(home.html, '이 블로그에서 다루는 것', '홈 핵심 콘텐츠')
  assertIncludes(home.html, '전체 포스트 보기', '홈 섹션 링크 이름')
  assertIncludes(home.html, 'SEO 런타임 검증 포스트 읽기', '홈 카드 접근성 이름')
  assertIncludes(home.html, primaryPost.excerpt, '홈 excerpt summary')
  assertIncludes(
    home.html,
    `${secondaryPost.title} 글의 핵심 내용을 빠르게 확인해보세요.`,
    '홈 fallback excerpt',
  )
  assertExcludes(
    home.html,
    '이 문장은 홈과 목록 SSR HTML에 노출되면 안 되는 상세 원문입니다.',
    '홈 상세 원문',
  )
  assertExcludes(
    home.html,
    '이 상세 본문도 홈과 목록 SSR HTML에 포함되면 안 됩니다.',
    '홈 fallback 상세 원문',
  )
  const homeJsonLd = extractJsonLd(home.html)
  const homeJsonLdItems = Array.isArray(homeJsonLd) ? homeJsonLd : [homeJsonLd]
  assert.ok(
    homeJsonLdItems.some((item) => item?.['@type'] === 'WebSite'),
    '홈 WebSite JSON-LD',
  )
  assertIncludes(home.html, '2026년 8월 24일', '홈 한국 시간 긴 날짜')
  assertIncludes(home.html, '2026.08.24', '홈 한국 시간 숫자 날짜')
  assertPublicFooter(home.html, '홈')

  const cachedHomeRequestCount = successfulApiRequestCount
  const cachedHome = await fetchHtml('/')
  assert.equal(cachedHome.response.status, 200, '캐시 적중 홈 status')
  assertIncludes(cachedHome.html, primaryPost.excerpt, '캐시 적중 홈 데이터')
  assert.equal(
    successfulApiRequestCount - cachedHomeRequestCount,
    0,
    '성공 결과 캐시 적중 후 홈 API 요청 수',
  )

  const posts = await fetchHtml('/posts')
  assert.equal(posts.response.status, 200, '목록 status')
  assertIncludes(posts.html, `${APP_BASE_URL}/og/blog.png`, '목록 og:image')
  assertIncludes(posts.html, '<meta name="robots" content="index, follow"', '목록 robots')
  assertIncludes(posts.html, `<link rel="canonical" href="${APP_BASE_URL}/posts"`, '목록 canonical')
  assertIncludes(posts.html, primaryPost.excerpt, '목록 excerpt summary')
  assertIncludes(
    posts.html,
    `${secondaryPost.title} 글의 핵심 내용을 빠르게 확인해보세요.`,
    '목록 fallback excerpt',
  )
  assertExcludes(
    posts.html,
    '이 문장은 홈과 목록 SSR HTML에 노출되면 안 되는 상세 원문입니다.',
    '목록 상세 원문',
  )
  assertExcludes(
    posts.html,
    '이 상세 본문도 홈과 목록 SSR HTML에 포함되면 안 됩니다.',
    '목록 fallback 상세 원문',
  )
  assertIncludes(posts.html, `/posts/${primaryPost.slug}`, '목록 상세 링크')
  assertExcludes(posts.html, 'Loading title…', '목록 loading title')
  assertIncludes(posts.html, '2026.08.24', '목록 한국 시간 날짜')
  assertPublicFooter(posts.html, '목록')

  const validFilteredPosts = await fetchHtml('/posts?search=NestJS')
  assert.equal(validFilteredPosts.response.status, 200, '유효 검색 필터 status')
  assertIncludes(validFilteredPosts.html, 'noindex', '유효 검색 필터 robots')
  assertIncludes(
    validFilteredPosts.html,
    `<link rel="canonical" href="${APP_BASE_URL}/posts"`,
    '유효 검색 필터 canonical',
  )

  let unavailableSitemap
  failedApiPathname = '/api/posts'
  try {
    unavailableSitemap = await fetchHtml('/sitemap.xml')
  } finally {
    failedApiPathname = null
  }
  assert.equal(unavailableSitemap.response.status, 500, '초기 API 지연 sitemap status')

  let partialSitemap
  const partialSitemapRequestCount = successfulApiRequestCount
  failedSitemapPage = 2
  try {
    partialSitemap = await fetchHtml('/sitemap.xml')
  } finally {
    failedSitemapPage = null
  }
  assert.equal(partialSitemap.response.status, 500, '2페이지 실패 sitemap status')
  assert.equal(
    successfulApiRequestCount - partialSitemapRequestCount,
    1,
    '2페이지 실패 전 성공한 sitemap API 요청 수',
  )

  const freshSitemapRequestCount = successfulApiRequestCount
  const sitemap = await fetchHtml('/sitemap.xml')
  assert.equal(sitemap.response.status, 200, 'sitemap status')
  assert.equal(
    successfulApiRequestCount - freshSitemapRequestCount,
    2,
    '초기 실패 후 sitemap API 요청 수',
  )
  assertIncludes(sitemap.html, `<loc>${APP_BASE_URL}/</loc>`, 'sitemap 홈 URL')
  assertIncludes(sitemap.html, `<loc>${APP_BASE_URL}/posts</loc>`, 'sitemap 목록 URL')
  assertIncludes(sitemap.html, `<loc>${APP_BASE_URL}/about</loc>`, 'sitemap About URL')
  assertIncludes(sitemap.html, `<loc>${APP_BASE_URL}/terms</loc>`, 'sitemap 이용약관 URL')
  assertIncludes(
    sitemap.html,
    `<loc>${APP_BASE_URL}/privacy-policy</loc>`,
    'sitemap 개인정보처리방침 URL',
  )
  assertIncludes(
    sitemap.html,
    `<loc>${APP_BASE_URL}/posts/${primaryPost.slug}</loc>`,
    'sitemap 발행 포스트 URL',
  )
  assertIncludes(
    sitemap.html,
    `<loc>${APP_BASE_URL}/posts/${secondaryPost.slug}</loc>`,
    'sitemap 2페이지 발행 포스트 URL',
  )
  assertExcludes(
    sitemap.html,
    `<loc>${APP_BASE_URL}/posts/${draftPost.slug}</loc>`,
    'sitemap 초안 포스트 URL',
  )
  assert.equal(sitemap.html.match(/<loc>/g)?.length, 7, 'sitemap 전체 URL 수')

  const cachedSitemapRequestCount = successfulApiRequestCount
  const cachedSitemap = await fetchHtml('/sitemap.xml')
  assert.equal(cachedSitemap.response.status, 200, '캐시 적중 sitemap status')
  assertIncludes(
    cachedSitemap.html,
    `<loc>${APP_BASE_URL}/posts/${primaryPost.slug}</loc>`,
    '캐시 적중 sitemap 발행 포스트 URL',
  )
  assert.equal(
    successfulApiRequestCount - cachedSitemapRequestCount,
    0,
    '성공 결과 캐시 적중 후 sitemap API 요청 수',
  )

  const validPageRequestCount = postListRequestCount
  const validPage = await fetchHtml('/posts?page=2')
  assert.equal(validPage.response.status, 200, '유효 page 2 status')
  assertIncludes(validPage.html, `${APP_BASE_URL}/posts?page=2`, '유효 page 2 canonical')
  assert.equal(
    postListRequestCount - validPageRequestCount,
    1,
    '유효 page 2 metadata와 본문 API 요청 수',
  )

  const emptyFirstPage = await fetchHtml('/posts?search=no-results&page=1')
  assert.equal(emptyFirstPage.response.status, 200, '빈 필터 page 1 status')
  assertIncludes(emptyFirstPage.html, 'noindex', '빈 필터 page 1 robots')

  const apiError = await fetchHtml('/posts?search=api-error&page=1')
  assert.equal(apiError.response.status, 200, 'API 오류 목록 status')
  assertIncludes(apiError.html, '포스트를 불러올 수 없습니다', 'API 오류 화면')

  for (const path of [
    '/posts?page=999',
    '/posts?search=NestJS&page=999',
    '/posts?search=api-clamps&page=999',
    '/posts?categorySlug=development&page=999',
    '/posts?tagSlug=nestjs&page=999',
  ]) {
    const requestCountBefore = postListRequestCount
    const result = await fetchHtml(path)
    statusResults.push({ path, status: result.response.status })
    assert.equal(result.response.status, 404, `${path} status`)
    assertIncludes(result.html, 'noindex', `${path} robots`)
    assertExcludes(result.html, 'content="index, follow"', `${path} index robots`)
    assertExcludes(result.html, 'rel="canonical"', `${path} canonical`)
    assertExcludes(result.html, 'property="og:', `${path} Open Graph`)
    assertExcludes(result.html, 'max-image-preview:large', `${path} preview robots`)
    assert.equal(
      postListRequestCount - requestCountBefore,
      1,
      `${path} metadata와 본문 API 요청 수`,
    )
  }

  const globalNotFound = await fetchHtml('/__seo-missing__')
  assert.equal(globalNotFound.response.status, 404, '전역 404 status')
  assertIncludes(globalNotFound.html, 'noindex', '전역 404 robots')
  assertExcludes(globalNotFound.html, 'content="index, follow"', '전역 404 index robots')
  assertExcludes(globalNotFound.html, 'rel="canonical"', '전역 404 canonical')
  assertExcludes(globalNotFound.html, 'property="og:', '전역 404 Open Graph')
  assertExcludes(globalNotFound.html, 'max-image-preview:large', '전역 404 preview robots')

  const filteredPagination = await fetchHtml(
    '/posts?limit=12&search=NestJS&categorySlug=development&category=legacy-development&tagSlug=nestjs&tag=legacy-nestjs&sort=viewCount&order=desc&sortPreset=viewed&page=1',
  )
  const normalizedFilteredHtml = filteredPagination.html.replaceAll('&amp;', '&')
  assertIncludes(
    normalizedFilteredHtml,
    '/posts?limit=12&search=NestJS&categorySlug=development&category=legacy-development&tagSlug=nestjs&tag=legacy-nestjs&sort=viewCount&order=desc&sortPreset=viewed&page=2',
    '필터 페이지네이션 href',
  )

  const about = await fetchHtml('/about')
  assert.equal(about.response.status, 200, 'About status')
  assertIncludes(about.html, `${APP_BASE_URL}/og/about.png`, 'About og:image')
  assertIncludes(about.html, 'twitter:image', 'About twitter:image')
  assertIncludes(about.html, 'max-image-preview:large', 'About Googlebot 미리보기 robots')
  assertPublicFooter(about.html, 'About')

  for (const { path, title, contentMarker } of [
    { path: '/terms', title: '이용약관', contentMarker: '본 이용약관은' },
    {
      path: '/privacy-policy',
      title: '개인정보처리방침',
      contentMarker: '개인정보 보호책임자',
    },
  ]) {
    const legalPage = await fetchHtml(path)
    assert.equal(legalPage.response.status, 200, `${title} status`)
    assertIncludes(legalPage.html, `>${title}</h1>`, `${title} 제목`)
    assertIncludes(legalPage.html, contentMarker, `${title} 본문`)
    assertExcludes(legalPage.html, '내용 준비 중입니다.', `${title} 준비 안내 제거`)
    assertIncludes(legalPage.html, 'content="index, follow"', `${title} robots`)
    assertIncludes(
      legalPage.html,
      `<link rel="canonical" href="${APP_BASE_URL}${path}"`,
      `${title} canonical`,
    )
    assertPublicFooter(legalPage.html, title)
  }

  const termsPage = await fetchHtml('/terms')
  assertIncludes(termsPage.html, 'href="/privacy-policy"', '이용약관 개인정보처리방침 링크')
  assertIncludes(termsPage.html, 'mailto:contact@mion-space.dev', '이용약관 문의 이메일')

  const privacyPage = await fetchHtml('/privacy-policy')
  assertIncludes(
    privacyPage.html,
    'https://www.cloudflare.com/policies/privacy/',
    '개인정보처리방침 Cloudflare 정책 링크',
  )
  assertIncludes(
    privacyPage.html,
    'https://policies.google.com/privacy?hl=ko',
    '개인정보처리방침 Google 정책 링크',
  )
  assertIncludes(privacyPage.html, 'mailto:contact@mion-space.dev', '개인정보처리방침 문의 이메일')

  detailTrackViewValues.length = 0
  const detail = await fetchHtml(`/posts/${primaryPost.slug}`)
  assert.equal(detail.response.status, 200, '상세 status')
  assertIncludes(
    detail.html,
    `<link rel="canonical" href="${APP_BASE_URL}/posts/${primaryPost.slug}"`,
    '상세 canonical',
  )
  assertExcludes(detail.html, 'noindex', '상세 robots')
  assertIncludes(detail.html, 'max-image-preview:large', '상세 Googlebot 미리보기 robots')
  assertIncludes(detail.html, COVER_URL, '상세 cover metadata')
  assertIncludes(detail.html, '2026.08.24', '상세 한국 시간 날짜')
  assertIncludes(detail.html, '<div class="mdx-content">', '상세 SSR 본문 container')
  const brandLink = detail.html.match(/<a\b[^>]*class="brand"[^>]*>/)?.[0]
  assert.ok(brandLink, '상세 브랜드 링크가 없습니다.')
  assertExcludes(brandLink, 'aria-label=', '상세 브랜드 링크 접근성 이름')
  assertIncludes(detail.html, '<h2 class="post-footer-title">Related Tags</h2>', '상세 태그 제목 단계')
  assertExcludes(detail.html, '<h4 class="post-footer-title">', '상세 태그 h4')
  assertIncludes(detail.html, 'production HTML 본문 검증 문장입니다.', '상세 SSR 본문')
  assertExcludes(detail.html, 'space-y-6 animate-pulse', '상세 loading skeleton')
  const jsonLd = extractJsonLd(detail.html)
  assert.equal(jsonLd.author.url, `${APP_BASE_URL}/about`, '상세 author.url')
  assert.deepEqual(jsonLd.image, [COVER_URL], '상세 JSON-LD cover')
  assert.ok(detailTrackViewValues.includes('false'), '상세 metadata 조회 trackView=false')
  assert.ok(detailTrackViewValues.includes('true'), '상세 본문 조회 trackView=true')
  assertPublicFooter(detail.html, '상세')

  const missingDetail = await fetchHtml('/posts/__missing__')
  assert.equal(missingDetail.response.status, 404, '상세 404 status')
  assertIncludes(missingDetail.html, 'noindex', '상세 404 robots')
  assertExcludes(missingDetail.html, 'content="index, follow"', '상세 404 index robots')
  assertExcludes(missingDetail.html, 'rel="canonical"', '상세 404 canonical')
  assertExcludes(missingDetail.html, 'property="og:', '상세 404 Open Graph')
  assertExcludes(missingDetail.html, 'max-image-preview:large', '상세 404 preview robots')

  const unsafeJsonLdDetail = await fetchHtml(
    `/posts/${postWithJsonLdClosingScriptPayload.slug}`,
  )
  assert.equal(unsafeJsonLdDetail.response.status, 200, 'JSON-LD payload 상세 status')
  assertExcludes(
    unsafeJsonLdDetail.html,
    '<\/script><script id="json-ld-breakout-probe">',
    'JSON-LD script breakout',
  )
  const serializedUnsafeJsonLd = extractSerializedJsonLd(unsafeJsonLdDetail.html)
  assertIncludes(serializedUnsafeJsonLd, '\\u003c/script>', 'JSON-LD escaped closing tag')
  const parsedUnsafeJsonLd = JSON.parse(serializedUnsafeJsonLd)
  assert.equal(
    parsedUnsafeJsonLd.headline,
    JSON_LD_CLOSING_SCRIPT_PAYLOAD,
    'JSON-LD escaped headline round trip',
  )

  await assertPng('/og/about.png')
  await assertPng('/og/blog.png')

  console.log(JSON.stringify({ ok: true, statusResults }, null, 2))
}

const mockApiServer = createMockApiServer()
let nextServer
const isDevMode = process.argv.includes('--dev')
const isServeMode = process.argv.includes('--serve')

const runtimeEnv = {
  ...process.env,
  NEXT_PUBLIC_API_URL: API_BASE_URL,
  NEXT_PUBLIC_SITE_URL: APP_BASE_URL,
  NEXTAUTH_URL: APP_BASE_URL,
  NEXTAUTH_SECRET: AUTH_SECRET,
  ADMIN_EMAIL: 'admin@example.com',
  GOOGLE_CLIENT_ID: 'seo-runtime-google-client-id',
  GOOGLE_CLIENT_SECRET: 'seo-runtime-google-client-secret',
}

try {
  await listen(mockApiServer, API_PORT, API_HOST)
  if (isDevMode || isServeMode) {
    const nextArgs = isDevMode
      ? ['dev', '--turbopack', '--hostname', APP_HOST, '--port', String(APP_PORT)]
      : ['start', '--hostname', APP_HOST, '--port', String(APP_PORT)]
    nextServer = spawn(
      'next',
      nextArgs,
      { env: runtimeEnv, stdio: 'inherit' },
    )
    await waitForApp(`${APP_BASE_URL}/auth/signin`)
    console.log(`SEO ${isDevMode ? 'dev' : 'production'} runtime ready: ${APP_BASE_URL}`)
    await new Promise((resolve) => {
      process.once('SIGINT', resolve)
      process.once('SIGTERM', resolve)
    })
  } else {
    await runCommand('next', ['build', '--webpack'], runtimeEnv)

    nextServer = spawn('next', ['start', '--hostname', APP_HOST, '--port', String(APP_PORT)], {
      env: runtimeEnv,
      stdio: 'inherit',
    })
    await waitForApp(`${APP_BASE_URL}/auth/signin`)
    await verifyRuntime()
  }
} finally {
  if (nextServer && !nextServer.killed) {
    nextServer.kill('SIGTERM')
  }
  if (mockApiServer.listening) {
    mockApiServer.closeAllConnections()
    await closeServer(mockApiServer)
  }
}
