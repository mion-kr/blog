# 검색 최적화 개선 구현 계획

## 결론

- 구현 방향: API·DB를 건드리지 않고 Next.js route 계층과 presentation 계층에서 10개 결정사항을 최소 변경한다.
- 실행 방식: 공유 파일 충돌과 원인 혼선을 피하기 위해 아래 8개 작업을 순서대로 구현하고, 각 작업의 표적 검증이 통과한 뒤 다음 작업으로 진행한다.
- 완료 조건: 로컬 완료는 변경 명세의 로컬 자동·수동 검증과 WCAG 2.2 AA 영향 범위 감사가 완료되고 목록 초과 URL이 production 서버에서 실제 HTTP 404인 상태다. 운영 완료는 별도 승인 후 같은 배포의 모바일 Lighthouse LCP 3회 중앙값 2.5초 이하와 외부 SEO 검증까지 마친 상태다.
- 주요 리스크: Next.js metadata 상속 제거 방식, 목록 fixture의 현재 모순, sticky UI의 초점 가림, 네온 그라데이션의 대비 수동 판정, 외부 이미지 응답 지연, Lighthouse 변동성이다.

## 근거

- 기준 명세: `docs/specs/seo/spec.md`는 현재 없음
- 변경 명세: `docs/changes/20260829_검색최적화개선/specs/seo/spec.md`
- 인터뷰: `docs/changes/20260829_검색최적화개선/01_interview/`
- 설계: `docs/changes/20260829_검색최적화개선/02_design/`
- 관련 코드: `apps/blog-web/app`, `apps/blog-web/components`, `apps/blog-web/lib`, `apps/blog-web/scripts`
- 관련 API·DB: 변경 없음. 기존 `GET /api/posts`의 pagination meta를 소비한다.
- 미확인 자료: 관련 Linear 이슈, 배포 커밋 일치 여부, 실제 CrUX 현장 데이터

## 범위

### 포함

- `/auth/signin`의 검색·소셜 metadata 격리
- 기본·검색·카테고리·태그 목록의 실제 마지막 page 초과 404
- 공개 게시일의 `Asia/Seoul` 표시
- About 전용 이미지와 홈·목록 공통 이미지 생성·연결
- 상세 글 `BlogPosting.author.url`
- query 보존 페이지네이션 링크
- 링크 이름과 WCAG 2.2 AA 영향 범위 감사, 확인된 focus·대비·포인터 대상 실패의 최소 보강
- 모바일 홈 LCP 병목 측정과 확인된 원인에 대한 최소 최적화

### 제외

- 인증 callback, API·DTO·DB·저장 시각 변경
- 기존 게시물 9개의 cover 교체
- 동적 `ImageResponse`, sitemap 이미지 확장, 새 분석 서비스·성능 의존성 추가
- 인증 후 관리자 화면과 외부 Google 인증 제공자 화면의 WCAG 2.2 AA 적합성, 홈 외 route의 별도 성능 목표
- PR·병합·배포·Search Console 색인 요청과 외부 소셜 캐시 삭제

### 유지할 기존 동작

- 로그인 직접 접근과 Google 인증
- page 1의 정상 빈 상태와 API 오류 화면
- 유효 목록 page의 self-canonical, 검색·필터 URL의 noindex
- 원본 UTC `dateTime`, 게시물 cover 우선 정책, 핵심 네온 콘텐츠·레이아웃

## 실행 전 조건

- 현재 브랜치와 커밋을 다시 확인하고 사용자 변경이 있으면 이 문서의 파일 후보와 충돌 여부를 재평가한다.
- 현재 의존성은 설치되어 있다. 실행 시점에 `node_modules`가 없다면 저장소 표준 명령 `pnpm install`을 사용하고 lockfile의 예상 밖 변경을 별도 검토한다.
- 실제 코드 변경 단계에서는 `next-dev-loop`로 Next.js runtime과 브라우저 양쪽을 확인한다.
- 이미지 생성 단계에서는 `imagegen`을 사용하고 생성 파일을 직접 열어 해상도·잘림·문구 오류를 확인한다.

## 작업 순서

### 1. Node 기반 production HTTP 검증 기준선 정리

- [x] `apps/blog-web/scripts/verify-seo-runtime.mjs`에 Node HTTP mock API와 production route 검증기를 작성한다.
- [x] page 2가 유효하다는 Node fixture에는 `totalPages >= 2`를 반환한다.
- [x] page 999, 빈 filter page 1, API 오류 fixture를 서로 구분한다.
- [x] 실제 `next build --webpack`과 `next start`를 사용해 SSR summary·canonical·filter noindex·HTTP status를 확인한다.
- [x] 기존 Playwright 테스트·설정·명령·직접 개발 의존성을 2026-08-30 사용자 지시에 따라 제거했다.

완료 게이트: 테스트가 실제 API pagination 의미와 모순되지 않고, 후속 404 구현 실패를 정확히 잡을 수 있어야 한다.

### 2. 로그인 metadata와 목록 404

- [x] `apps/blog-web/app/(site)/auth/signin/page.tsx`에 route-level `Metadata`를 추가한다.
- [x] `robots.index`를 false로 두고 leaf metadata에서 홈 canonical·Open Graph·Twitter 상속을 제거한다. `nofollow`는 기존 관리자 layout 관례를 따르는 기술 선택으로 적용하되 별도 제품 요구사항으로 확대하지 않는다.
- [x] `apps/blog-web/app/(site)/posts/page.tsx`에서 성공한 기존 fetch의 정규화된 meta만 사용해 `page > 1 && page > totalPages`에 `notFound()`를 호출한다.
- [x] metadata와 본문이 query key 기반 React `cache` loader를 공유해 실제 API 요청을 한 번만 수행하고, API 실패는 기존 오류 화면으로 유지한다.
- [x] 비인증 로그인 200·인증 로그인 redirect·callback 회귀, 최종 head 태그, 기본·filter 목록의 200/404/noindex를 검증한다.
- [x] build 후 production 서버에 직접 HTTP 요청해 범위 초과 응답의 status가 실제 404인지 확인한다. development not-found 화면이나 `noindex`만으로 완료 판정하지 않는다.

완료 게이트: 비인증 `/auth/signin` 최종 HTML에 `noindex`가 있고 홈 canonical·`og:*`·`twitter:*`가 없으며, 범위 초과 목록만 production HTTP 404여야 한다.

### 2-1. 2026-08-30 잔여 SEO·접근성·초기 캐시 후속

- [x] 루트에는 홈 전용 canonical·Open Graph·Twitter·`index, follow`를 두지 않고 공개 유효 route가 각자 metadata를 소유한다. 홈·About·상세의 Googlebot 큰 미리보기 지시는 leaf metadata로 유지한다.
- [x] 전역·목록 범위 초과 404는 공통 `main#main` UI를 사용하고 Next.js 자동 `noindex`만 남긴다. 홈 canonical·Open Graph·큰 미리보기 robots는 노출하지 않는다.
- [x] 브랜드 링크의 보이는 이름과 접근성 이름을 일치시키고 상세 태그 제목을 `h2`로 바꾼다.
- [x] 홈은 빌드 시 빈 fallback을 정적 생성하지 않도록 요청 시 렌더링하고, 네 API가 모두 성공한 결과만 300초 데이터 캐시에 저장한다. 전체·부분 실패 결과는 해당 요청에만 표시하고 캐시하지 않는다.
- [x] production 검증에서 전체 실패 후 즉시 복구, 부분 실패 후 완전 복구, 성공 캐시 적중 시 mock API 추가 호출 0회, 목록 metadata·본문의 API 요청 1회를 확인한다.
- [x] sitemap은 요청 시 생성하고 게시글 전체 조회가 성공한 결과만 300초 캐시한다. 초기·2페이지 실패는 오류 응답으로 검색봇 재시도를 유도하며 다음 요청의 전체 복구, 100페이지 상한의 부분 결과 방지, 성공 캐시 API 추가 호출 0회를 확인한다.

이 변경은 LCP 최적화를 재개하지 않는다. 요청 시 렌더링 전환의 배포 후 TTFB·CrUX·LCP 영향은 이번 로컬 완료 판정에 포함하지 않는다.

### 3. KST 날짜와 작성자 구조화 데이터

- [x] `apps/blog-web/lib/date-format.ts`에 `timeZone: 'Asia/Seoul'`을 고정한 순수 formatter를 추가한다.
- [x] 홈의 긴 날짜·월일·짧은 날짜, 목록 카드 날짜, 상세 날짜를 helper로 교체한다.
- [x] `apps/blog-web/components/post-card.tsx`의 공개 사용처를 다시 검색했고 현재 미사용이라 변경하지 않았다.
- [x] 원본 저장 시각과 `<time dateTime>`의 ISO 값은 바꾸지 않는다.
- [x] `buildPostJsonLd()`의 `author.url`에 `${siteUrl}/about`을 추가한다.
- [x] Node 검증기의 대표 상세 fixture에 cover URL을 넣고 UTC 자정 경계와 JSON-LD를 검증한다.
- [x] 대표 상세의 `og:image`, `twitter:image`, JSON-LD `image`, `author.url === ${SITE_URL}/about`을 각각 assert한다.

완료 게이트: 같은 timestamp가 홈·목록·상세에서 같은 한국 날짜로 표시되고 hydration 오류가 없으며, 상세 JSON-LD의 기존 필드와 cover가 유지돼야 한다.

### 4. 공유 이미지와 route metadata

- [x] `apps/blog-web/public/og/about.png`를 1200×630 PNG로 생성한다. 2D 애니메이션 스타일의 귀여운 남자 개발자이며 실제 인물·미확정 로고·경력을 넣지 않는다.
- [x] `apps/blog-web/public/og/blog.png`를 1200×630 PNG로 생성한다. 기존 다크·네온 테마의 공통 블로그 브랜드 이미지로 만들고 특정 게시물 cover처럼 보이지 않게 한다.
- [x] 두 파일을 직접 열어 크기, 비율, 글자 깨짐, safe area를 확인한다.
- [x] 홈과 목록 metadata에 `/og/blog.png`의 Open Graph·Twitter 이미지를 명시한다.
- [x] About에 현재 `/og/about.png` Open Graph를 유지하고 About 전용 Twitter metadata를 추가한다.
- [x] 이미지와 metadata를 같은 변경 단위로 검증하며 상세 route의 기존 cover 우선 정책을 회귀 확인한다.

완료 게이트: 두 URL이 200·`image/png`·1200×630이고 홈·목록·About head 및 대표 상세 head가 각 이미지 계약과 일치해야 한다.

### 5. 실제 링크 페이지네이션

- [x] `PostsContent`에 현재 `URLSearchParams` 전체를 복사하고 page만 바꾸는 href builder를 추가한다.
- [x] `PostsPagination`의 사용 가능한 이전·다음·번호를 Next.js `Link`로 바꾸고 `scroll={false}`를 유지한다.
- [x] 현재 page는 `aria-current="page"`인 비링크, 사용할 수 없는 이전·다음은 `aria-disabled="true"`인 비링크로 둔다.
- [x] `limit`, `search`, `categorySlug`·legacy `category`, `tagSlug`·legacy `tag`, `sort`, `order`, `sortPreset` 보존을 확인했다. `sortPreset`은 API `PostsQuery`·DTO에 추가하지 않고 UI URL 상태로만 유지한다.
- [x] 검색·정렬·filter 변경의 기존 `router.push`와 page 1 reset은 유지한다.

완료 게이트: JavaScript 실행 전 HTML에 유효 anchor href가 있고 새 탭·주소 복사가 가능하며, 이동 후 목록 데이터·canonical·robots가 URL과 일치해야 한다.

### 6. 링크 이름과 WCAG 보강

- [x] 홈 섹션 링크를 `전체 포스트 보기` 등 목적이 드러나는 보이는 문구로 바꾼다.
- [x] 추천·최근 카드의 `읽기` 링크에 글 제목을 포함한 접근성 이름을 제공한다.
- [x] 홈 푸터 링크에 밑줄 등 색상 외 구분과 기존 hover·focus-visible을 함께 유지한다.
- [x] 공개 홈·글 목록·About·대표 글 상세·공개 404와 `/auth/signin`을 데스크톱·390×844·320×844에서 열고 route별 자동 검사 결과를 기록했다. 실행 도구·버전·태그를 남겼고 자동 미판정을 수동 근거와 분리했다.
- [x] 각 route의 키보드 초점 가능 요소를 순서대로 이동해 초점 표시와 이름을 확인했다. sticky header 뒤에 완전히 가린 skip link만 z-index 101로 최소 수정했다.
- [x] 포인터 대상을 요소별로 측정했다. 홈 링크 3개만 24px로 보정하고, 나머지 작은 대상은 인라인·focus 전 숨김 예외를 기록했으며 44×44를 일괄 적용하지 않았다.
- [x] 네온 그라데이션·가상 요소 때문에 자동 판정하지 못한 대비 대상은 CSS 전경·배경 합성을 수동 계산했다. 최저 일반 텍스트 대비는 4.92:1이며 자동 미판정과 수동 통과를 분리 기록했다.
- [x] 각 route를 320×844로 열어 성공 기준 1.4.10 Reflow를 확인했다. header wrap과 목록 최소 너비를 실패 선택자에만 보정한 뒤 `scrollWidth`, bounding box, screenshot에서 잘림이 없음을 확인했다.
- [x] 1.4.3, 1.4.10, 1.4.11, 2.4.3, 2.4.7, 2.4.11, 4.1.2와 WCAG 2.2 신규 영향 기준을 6개 route별로 통과·해당 없음·외부 미확인으로 기록했다.
- [x] 성공 기준 2.5.7의 drag-only 상호작용, 3.2.6의 반복 도움말, 3.3.7의 반복 입력, 3.3.8의 로컬 인지 기능 검사 유무를 코드와 브라우저에서 확인했다.
- [x] WCAG 2.2 후속 감사에서 재현된 실패 선택자만 수정하고 새 메뉴·전역 44px·새 테스트 프레임워크는 추가하지 않았다.

완료 게이트: `evidence/accessibility.md`의 route × 성공 기준 표에 320px Reflow, 자동 검사, 초점 가림, 포인터 대상 근거, 대비, 해당 없음과 외부 미확인이 기록되고, 확인된 로컬 실패가 남아 있지 않아야 한다. 인증 후 관리자 화면과 외부 Google 화면은 전체 적합성 판정에서 제외한다.

### 7. 모바일 홈 LCP 측정·최적화

- [ ] 대상 URL `/`, 같은 커밋, Lighthouse navigation mode·Mobile preset·cold cache·simulated throttling을 고정하고 변경 전과 각 후보 변경 후 3회 측정한다.
- [x] 로컬 production은 agent-browser 버전, 기준 커밋, viewport, 각 실행의 LCP 밀리초, 정렬 후 가운데 값과 LCP element를 `03_implement/evidence/mobile-lcp.md`에 기록한다.
- [ ] 배포 후 Lighthouse·PageSpeed를 실행할 때 보고서의 네트워크·CPU 설정과 원본 JSON·HTML·trace를 별도 보관한다.
- [ ] LCP가 추천 이미지이면 `sizes`, 실제 표시 크기, Next image 최적화 응답, 원격 latency·cache를 먼저 확인한다.
- [ ] route별 CSS/JS coverage로 소유권을 확인한 렌더 차단·미사용 자원만 제거하거나 지연한다.
- [ ] trace에서 영향을 확인했을 때만 비핵심 애니메이션을 축소하고 `prefers-reduced-motion`을 보강한다.
- [x] 로컬 production 참고 측정 중앙값이 124ms여서 근거 없는 성능 후보 변경은 적용하지 않았다. 운영 Lighthouse 수용 기준은 미검증이다.

완료 게이트: 같은 배포 커밋·URL·모바일 조건의 유효 실행 3회 LCP `numericValue` 중앙값이 `2500ms` 이하여야 한다. CLS·TBT는 보조 회귀 지표로 기록하고 악화 시 원인을 검토하되 사용자 확정 수용 기준으로 표현하지 않는다. CrUX 부족은 별도로 명시한다.

### 8. 통합 검증과 실행 인계

- [x] 타입 검사, 린트, production build와 Node 기반 production HTTP 검증을 순서대로 실행한다. Playwright E2E 구성은 제거했다.
- [x] `next-dev-loop`로 `/`, `/posts`, 유효·초과·filter URL, `/about`, 대표 `/posts/[slug]`, `/auth/signin`을 확인한다.
- [x] Node 검증기가 page-aware mock API, `next build --webpack`, `next start`를 순서대로 기동해 기본·검색·카테고리·태그 초과 URL의 실제 HTTP 404와 `noindex`를 검증한다.
- [x] production HTTP status와 head 결과를 `03_implement/evidence/http-status.md`에 URL별로 기록한다.
- [x] head, 상태코드, 사이트맵 발행·초안 필터, 상세 SSR, JSON-LD script 탈출 방지, 이미지 응답과 responsive UI를 확인한다.
- [ ] 배포가 별도 승인되면 대상 브랜치 PR 병합과 기존 CI/CD만 사용하고 배포 커밋 일치를 확인한다.
- [ ] 배포 후 sitemap의 공개 글 9개 전체를 Google Rich Results Test로 검사하고, PageSpeed·실제 모바일·소셜 preview를 각각 별도 증거로 기록한다.

완료 게이트: 실패한 검증과 미실행 검증이 분리 기록되고, 구현 결과가 변경 명세의 각 항목에 추적돼야 한다. 로컬 구현 검증 완료와 배포 후 운영 검증 완료는 별도 상태로 기록한다.

## 변경 파일 후보

| 파일 | 변경 목적 | 선행 조건 | 주의점 |
| --- | --- | --- | --- |
| `apps/blog-web/app/(site)/auth/signin/page.tsx` | noindex와 상속 metadata 제거 | 작업 1 | callback·직접 접근 유지 |
| `apps/blog-web/app/(site)/posts/page.tsx` | 범위 초과 404, 목록 공유 metadata | 작업 1, 이미지 준비 | API 오류를 404로 바꾸지 않음 |
| `apps/blog-web/lib/date-format.ts` | KST 날짜 formatter | 없음 | 출력 형식별 helper를 명시 |
| `apps/blog-web/app/(site)/page.tsx` | KST, 공유 metadata, 링크 이름, LCP 후보 | 작업 3·4 | 여러 주제가 공유하므로 순차 편집 |
| `apps/blog-web/app/(site)/posts/posts-content.tsx` | KST와 page href 생성 | 작업 3 | filter·sort query 보존 |
| `apps/blog-web/app/(site)/posts/posts-filter.tsx` | 필터 묶음의 이름·역할 연결 | WCAG 4.1.2 감사 | 필터 동작 유지 |
| `apps/blog-web/app/(site)/posts/posts-pagination.tsx` | button을 link로 전환 | href 계약 | current·disabled는 비링크 |
| `apps/blog-web/app/(site)/posts/[slug]/page.tsx` | KST와 `author.url` | 작업 3 | 기존 cover JSON-LD 유지 |
| `apps/blog-web/app/(site)/posts/[slug]/not-found.tsx` | 상세 404 skip link 대상 연결 | 2.4.3·2.4.7 감사 | 기존 404 문구·링크 유지 |
| `apps/blog-web/components/post-card.tsx` | 공개 사용 시 KST 통일 | 사용처 재확인 | 현재 미사용이면 수정하지 않음 |
| `apps/blog-web/app/(site)/about/page.tsx` | About Twitter metadata | 이미지 준비 | Open Graph URL 유지 |
| `apps/blog-web/public/og/about.png` | About 공유 자산 | 이미지 생성·QA | metadata와 함께 반영 |
| `apps/blog-web/public/og/blog.png` | 홈·목록 공유 자산 | 이미지 생성·QA | 게시물 cover와 분리 |
| `apps/blog-web/app/(site)/home-neon-grid.module.css` | 링크·target과 trace가 지목한 경우의 LCP 보정 후보 | 접근성·운영 trace | 실패·병목이 없으면 수정하지 않음 |
| `apps/blog-web/app/(site)/posts/posts-neon-grid.module.css` | 페이지네이션 target | link 구조 확정 | 모바일 overflow 확인 |
| `apps/blog-web/app/(site)/about/about-neon-grid.module.css` | 재현된 focus·target 실패 보정 후보 | WCAG 2.2 브라우저 감사 | 실패가 없으면 수정하지 않음 |
| `apps/blog-web/app/(site)/posts/[slug]/post-detail-neon-grid.module.css` | 재현된 focus·target 실패 보정 후보 | WCAG 2.2 브라우저 감사 | 실패가 없으면 수정하지 않음 |
| `apps/blog-web/app/layout.tsx` | sticky header에 가린 공통 skip link 보정 | 2.4.11 재현 | 전역 렌더 영향, 관리자 적합성은 미확인 |
| `apps/blog-web/app/globals.css` | 공통 focus-visible 회귀 보정 후보 | 여러 route의 동일 실패 재현 | 전역 변경은 마지막 수단 |
| `apps/blog-web/scripts/verify-seo-runtime.mjs` | mock API, production HTTP 404, metadata, href, KST, JSON-LD, asset 검증 | production build | Node 표준 API만 사용 |

## 요구사항 추적

| 변경 요구사항 | 구현 작업·파일 | 검증 | 배포·롤백 |
| --- | --- | --- | --- |
| 로그인 노출 제외 | 작업 2, signin page | 비인증 200·인증 redirect·noindex·head·callback | leaf metadata revert |
| 범위 초과 404 | 작업 1~2, posts page/runtime script | 기본·filter 200/404/noindex | `notFound` 조건 revert |
| 한국 시간 | 작업 3, helper와 3 route | UTC 경계·hydration | helper import revert |
| About 이미지 | 작업 4, about asset/page | 이미지 응답·head·시각 QA | 자산과 metadata 동시 revert |
| 홈·목록 공통 이미지 | 작업 4, blog asset/home/posts | head·상세 cover 회귀 | 자산과 metadata 동시 revert |
| 작성자 URL | 작업 3, detail page | JSON-LD·Rich Results | author 필드 revert |
| 크롤 가능한 pagination | 작업 5, content/pagination | DOM href·query·navigation | 이전 button 구조 revert |
| 설명적 링크 이름 | 작업 6, home page | role/name | 문구·aria 변경 revert |
| WCAG 2.2 AA 영향 범위 감사 | 작업 6, 공개 route와 로그인·조건부 route CSS | route별 자동 진단·2.4.11 초점 가림·2.5.8 크기/간격/예외·대비·신규 기준 적용 여부 | 실제 실패에 적용한 route-local CSS만 revert |
| 홈 LCP 2.5초 | 작업 7, trace가 지목한 파일 | 3회 LCP 중앙값·보조 CLS/TBT·시각 QA | 효과 없는 후보별 revert |

## API·DTO

- 엔드포인트: 신규·변경 없음. 기존 `GET /api/posts`를 그대로 사용한다.
- 요청·응답: 필드, required·optional·nullable·default 변경 없음.
- 오류: 프론트 route가 성공 응답의 `totalPages`를 해석해 404를 반환하며 API 오류는 기존 오류 UI로 유지한다.
- 하위 호환성: query parameter와 API pagination 계약을 유지한다.

## 데이터베이스와 정합성

- 테이블·컬럼·제약·인덱스·migration·data backfill: 모두 없음.
- 트랜잭션·락·동시성: 적용 대상 없음.
- 재시도·중복 요청: 목록 404 판정을 위해 새 API 요청을 만들지 않는다. 홈의 기존 retry 정책은 유지한다.
- rollback: 코드와 정적 자산만 되돌리며 데이터 원복은 없다.

## 병렬 실행 경계

| 작업 | 쓰기 범위 | 공통 계약 | 병렬 가능 여부 |
| --- | --- | --- | --- |
| 1~2 목록 기준·404 | posts page/runtime script | pagination meta | 순차 |
| 3 날짜·author | home/posts/detail/helper | KST와 JSON-LD | 순차 |
| 4 이미지·metadata | assets/home/posts/about | URL·1200×630 | 자산 생성만 병렬 가능, 통합은 순차 |
| 5 pagination | posts-content/posts-pagination 및 HTTP·브라우저 증거 | query href | 순차 |
| 6 접근성 | 공개 route·로그인/CSS/브라우저 증거 | WCAG 2.2 AA 영향 범위·링크 이름 | 작업 5 이후 순차 |
| 7 성능 | trace가 지목한 파일 | 동일 측정 조건 | 모든 기능 변경 후 순차 |
| 8 통합 검증 | 전체 변경 파일 | 변경 명세 | 마지막에 순차 |

같은 파일을 여러 작업이 공유하므로 전체 구현을 병렬 분할하지 않는다. 자산 생성만 별도 작업으로 진행할 수 있으나 metadata 연결 전에 결과를 검수한다.

## 검증 명령과 증거

### 자동 검증

```bash
pnpm --filter blog-web check-types
pnpm --filter blog-web lint
pnpm --filter blog-web exec node scripts/verify-seo-runtime.mjs
```

- Playwright E2E 테스트·설정·명령·직접 개발 의존성은 사용자 지시에 따라 제거했다.
- 이미지 dimensions와 MIME은 파일 검사와 runtime HTTP 응답을 모두 남긴다.
- Next.js runtime 오류와 browser console·hydration 오류를 별도로 확인한다.

WCAG 브라우저 감사는 production HTTP 검증과 분리해 mock 개발 서버를 열고, `agent-browser 0.31.1` 이상에서 버전에 맞는 사용법을 먼저 읽은 뒤 작업트리 전용 세션으로 수행한다. 아래 route를 데스크톱·390×844·320×844에서 실행하고 실제 실행 명령·axe 버전·태그·JSON 결과를 증거 문서에 기록한다.

터미널 A에서 개발 서버를 실행하고 종료할 때까지 유지한다.

```bash
pnpm --filter blog-web exec node scripts/verify-seo-runtime.mjs --dev
```

터미널 B에서 브라우저 감사를 실행한다. `--dev` 서버의 고정 주소는 `http://127.0.0.1:3200`이다.

```bash
agent-browser skills get core
agent-browser --version
SEO_WCAG_SESSION="$(agent-browser session id --scope worktree --prefix seo-wcag22)"
agent-browser --session "$SEO_WCAG_SESSION" --restore open http://127.0.0.1:3200/
agent-browser --session "$SEO_WCAG_SESSION" --restore a11y --tags wcag2a,wcag2aa,wcag22aa --json
agent-browser --session "$SEO_WCAG_SESSION" --restore set viewport 390 844
agent-browser --session "$SEO_WCAG_SESSION" --restore set viewport 320 844
agent-browser --session "$SEO_WCAG_SESSION" --restore close
```

- 대상 route: `/`, `/posts`, `/about`, 대표 `/posts/seo-runtime-post`, 상세 404 `/posts/__missing__`, `/auth/signin`
- viewport 변경, route 이동, 키보드 순회, 포인터 geometry 측정은 같은 세션에서 수행한다.
- Reflow는 `document.documentElement.scrollWidth`만 보지 않고 visible·focusable 요소의 bounding box와 정보·기능 손실을 함께 확인한다. `overflow-x: hidden`이 실제 잘림을 숨기는지 점검한다.
- `agent-browser a11y`에 없는 성공 기준은 DOM·코드·키보드 수동 검사로 판정하고 자동 통과로 대신하지 않는다.
- `/_next/mcp`의 `tools/list`, `get_compilation_issues`, `get_routes`, `get_errors`를 함께 확인해 브라우저 결과와 Next.js runtime 결과를 교차 검증한다.

### Production HTTP 404 검증

Node 검증기는 실행별 고유 localhost port에 page-aware mock을 기동해 빌드 캐시 키를 분리하고, 같은 URL로 production build 후 app port `3200`에서 `next start`를 실행한다.

- 표준 `fetch()`로 `/posts?page=999`와 검색·카테고리·태그별 초과 URL에 실제 HTTP 요청하고 `status === 404`, HTML `noindex`를 assert한다. 이는 production server에 대한 실제 HTTP probe이며 dev-mode not-found UI 검사와 분리한다.
- 유효 page 2는 200·self-canonical, 빈 filter page 1은 200으로 함께 확인해 오404를 방지한다.
- URL별 status·robots 결과와 실행 커밋을 `03_implement/evidence/http-status.md`에 기록한다.

### 수동 검증

- Desktop, 390×844, 320×844에서 홈·목록·About·대표 상세·상세 404 `/posts/__missing__`·로그인의 UI와 head를 확인한다.
- 키보드만으로 각 route의 초점 가능 요소를 순회하고 초점 표시·접근성 이름·sticky UI에 의한 완전 가림 여부를 확인한다.
- 390×844에서 각 포인터 대상의 크기와 필요한 중심 간 거리를 측정해 성공 기준 2.5.8의 크기·간격·예외 근거를 요소별로 기록한다.
- WCAG 2.2 신규 A·AA 성공 기준은 자동 검사 가능 여부와 무관하게 적용 여부와 수동 결과를 따로 기록한다. 대비 자동 미판정은 수동 판정 전까지 미확인으로 둔다.
- Google Rich Results Test는 배포 후 sitemap의 공개 글 9개 전체를 확인한다. 각 글은 `BlogPosting` 치명적 오류가 없고 `author.url`이 `/about`이어야 하며, 선택 경고는 실패와 구분해 URL별로 기록한다.
- PageSpeed 실험실 결과와 CrUX 현장 데이터를 분리해 기록한다. 현장 데이터가 없으면 통과로 간주하지 않는다.
- 소셜 공유 테스트는 로컬 head와 외부 플랫폼 캐시 결과를 분리한다.

## 배포·롤백

- 이 문서 작성 단계에서는 Git·PR·병합·배포를 수행하지 않는다.
- 구현 완료 뒤 별도 승인을 받아 대상 브랜치 PR, 필수 CI, 기존 CI/CD 순서로 배포한다.
- 배포 전 이미지 두 파일과 metadata가 같은 커밋에 있는지 확인한다.
- 배포 후 route status/head/asset, Rich Results, PageSpeed를 확인한다. Search Console 색인 요청은 별도 운영 행동으로 승인받는다.
- rollback 조건은 로그인 metadata 상속 잔존, 유효 page 오404, filter query 유실, 상세 cover 손실, 날짜 회귀, 핵심 UI 훼손, LCP·CLS·TBT 악화다.
- rollback은 원인 작업의 코드·자산을 함께 되돌리고 기존 CI/CD로 재배포한다. DB rollback은 없다.
- 로컬 구현 완료와 운영 배포 후 검증 완료를 하나의 상태로 합치지 않는다. 배포 승인이 없으면 Rich Results 9개·운영 PageSpeed·소셜 캐시는 미실행으로 남긴다.

## 미해결 질문

- 제품 결정 질문은 없다.
- 운영 배포 및 Search Console 작업은 이 구현 문서 실행 범위에 자동 포함되지 않는다.
- CrUX 데이터 부족과 외부 소셜 캐시는 구현 완료와 별개인 미확인 상태로 보고한다.
