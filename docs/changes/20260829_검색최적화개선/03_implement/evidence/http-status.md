# Production HTTP 검증

- 검증일: 2026-08-30 (Asia/Seoul)
- 기준 HEAD: `73d5dec01662af39c498ef0904db925710599536`
- 검증 대상: 위 HEAD에 현재 작업 트리의 SEO 변경을 더한 상태(미커밋)
- 환경: Node.js `24.9.0`, Next.js `16.3.3`, Webpack production build
- 명령: `pnpm --filter blog-web verify:seo:runtime`
- 결과: 통과
- Playwright E2E: 2026-08-30 사용자 지시에 따라 테스트·설정·명령 제거

## 상태코드

| URL | 기대 | 결과 |
| --- | --- | --- |
| `/posts?page=999` | 404 + `noindex` | 통과 |
| `/posts?search=NestJS&page=999` | 404 + `noindex` | 통과 |
| `/posts?search=api-clamps&page=999` (API가 응답 `meta.page`를 1로 보정) | 404 + `noindex` | 통과 |
| `/posts?categorySlug=development&page=999` | 404 + `noindex` | 통과 |
| `/posts?tagSlug=nestjs&page=999` | 404 + `noindex` | 통과 |
| `/posts?page=2` | 200 + self-canonical | 통과 |
| `/posts?search=no-results&page=1` | 200 + 빈 결과 + `noindex` | 통과 |
| `/posts?search=api-error&page=1` | 200 + 오류 화면 | 통과 |
| `/posts?search=NestJS` | 200 + `noindex` + canonical `/posts` | 통과 |

## 함께 확인한 계약

- 비인증 `/auth/signin`: 200, `noindex`, canonical·Open Graph·Twitter 없음
- 인증 `/auth/signin?callbackUrl=/admin/posts`: 307, `/admin/posts`로 redirect
- 인증 로그인 내부 callback: query와 hash를 포함한 `/admin/posts?status=draft#editor`를 그대로 유지
- 인증 로그인 위험 callback: 외부 URL, protocol-relative, backslash, 단일·이중 인코딩, 개행, 중복 파라미터를 모두 `/admin`으로 fallback
- 홈·목록: `/og/blog.png` Open Graph·Twitter metadata
- 홈: `WebSite` JSON-LD와 excerpt·fallback summary는 포함하고 상세 원문은 제외
- 목록: excerpt·fallback summary는 포함하고 상세 원문은 제외
- 목록 초기 HTML: 실제 상세 링크 포함, loading title 없음
- About: `/og/about.png` Open Graph·Twitter metadata
- 이미지: 두 PNG 모두 HTTP 200, `image/png`, 1200×630
- 날짜: UTC 자정 경계 입력이 홈·목록·상세에서 2026-08-24 한국 날짜로 표시됨
- 페이지네이션: `limit`, `search`, `categorySlug`·legacy `category`, `tagSlug`·legacy `tag`, `sort`, `order`, `sortPreset`을 유지한 page 2 anchor 존재
- 사이트맵: 홈·목록·About·발행 포스트 URL 포함, 초안 포스트 URL 제외
- 상세 SSR: canonical·본문·JSON-LD가 초기 HTML에 있고 loading skeleton·`noindex` 없음
- 상세 조회: metadata 조회는 `trackView=false`, 본문 조회는 기존 `trackView=true` 계약 유지
- JSON-LD 보안: `</script>` payload가 `\\u003c/script>`로 직렬화되며 script breakout 없음
- 상세: fixture cover의 Open Graph·Twitter·JSON-LD 유지, `author.url`이 `/about`; 운영 게시물 cover는 코드 경로만 대조했고 실제 운영 응답은 미확인

## 미확인

- 배포된 운영 URL의 상태와 소셜 플랫폼 캐시는 이번 로컬 검증에 포함하지 않았다.
- 실제 CrUX 현장 데이터와 Google Rich Results Test 9개 전체 검증은 배포 후 확인 대상이다.

## 2026-08-30 잔여 항목 후속 검증

- 기준 HEAD: `20b47c267d3971794710b0c534c94d083f4e0bc0`에 현재 미커밋 후속 변경을 더한 작업 트리
- Webpack production build에서 홈 route가 요청 시 렌더링(`ƒ`)으로 확인됐다.
- 홈 mock API 전체 503 요청은 fallback을 반환하되 캐시하지 않았고, 다음 요청에서 정상 데이터를 즉시 반환했다.
- 한 리소스만 실패한 부분 결과도 캐시하지 않았고, 다음 완전 성공 요청은 네 API를 다시 호출했다. 이후 성공 캐시 적중 요청의 mock API 추가 호출은 0회였다.
- 유효 page 2와 기본·검색·보정·카테고리·태그 범위 초과 URL에서 metadata와 본문이 공유한 목록 API 요청은 각각 1회였다.
- 전역·상세·목록 범위 초과 404는 404·`noindex`이고 `index, follow`·canonical·Open Graph·큰 미리보기 robots가 없었다.
- 홈·About·유효 상세는 Googlebot `max-image-preview:large` 지시를 유지했다.
- `pnpm --filter blog-web exec node scripts/verify-seo-runtime.mjs` 최종 종료 코드는 0이었다.

## 2026-08-30 운영 sitemap 후속

- merge commit `bdf37a13e063f9ea6848b6cde81b91587c45412b` 배포 직후 sitemap이 정적 route 3개만 포함한 fallback을 300초 캐시했고, 2026-08-30 22:23:30 +0900 첫 stale 응답 뒤 재검증되어 22:23:44 +0900부터 공개 글 9개를 포함한 12개 URL로 복구됐다.
- 후속 구현은 sitemap route를 요청 시 생성하고, 게시글 전체 조회가 성공한 결과만 300초 캐시한다. API 실패나 일부 페이지만 조회된 결과는 캐시하지 않고 오류 응답을 반환한다.
- 로컬 production 검증은 초기 API 실패와 2페이지 실패의 오류 응답, 다음 요청의 정적 3개와 fixture 게시글 2개를 포함한 5개 URL 전체 복구, 이후 성공 캐시 적중 시 API 추가 호출 0회를 확인했다. 실제 운영 URL 수는 배포 후 별도로 확인한다.
