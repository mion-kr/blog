# Cloudflare 이관 설계 — 1단계: 설계 결정 4개

## 결론

- 2단계 설계 증분: [design-implementation.md](design-implementation.md)(엔드포인트 계약·대응표·테스트·작업 순서, 이 문서의 사실 정정 포함).
- 범위: MID-275 진행 순서 1단계. 이슈의 "설계 때 정할 것" 4개 항목과, 그 결정에 딸린 앱 구조만 정한다. 엔드포인트별 API 계약·테스트 표·세부 작업 순서는 이 결정이 승인된 뒤 2단계 설계 증분(`design-implementation.md`)에서 쓴다.
- 작업 크기: 고위험. DB 이관(Postgres → D1), 인증 교체, 운영 도메인 전환이 함께 있다. 2026-11-05 `mion-3-risk-review`를 거쳤고 필수 수정을 이 문서에 반영했다([risk-review.md](risk-review.md)).
- 결정(아래 표 전체 `사용자 결정`, 2026-11-05 채택):

| 항목 | 결정 | 한 줄 근거 |
| --- | --- | --- |
| D1. 로그인·세션 | Google OAuth(코드 + PKCE)는 `oauth4webapi`, 세션은 `jose` 암호화 쿠키(직접 구현), 서버 저장소 없음 | 지금도 next-auth `jwt` 전략으로 DB 세션이 없고 관리자는 1명이다. `arctic`·`auth-astro`는 사실상 유지 중단. 직접 짜는 보안 코드를 쿠키·관리자 확인으로 줄인다 |
| D2. MDX 렌더링 | 요청 시 unified 파이프라인으로 HTML 변환(JS 실행 없음), 저장 시 사전 렌더는 하지 않음 | Workers는 `eval`/`new Function`을 막는다. 본문의 JSX는 `<XEmbed>` 1개뿐이다 |
| 공통 버전 | Astro 7.4.5 + `@astrojs/cloudflare` 14.4.4(2026-11-05 최신) | Astro 6 + 어댑터 13.x 조합도 가능하지만 최신을 따른다 |
| D3. 패키지 구조 | 새 앱 `apps/blog` 하나. `packages/ui` 삭제, `shared`·`database`는 앱 안으로 옮김. 옛 앱·패키지 삭제는 DNS 전환 확인 뒤 | `@repo/ui` import 0건, 이관 기간에 Vercel이 옛 앱을 계속 빌드한다 |
| D4. 이미지 | Supabase Storage → 새 R2 버킷으로 참조 중인 커버 21개 복사, 키 경로 유지, D1 적재 SQL에서 URL 접두사만 치환. 업로드는 R2 binding 직접 저장 | 지금 저장소는 Supabase Storage(S3 호환)이고 본문 이미지는 0개다 |

- 사용자 결정(2026-11-05): 4개 추천안 채택, 로그인 화면은 지금처럼 `/auth/signin` Google 버튼, 이미지 주소 `media.mion-space.dev`, 관리자 아닌 계정은 세션 없이 거부, 저장 시 파싱 거부는 넣지 않음, 발행된 글은 제목을 바꿔도 slug 유지. 고위험 검토 뒤: OAuth 흐름은 `oauth4webapi`, 롤백 관찰 기간에는 관리자 편집 동결, 테스트는 `@cloudflare/vitest-pool-workers` + Vitest 4.x.
- 남은 미확인 조건: [미확인](#미확인) 참조.

## 배경

- 문제: Vercel Pro·Supabase compute 비용을 없애려고 Cloudflare(Workers Paid·R2 Paid 구독 중)로 옮긴다(Linear MID-275, 사용자 결정).
- 현재 구조(확인된 사실, 커밋 `427b9a2`):
  - `apps/blog-web`(Next.js 16)이 `apps/blog-api`(NestJS 11)를 서버 간 호출한다. 호출 인증은 Vercel OIDC(`apps/blog-web/lib/api/caller-auth.ts`).
  - 로그인은 next-auth Google, `session.strategy: "jwt"`, 7일, `ADMIN_EMAIL`과 같으면 `ADMIN` 역할(`apps/blog-web/lib/auth-config.ts`). blog-api는 next-auth JWE를 `jose`로 복호화하고 `users`를 upsert한다(`apps/blog-api/src/auth/strategies/jwt.strategy.ts`).
  - 본문은 `posts.content`(MDX 문자열)를 `next-mdx-remote/rsc`의 `compileMDX`로 매 요청 렌더한다. 플러그인은 `remark-gfm`, `remarkMermaid`(```` ```mermaid ```` → `<MermaidChart>`)이고, 코드 블록은 하이라이팅 없이 언어 표시 + 복사 버튼만 있다(`apps/blog-web/components/mdx-renderer.tsx`, `mdx-client-components.tsx`).
  - 이미지 업로드는 blog-api가 S3 pre-signed URL을 주고 브라우저가 `draft/` 경로에 올린 뒤, 저장 시 `posts/{postId}/{type}/` 로 복사한다(`apps/blog-api/src/uploads/`).
- 운영 데이터(확인된 사실, 2026-11-05 Supabase 읽기 전용 트랜잭션 조회):
  - `posts` 21(전부 공개), `categories` 2, `tags` 5, `post_tags` 28, `users` 1, `settings` 0.
  - 본문 최대 15,101자, 합계 121,221자.
  - 코드 블록 밖 JSX: 글 1편의 `<XEmbed url="…" />` 1개. 코드 블록 밖 `import`/`export`·`{…}` 표현식·HTML 주석 0건.
  - 코드 블록 안 언어: mermaid 36, sql 10, ts 9 등. mermaid가 든 글 15편.
  - 마크다운 이미지(`![]()`) 0개. 본문의 `supabase.co` 1건은 Supabase 문서 링크다.
  - `cover_image` 21개 모두 `…/storage/v1/object/public/production/posts/{id}/thumbnail/…-ink-cover.webp`.
  - Supabase Storage 버킷 `production`(public) 객체 42개: 참조 중인 webp 21개(평균 126KB), 참조되지 않는 예전 png 커버 21개(평균 약 2MB). `development` 버킷 0개.
- 도메인(확인된 사실): `mion-space.dev` 영역은 같은 Cloudflare 계정(`7a3a31f4…`)의 Free 요금제로 활성 상태이고, 루트 A 레코드는 Cloudflare 프록시를 거치지 않는 DNS-only로 Vercel IP를 가리킨다(TTL 300, 조회 시점마다 `216.150.1.193`·`216.150.16.193` 또는 `.129`로 다르게 나옴). 이 계정에 블로그용 R2 버킷은 아직 없다.
- 기준 명세: `docs/specs/`가 없다. 이번 변경 명세는 신규 델타로만 쓴다.

## 목표와 비목표

- 목표(이슈 원문, 사용자 결정): Astro SSR 앱 하나 + D1 + R2로 Workers 배포, NestJS 제거, Google 로그인 + `ADMIN_EMAIL` 1명 유지, 이미지 R2, 기존 글 주소·RSS 주소 유지, 관리자 Editorial 디자인 유지.
- 이 문서의 비목표: 구현, 원격 D1 적재, DNS 변경, Supabase 쓰기, 엔드포인트별 계약 확정.
- 유지할 기존 동작(이 문서의 결정과 직접 닿는 것):
  - 공개 URL: `/`, `/posts`, `/posts/{slug}`, `/about`, `/privacy-policy`, `/terms`, `/feed.xml`, `/sitemap.xml`, `/robots.txt`, `/auth/signin`, `/admin/*`.
  - 정적 파일: `/ads.txt`(AdSense), `/og/blog.png`, `/og/about.png`, `/icon.svg`, `/apple-icon.png`, `/favicon.ico`.
  - 본문 표시: GFM 표·목록, 코드 블록(언어 라벨·복사 버튼, 하이라이팅 없음), mermaid 다이어그램(클라이언트 렌더, Editorial 색, 복사 버튼·오류 문구), `<XEmbed>`, 마크다운 이미지(`span.body-figure` + alt 캡션), 제목 h1을 h2로 낮춤(`scroll-mt-16`), 외부 링크(`http`·`//`로 시작) 새 탭 + 외부 링크 아이콘, 빈 본문 안내 문구.
  - 로그인 7일 유지, `ADMIN_EMAIL`만 관리자, 로그인 뒤 원래 주소로 복귀(`callbackUrl`, 바깥 주소 차단), 로그인 화면의 `AccessDenied` 권한 없음 안내(그 밖의 `error` 값은 `SessionExpired`를 포함해 일반 오류 문구 하나), 공개 헤더의 관리자 링크·로그아웃, 관리자 화면의 만료 10분 전 경고와 사용자 이름 표시.
  - 조회수: 상세 본문을 그릴 때만 증가(메타데이터 생성 때는 증가 안 함), 표시, 조회수순 정렬. 구현은 2단계 설계 증분에서 다룬다.
  - 관리자 업로드 종류: 커버(`thumbnail`), 본문 이미지(`content`, 폼이 커서 위치에 `![설명](URL)` 삽입), 소개 이미지(`about`).

## D1. 로그인 라이브러리와 세션 저장 위치

### 선택지

| 선택지 | 장점 | 단점 |
| --- | --- | --- |
| A. 전부 직접 구현 + `jose` 암호화 쿠키 | 의존성 `jose` 1개(deps 0, Workers 동작). 지금 next-auth `jwt` 전략과 같은 "쿠키에 암호화 토큰, 서버 저장 없음" 구조. 기존 `/auth/signin` 화면 유지 | OAuth 코드 교환·state·PKCE·쿠키 코드를 직접 쓴다(라우트 3개 + 헬퍼 1개). 보안 코드라 단위 테스트로 고정한다 |
| A'. `oauth4webapi` + `jose` 암호화 쿠키(채택) | `jose`와 같은 작성자의 Web API 기반 OAuth·OIDC 클라이언트(3.8.8, 2026-09 배포, 유지 중). state·PKCE·인가 응답 검증·코드 교환·ID 토큰 클레임 검증을 라이브러리가 맡는다 | 의존성 1개 추가. workerd 동작은 구현 첫 작업에서 확인 |
| B. `arctic` + 쿠키 | 코드 교환을 라이브러리가 한다 | 2026-07 deprecated. 저장소의 예제 코드를 복사해 쓰라고 안내한다 |
| C. Auth.js(`auth-astro`) | next-auth와 개념이 같다 | 2024-12 이후 배포 없음, peer `@auth/core ^0.37.3`이 최신 0.41.3을 포함하지 않음, Astro 6/7 지원 명시 없음 |
| D. better-auth + D1 | 유지보수 활발, stateless 세션 지원 | 직접 deps 17개, `nodejs_compat` 필요, 자체 `user`/`session`/`account`/`verification` 테이블이 기존 `users`(`google_id`, `role`, `posts.author_id` FK)와 겹친다. 관리자 1명에 과하다 |
| E. Cloudflare Access(Zero Trust Free, 이미 활성) | 로그인 코드 0줄 | `/auth/signin` Google 버튼 대신 Access 화면으로 바뀐다(제품 동작 변경). path 단위로만 걸면 Version·Preview URL로 `/admin`이 우회되고, Worker 단위로 걸면 공개 화면까지 막힌다. 결국 Worker 안에서 JWT를 매번 검증해야 한다 |

### 채택 설계(A')

- 성격: OAuth 흐름은 `oauth4webapi`가 맡고, 세션 쿠키 발급·검증과 관리자 확인·출처 검사는 직접 만든 보안 코드다. 이 부분의 결함 책임은 이 저장소에 있다. 그래서 아래 테스트 계획의 `oauth-callback`·`session`·`admin-guard` 테스트와 2단계 설계 증분의 로그인·로그아웃·관리자 쓰기 계약 테스트를 모두 통과하는 것을 로그인 구현의 완료 조건으로 둔다. 하나라도 빠지면 관리자 화면을 배포하지 않는다.
- 흐름(Google OAuth 2.0 authorization code + PKCE, `oauth4webapi` 사용):
  1. `/auth/signin`의 Google 버튼 → `GET /auth/google?callbackUrl=…`: `oauth4webapi`로 state·code_verifier(S256)를 만들고, state·code_verifier·`callbackUrl`을 임시 쿠키에 넣고 Google로 이동. `callbackUrl`은 지금 `apps/blog-web/lib/auth/callback-url.ts`의 `getSafeCallbackUrl` 규칙을 그대로 옮겨 바깥 주소·`//` 주소를 막는다.
  2. `GET /api/auth/callback/google`: 지금 next-auth 콜백 경로를 그대로 쓴다. 운영 도메인 콜백을 Google 콘솔에 새로 넣지 않아도 된다(등록 상태는 미확인). `oauth4webapi`로 인가 응답(state) 검증 → 토큰 엔드포인트 코드 교환 → ID 토큰 클레임(`iss`는 `accounts.google.com`·`https://accounts.google.com` 둘 다 허용, `aud` = `GOOGLE_CLIENT_ID`, `exp`) 검증, 추가로 `email_verified` 확인. ID 토큰은 토큰 엔드포인트 응답에서만 받고 다른 경로로 받은 토큰은 쓰지 않는다(Google 문서: HTTPS로 Google과 직접 주고받은 토큰은 신뢰 가능).
  3. 임시 쿠키는 성공·실패 모두에서 지운다. 쿠키에서 꺼낸 `callbackUrl`을 다시 검증하고, 없으면 `/admin`으로 보낸다.
  4. `email === ADMIN_EMAIL`(정확 일치, 지금과 같이 대소문자 정규화 없음)이면 Google `sub`를 `users.google_id` 기준으로 upsert해 기존 `users.id`(posts FK)를 유지하고 name·image를 갱신한 뒤 세션 쿠키를 발급하고 `callbackUrl`로 이동. 아니면 쿠키 없이 `/auth/signin?error=AccessDenied`.
  5. `POST /auth/signout`: 출처 검사 후 세션 쿠키를 `Max-Age=0`으로 지우고 `/`로 이동.
- 보안 세부(고위험 검토 필수 항목):

| # | 항목 | 정한 값 |
| --- | --- | --- |
| ① | 임시 쿠키 속성 | `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`. Google에서 돌아오는 이동에 쿠키가 실리도록 `Strict`를 쓰지 않는다 |
| ② | state 일회성 | 콜백 처리 즉시 임시 쿠키를 지운다. 같은 state 재사용은 거부 |
| ③ | 난수·PKCE | `oauth4webapi`의 생성 함수(Web Crypto `getRandomValues` 기반), challenge 방식 `S256` 고정 |
| ④ | 세션 암호화 | `jose` JWE `alg: dir`, `enc: A256GCM`. 키는 `SESSION_SECRET`에서 HKDF-SHA256으로 32바이트 유도. 복호화 때 허용 `alg`·`enc`를 이 둘로 고정 |
| ⑤ | 세션 쿠키 | 이름 `__Host-mion-session`, `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`, Domain 없음. 로컬 http에서 `__Host-`가 동작하지 않으면 로컬에서만 접두사 없는 이름을 쓴다(첫 작업에서 확인) |
| ⑥ | 출처 검사 | Astro `security.checkOrigin`(기본 `true`)은 form·multipart·text/plain 요청만 본다. 그래서 GET·HEAD가 아닌 모든 요청에서 `Origin`이 사이트 주소와 같은지 직접 검사한다(처음엔 관리자 경로와 `/auth/signout`만이었고 사용자 결정 12로 넓혔다). content-type과 무관 |
| ⑦ | Google 오류·교환 실패 | 콜백에 `error`가 있거나 `code`·임시 쿠키가 없거나 토큰 교환이 실패하면 500을 내지 않고 `/auth/signin?error=…`로 보낸다. 전달하는 오류 코드는 `AccessDenied`·`SessionExpired`·`OAuthError` 3개뿐이고 Google 원문(`error_description`)은 화면에 내보내지 않는다 |
| ⑧ | 로그 | code·토큰 응답·쿠키 값·`client_secret`은 로그에 남기지 않는다. 오류 종류와 단계만 기록 |
| ⑨ | 관리자 보호 범위 | 아래 "관리자 확인" |

- 세션 저장: 쿠키만. 암호화한 내용은 `{ sub: users.id, email, name, role, exp }`. 키는 Workers secret `SESSION_SECRET`.
- 세션 읽기: 쿠키가 httpOnly라 클라이언트 `useSession`을 쓰지 않는다. 공개 헤더의 관리자 링크·로그아웃과 관리자 화면의 이름·만료 경고는 서버에서 쿠키를 읽어 그린다.
- 서버 저장소(KV·D1 세션 테이블)를 두지 않는 이유: 관리자 1명이고 지금도 서버 세션이 없다. 탈취된 쿠키는 로그아웃 뒤에도 만료까지 유효하다(지금 next-auth와 같은 한계). 비상시에는 `SESSION_SECRET`을 바꿔 모든 쿠키를 무효로 만든다.
- Astro 세션 기능은 쓰지 않는다. 어댑터가 세션용 KV를 자동으로 만들지 않게 `session: false`로 둔다.
- 관리자 확인: Astro middleware가 `/admin`·`/admin/*`·`/api/admin/*` 접두사 전체를 기본 거부한다(라우트 목록 방식이 아님). 경로는 소문자·디코드 정규화 뒤 비교한다. 쿠키를 복호화하고 `email === ADMIN_EMAIL`을 매 요청 다시 비교한다(DB 조회 없음). `ADMIN_EMAIL`을 바꾸면 예전 쿠키가 바로 무효가 된다. 실패하면 페이지 요청은 `/auth/signin?callbackUrl=…`(만료면 `error=SessionExpired`)로 리다이렉트하고, `/api/admin/*` 요청은 리다이렉트 없이 `401` JSON을 돌려준다. island의 `fetch`가 로그인 화면 HTML을 받아 저장 성공으로 오인하는 일을 막기 위해서다. 지금의 Vercel OIDC 서버 간 인증은 앱이 하나가 되어 없어진다.
- 동작 차이(`사용자 결정`, 2026-11-05): 지금은 관리자가 아닌 Google 계정도 `USER` 세션을 받지만, 새 설계는 세션을 주지 않고 거부 안내를 보여 준다. `USER` 세션으로 쓰는 기능은 없다.
- 비밀값: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAIL`, `SESSION_SECRET`. 비밀이 아닌 설정값(`vars`): `SITE_URL=https://mion-space.dev`, `RSS_ITEMS_LIMIT`, `UPLOAD_ALLOWED_MIME`, `UPLOAD_MAX_SIZE`. 모두 Doppler에 두고 운영은 `wrangler secret`·`vars`로, 로컬은 `doppler run`으로 `.dev.vars`를 만들어 넣는다. Google OAuth 클라이언트에는 workers.dev 미리보기 주소 하나와 로컬(`http://localhost:4321/api/auth/callback/google`) 콜백만 추가한다(구현 단계, Google 콘솔 변경은 승인 후).

## D2. MDX 렌더링 방식

### 판단

- Workers는 문자열 코드 실행(`eval`, `new Function`)을 막는다(외부 근거 표). `compileMDX`·`@mdx-js/mdx`의 `evaluate`/`run`은 컴파일한 JS를 실행하므로 Workers에서 그대로 쓸 수 없다.
- 그런데 운영 본문 21편에서 JS 실행이 필요한 문법은 없다. 코드 블록 밖 JSX는 `<XEmbed url="…" />` 1개이고 `import`/`export`/`{…}` 표현식은 0건이다.
- 따라서 MDX를 "실행"하지 않고 "파싱"만 해서 HTML로 바꾼다.

### 선택지

| 선택지 | 장점 | 단점 |
| --- | --- | --- |
| A. 요청 시 unified 변환(추천) | 스키마 변경 없음. 렌더 규칙을 고치면 모든 글에 바로 반영 | 매 요청 파싱 CPU(본문 최대 15KB, 측정 필요) |
| B. 저장 시 HTML 사전 렌더(`content_html` 컬럼) | 요청 시 CPU 0 | 컬럼 추가, 이관 때 21편 일괄 렌더, 렌더 규칙 변경 시 재생성 스크립트 필요 |
| C. 빌드 시 정적 생성 | 가장 빠름 | 본문이 DB에 있어 글 저장마다 재배포가 필요하다 |

### 채택 설계(A)

- 파이프라인: `remark-parse` → `remark-mdx`(지금과 같은 MDX 문법 검사) → `remark-gfm` → 기존 `remarkMermaid`를 HTML용으로 바꾼 플러그인 → `remark-rehype`(MDX JSX 노드 핸들러) → `rehype-stringify`.
- 노드 처리(`mdast-util-to-hast`는 처리기가 없는 MDX JSX 노드를 빈 `<div>`로 바꾸므로 `remark-rehype`의 `handlers.mdxJsxFlowElement`·`mdxJsxTextElement`를 반드시 둔다):
  - `XEmbed`: `url`이 X 게시물 주소면 지금 `XEmbed` 컴포넌트의 figure 마크업을 서버에서 그리고, 클라이언트 스크립트가 `widgets.js`로 채운다. 주소가 잘못되면 지금과 같은 문구.
  - 그 밖의 대문자 JSX(`AlertBox`, `Image`, `Link`, `MermaidChart`): 지금 컴포넌트 맵에 있으나 운영 본문에서 쓰지 않는다. 같은 마크업으로 처리한다. 맵에 없는 대문자 JSX는 지금 `compileMDX`처럼 렌더 오류(오류 안내 박스)로 둔다.
  - 소문자 JSX(`<br/>`, `<details>` 같은 HTML 태그): 지금처럼 같은 이름의 HTML 요소로 그린다. 속성은 문자열 값만 옮기고 `{…}` 표현식 속성은 버린다.
  - 마크다운 이미지: 지금 `CustomImage`처럼 `span.body-figure` 안에 `<img loading="lazy">` + alt 캡션, `src`가 없으면 안내 문구.
  - mermaid: `<figure data-mermaid-chart class="diagram">`에 원문을 넣고, 이 figure가 있는 페이지에서만 mermaid를 불러 렌더한다(지금도 클라이언트 렌더). 서버 SVG 렌더는 DOM이 필요해 하지 않는다.
  - 코드 블록: 지금 마크업(`.code` > `.code-bar` + `pre > code.language-*`) 그대로, 복사 버튼은 작은 클라이언트 스크립트. 하이라이팅(Shiki)은 지금 없으므로 넣지 않는다.
  - 제목 h1 → h2(`scroll-mt-16`), 외부 링크(`http`·`//`) `target="_blank" rel="noopener noreferrer"` + 외부 링크 아이콘, 표 `.table-box` 감싸기, 빈 본문 안내 문구.
- 하나의 렌더 함수 `renderPostHtml(content)`를 공개 상세 화면이 쓴다(지금 본문 미리보기 화면은 없다). 파싱 실패 시 지금처럼 오류 안내 박스를 보여 준다. 관리자 저장 시 파싱 실패로 저장을 거부하는 검증은 넣지 않는다(`사용자 결정`, 2026-11-05: 지금처럼 저장되고 상세 화면에 오류 박스).
- Workers 동작 확인: unified·remark·rehype·acorn 계열 16개 패키지에 `eval`/`new Function` 코드가 없음을 정적으로 확인했다. 다만 `acorn-jsx`가 CommonJS라서 workerd에서 빌드·실행되는지는 미확인이다. 구현 첫 작업으로 이 파이프라인만 담은 Astro 페이지를 `astro dev`(workerd)에서 띄워 확인한다. `hangul-romanize`(slug)도 같은 방식으로 함께 확인한다. 실패하면 MDX JSX를 쓰지 않는 `remark-parse`+`remark-gfm` 파이프라인에 `XEmbed` 한 줄을 전처리로 바꾸는 방식으로 낮춘다(MDX 문법 검사는 잃는다).
- B로 바꾸는 조건: workers.dev 미리보기에서 가장 긴 글의 렌더 CPU가 Workers 한도에 가깝게 나오면 B로 바꾼다. 21편·15KB 규모에서는 그럴 가능성이 낮다고 보지만 측정 전까지 `미확인`.

## D3. 앱·패키지 구조

### 확인된 사실

- `@repo/ui`(`button`·`card`·`code`)를 import하는 앱 코드는 0건이다. `package.json` 의존성과 `next.config.js`의 `transpilePackages`에만 남아 있다.
- `@repo/shared`는 두 앱이 쓴다. 대부분 blog-api 응답 DTO 타입(`PostResponseDto`, `PaginatedData` 등)이고, 실행 코드는 `generateSlug`(hangul-romanize)와 pagination 유틸이다.
- `@repo/database`는 Drizzle `pg-core` 스키마와 `postgres` 연결이다. D1로 가면 `sqlite-core`로 다시 써야 해서 그대로 재사용할 코드가 없다.
- DNS 전환 전까지 옛 앱(Vercel 프로젝트 `blog-web`, `blog-api`)이 운영이다. Vercel이 이 저장소의 어느 브랜치를 어떤 설정으로 빌드하는지는 미확인이다. 안전하게 `main` 빌드를 전제로 둔다.

### 채택 설계

- 새 앱 `apps/blog`(패키지명 `blog`, Worker 이름 `mion-blog`). pnpm workspace·turbo는 유지한다.
- 새 앱은 `packages/shared`·`packages/database`에 의존하지 않는다. 필요한 것만 앱 안으로 옮긴다.
  - slug 규칙 → `apps/blog/src/lib/slug.ts`: `generateSlug` → 비면 `generateEnglishSlug` → 비면 `'post'` → 겹치면 `createUniqueSlug`의 `-1`, `-2` 접미사(`packages/shared/src/utils/slug.ts`, `posts.service.ts` `createSlugFromTitle`). 카테고리·태그 폼도 같은 `generateSlug`를 쓴다.
  - D1 스키마 → `apps/blog/src/db/schema.ts`(`sqlite-core`). DTO 타입은 API 경계가 없어지므로 Drizzle 추론 타입으로 대체한다.
- 관리자 화면은 지금 React 클라이언트 컴포넌트(`components/admin` 21개 파일)를 `@astrojs/react` island로 옮겨 Editorial 디자인을 유지한다. 공개 화면은 Astro 컴포넌트로 다시 쓰고 CSS module·`globals.css`·페이퍼로지 폰트는 그대로 가져간다. `globals.css`가 `@import "tailwindcss";`로 시작하고 관리자 레이아웃이 Tailwind 유틸리티를 쓰므로 Tailwind v4(Vite 플러그인)를 함께 넣는다.
- 옛 코드 정리: `apps/blog-web`, `apps/blog-api`, `packages/ui`, `packages/shared`, `packages/database`, `docs/backend`·`docs/frontend` 규칙 문서 삭제와 `AGENTS.md` 갱신은 DNS 전환과 운영 확인이 끝난 뒤 별도 PR로 한다. 그 전에 지우면 Vercel 운영 빌드가 깨진다. 새 앱을 넣는 PR마다 `pnpm install --frozen-lockfile`, `pnpm --filter blog-web build`, `pnpm --filter blog-api build`가 통과해야 한다. Vercel 프로젝트의 Root Directory·Ignored Build Step 설정은 미확인이다.

## D4. 이미지 저장소와 R2 이관

### 확인된 사실

- `S3_ENDPOINT`·`S3_PUBLIC_ENDPOINT`는 로컬·운영 모두 Supabase Storage다(값은 출력하지 않고 호스트 종류만 분류). R2가 아니므로 이슈 원문대로 이관한다.
- 운영 참조 이미지는 커버 21개(webp, 합계 약 2.6MB)뿐이다. 운영 데이터에 본문 이미지·소개 이미지는 0개지만 업로드 기능은 셋 다 살아 있다.

### 채택 설계

- 버킷: 새 R2 버킷 `mion-blog-media` 하나. 객체 키는 지금 경로를 그대로 쓴다(`posts/{postId}/thumbnail/{파일명}`). 복사할 때 Supabase 객체의 Content-Type(`image/webp`)을 함께 넣는다.
- 복사 범위: 참조 중인 커버 21개만 복사한다. 참조되지 않는 예전 png 21개(약 44MB)는 Supabase 프로젝트를 롤백용으로 남겨 두므로 복사하지 않는다.
- URL 치환: Supabase는 건드리지 않는다. 데이터 이관 스크립트가 Postgres 덤프를 SQLite SQL로 바꿀 때 `cover_image`의 `https://{supabase 호스트}/storage/v1/object/public/production/` 접두사를 새 공개 주소로 바꾼다. 본문도 같은 전체 접두사(호스트 + `production` 버킷)로만 찾아 바꾸므로 Supabase 문서 링크 1건은 바뀌지 않는다.
- 공개 주소(`사용자 결정`, 2026-11-05): R2 커스텀 도메인 `media.mion-space.dev`(코드 0줄, Cloudflare 캐시). DNS 레코드 추가가 필요하므로 구현 단계에서 승인 후 만든다.
- 이미지 최적화: 지금은 Vercel `next/image`가 리사이즈한다. 커버가 이미 126KB webp이므로 새 앱은 원본을 그대로 쓴다(`<img>` + `width`/`height` + `loading`). 어댑터 기본값 `imageService: 'cloudflare-binding'`은 Images binding을 자동으로 만들고, 이 계정은 Images 유료 구독이 있어 무료 5,000회를 넘으면 1,000회당 $0.50이 붙을 수 있다. 그래서 `imageService: 'passthrough'`로 둔다.
- 업로드: pre-signed URL을 없애고 관리자 업로드 라우트가 파일을 받아 R2 binding으로 저장한다(요청 본문 한도는 영역 Free 100 MB, 지금 `UPLOAD_MAX_SIZE` 안). 키 구조는 지금 그대로 둔다: `draft/{draftUuid}/{type}/…`에 올리고 저장 시 `posts/{postId}/{type}/…`·`about/…`로 옮긴다. binding에는 복사 API가 없어 `get` → `put` → `delete`로 옮긴다. `draft/` 경로가 남아야 버려진 업로드를 구분할 수 있다. MIME·크기 검사(`UPLOAD_ALLOWED_MIME`, `UPLOAD_MAX_SIZE`, 목록이 비면 모두 허용)는 그대로 옮긴다. `S3_*` 비밀값 5개가 필요 없어진다.
- 업로드 세부(커버·소개 이미지 교체 시 이전 객체 삭제, 본문 이미지 고아 정리)는 2단계 설계 증분에서 기존 `content-image-finalizer`·`uploads.service.ts` 동작과 대조해 정한다.

## 데이터 이관

- 덤프: Supabase를 `begin read only` 트랜잭션으로 읽는다. 시간 값은 `TZ=UTC`에서 Postgres 쪽에서 `extract(epoch from col) * 1000`(UTC 해석)으로, boolean은 `col::int`로 명시 변환해 꺼낸다. 문자열 `'t'`/`'f'`를 그대로 옮기지 않는다.
- D1 스키마 타입: boolean은 `integer({ mode: 'boolean' })`(0/1), 시간은 `integer({ mode: 'timestamp_ms' })`. `pgEnum` `user_role`은 `text({ enum: ['ADMIN','USER'] })`.
- 적재 SQL: `BEGIN TRANSACTION`·`COMMIT`을 넣지 않는다(D1 import 문서). D1은 외래 키를 기본으로 검사하므로 INSERT는 부모부터(`users` → `categories` → `tags` → `posts` → `post_tags` → `settings`) 넣는다. 한 문장은 100KB를 넘지 않게 행마다 INSERT 한 문장으로 만든다(본문 최대 약 45KB). Drizzle로 넣을 때는 쿼리당 바인딩 파라미터 100개 한도에 맞춰 나눈다.
- 다시 실행: 원격 적재는 매번 D1 데이터베이스를 새로 만들어(또는 테이블을 비운 뒤) 넣는다. 테이블을 비울 때는 자식부터 지운다(`post_tags` → `posts` → `settings` → `tags` → `categories` → `users`). 같은 파일을 두 번 실행해도 같은 결과가 나와야 한다.
- 비교: 이관 전후 모든 테이블의 모든 컬럼을 비교한다. 시간은 UTC epoch ms, 커버 URL은 치환 규칙 적용 후, `post_tags`는 `(post_id, tag_id)` 쌍 집합으로 비교한다. 비교 스크립트는 차이가 하나라도 있으면 0이 아닌 종료 코드로 끝난다.
- 쓰기 원자성: 지금 글 생성·수정·삭제는 `posts`·`post_tags`·`post_count`를 한 트랜잭션으로 쓴다(`drizzle-posts.repository.ts:342,381,416`). D1에서는 `db.batch()`(SQL 트랜잭션, 하나라도 실패하면 전체 롤백)로 묶는다.

## 배포·롤백·관측

- 배포: 저장소에 CI가 없으므로 로컬에서 승인 후 `wrangler deploy`로 배포한다. 운영 도메인은 Worker 커스텀 도메인으로 붙인다.
- 무시 목록: `.gitignore`에 `.dev.vars`, `.wrangler/`, `.astro/`를 추가한다.
- 관측: `wrangler` 설정에 Workers Logs(`observability`)를 켜고, 미리보기에서 렌더 CPU 시간을 로그로 확인한다(D2 B안 전환 판단 근거).
- 롤백(`사용자 결정`, 2026-11-05):
  1. 전환 전에 루트 A 레코드 값과 TTL을 기록한다.
  2. 전환 후 관찰 기간(7일) 동안 관리자 편집 동결을 유지한다. 그래서 롤백할 때 잃는 데이터는 관찰 기간의 조회수뿐이다. Supabase에 되돌려 쓰지 않는다.
  3. 롤백 순서: Worker 커스텀 도메인 해제 → 기록한 Vercel A 레코드 복원(DNS-only) → 옛 사이트 응답 확인.
  4. Worker 코드만 문제면 DNS는 두고 `wrangler rollback`으로 이전 버전으로 되돌린다.
  5. 관찰 기간이 끝나면 편집 동결을 풀고 옛 코드 정리 PR로 넘어간다.

## 외부 근거(2026-11-05 확인)

| 근거 | 내용 | 출처 |
| --- | --- | --- |
| 버전 | `astro` 7.4.5, `@astrojs/cloudflare` 14.4.4(peer `astro ^7.4.0`, `wrangler ^4.125.0`), `jose` 6.2.15 | npm |
| Workers 문자열 코드 실행 금지 | "For security reasons, the following are not allowed: `eval()`, `new Function` …" | https://developers.cloudflare.com/workers/runtime-apis/web-standards/ |
| `@mdx-js/mdx` `run` | `new AsyncFunction(String(code))`로 실행 | https://github.com/mdx-js/mdx/blob/3.1.1/packages/mdx/lib/run.js |
| `next-mdx-remote` | 저장소 보관(archived), 지원 종료 | https://github.com/hashicorp/next-mdx-remote |
| `@astrojs/mdx` | 로컬 `.mdx`·content collection용. 원격 Markdown 처리 미지원 | https://docs.astro.build/en/guides/markdown-content/#fetching-remote-markdown |
| MDX JSX 노드 변환 | 처리기 없는 노드는 빈 `<div>` | https://github.com/syntax-tree/mdast-util-to-hast |
| Astro 6+ 어댑터 | dev도 workerd, CommonJS 미지원(사전 컴파일 필요할 수 있음), `Astro.locals.runtime` 제거 → `cloudflare:workers`의 `env`, Pages 배포 미지원 | https://docs.astro.build/en/guides/integrations-guide/cloudflare/ |
| Astro sessions | 배포 시 KV(`SESSION`) 자동 생성, `session: false`면 생성 안 함 | 같은 문서 |
| `imageService` | 기본 `'cloudflare-binding'`(Images binding 자동 생성), `'passthrough'` 선택 가능 | 같은 문서, https://developers.cloudflare.com/images/pricing/ |
| Workers 한도 | 스크립트 64 MiB(비압축), CPU Paid 기본 30초, 메모리 128 MB, 요청 본문은 영역 요금제 기준 Free 100 MB | https://developers.cloudflare.com/workers/platform/limits/ |
| `arctic` | 2026-07 deprecated | https://github.com/pilcrowonpaper/arctic |
| `auth-astro` | 마지막 배포 2024-12, peer `@auth/core ^0.37.3` | https://github.com/nowaythatworked/auth-astro |
| better-auth | 1.7.17, D1 지원, 테이블 4개, `nodejs_compat` 필요 | https://www.better-auth.com/docs/integrations/astro |
| Cloudflare Access | Worker 단위면 workers.dev·preview까지 보호, path 단위는 Version·Preview URL 우회 가능, Static Assets 사용 시 `ctx.access` 미전달 | https://developers.cloudflare.com/workers/configuration/cloudflare-access/ |
| R2 공개 | 커스텀 도메인 권장, r2.dev는 개발용(속도 제한) | https://developers.cloudflare.com/r2/buckets/public-buckets/ |
| R2 업로드 | binding `put`은 약 100 MB 미만 단일 업로드에 적합. binding은 presigned URL을 만들 수 없음 | https://developers.cloudflare.com/r2/objects/upload-objects/ |
| D1 외래 키 | "By default, D1 enforces that foreign key constraints are valid within all queries and migrations." `PRAGMA defer_foreign_keys = on`은 현재 트랜잭션 안에서만 | https://developers.cloudflare.com/d1/sql-api/foreign-keys/ |
| D1 batch | "Batched statements are SQL transactions … rolls back the entire sequence." | https://developers.cloudflare.com/d1/worker-api/d1-database/ |
| D1 파일 적재 | "Remove `BEGIN TRANSACTION` and `COMMIT;` from the file" | https://developers.cloudflare.com/d1/best-practices/import-export-data/ |
| D1 한도 | 쿼리당 바인딩 파라미터 100, 문장 100KB, DB 10GB(Paid), 호출당 쿼리 1000(batch는 1개) | https://developers.cloudflare.com/d1/platform/limits/ |
| Astro `checkOrigin` | 기본 `true`, form·multipart·text/plain 요청만 검사(문서 요약 기준) | https://docs.astro.build/en/reference/configuration-reference/#securitycheckorigin |
| Google ID 토큰 | `iss`는 `https://accounts.google.com` 또는 `accounts.google.com`. HTTPS로 Google과 직접 받은 토큰은 신뢰 가능 | https://developers.google.com/identity/openid-connect/openid-connect |
| `oauth4webapi` | 3.8.8, 마지막 배포 2026-09-05, deprecated 아님 | npm |
| `@cloudflare/vitest-pool-workers` | 0.23.0, peer `vitest ^4.1.0`(최신 vitest 5.1.0과 맞지 않음) | npm |

## 사용자 결정 기록(2026-11-05)

1. 로그인 화면: 지금처럼 `/auth/signin`의 Google 버튼. Cloudflare Access는 쓰지 않는다.
2. 이미지 공개 주소: `media.mion-space.dev`.
3. 제목 수정 시 slug: 발행된 글(`published = true`)은 제목을 바꿔도 slug를 유지한다. 지금은 제목이 바뀌면 slug를 새로 만들어(`posts.service.ts` `update`, `title !== existingPost.title`) 예전 `/posts/{예전 slug}`가 404가 된다. 발행 전 글은 지금처럼 제목 기준으로 다시 만든다.
4. 관리자 아닌 Google 계정: 세션 없이 거부.
5. 관리자 저장 시 본문 MDX 파싱 실패 거부: 넣지 않는다.
6. 로그인 OAuth 흐름: `oauth4webapi`에 맡기고 세션 쿠키만 `jose`로 직접 처리한다(고위험 검토 뒤 결정).
7. 롤백 데이터 처리: 전환 후 7일 관찰 기간 동안 관리자 편집 동결을 유지하고, 롤백 시 그 기간 조회수 유실을 받아들인다. D1 → Postgres 역방향 쓰기는 하지 않는다.
8. 테스트 도구: `@cloudflare/vitest-pool-workers` + Vitest 4.x 고정. Google 토큰 엔드포인트는 `fetch`를 주입받게 해서 테스트에서 바꿔 끼운다(저장소에 새로 들어오는 목).
9. 관리자 편집 화면을 열어도 조회수를 올리지 않는다(2단계 검토 뒤 결정).
10. 설정 폼은 검증 실패 시 칸별 오류 문구를 보여 준다(2단계 검토 뒤 결정).
11~15. 로컬 구현 뒤 결정(미리보기 커버 경로, 출처 검사 범위, 테스트 도구 이름, Astro `checkOrigin`, 원격 작업 허용)은 [design-implementation.md 사용자 결정](design-implementation.md#사용자-결정)에 있다.

## 대안

| 대안 | 선택하지 않은 이유 |
| --- | --- |
| better-auth | 자체 테이블이 기존 `users`와 겹치고 관리자 1명에 과하다 |
| `arctic`·`auth-astro` | 유지 중단 |
| OAuth 흐름 전부 직접 구현 | 직접 짜는 보안 코드가 늘어난다. 유지 중인 `oauth4webapi`로 줄인다 |
| 롤백 시 D1 → Postgres 역방향 덤프 | Supabase 쓰기가 생긴다. 관찰 기간 편집 동결로 대신한다 |
| Cloudflare Access | 로그인 화면이 바뀌고 preview URL 우회 때문에 Worker 안 검증이 여전히 필요하다 |
| KV·D1 세션 저장 | 지금도 서버 세션이 없고, 강제 만료는 비밀키 교체로 충분하다 |
| MDX 저장 시 사전 렌더 | 컬럼·재생성 스크립트가 늘어난다. 측정 후 필요할 때만 |
| Shiki 하이라이팅 추가 | 지금 없는 기능이다(범위 밖) |
| `packages/*` 유지 | 소비자가 새 앱 하나로 줄고 `database`는 다시 써야 한다 |
| 42개 객체 전부 복사 | 참조되지 않는 21개(약 44MB)는 Supabase에 남는다 |
| Cloudflare Images 변환 | 커버가 이미 작은 webp라 필요 없다 |
| MDX 대신 `remark-parse`+`remark-gfm` 기본 사용 | MDX 문법 검사와 소문자 HTML 태그 처리를 잃는다. workerd에서 MDX 파서가 안 돌 때의 대체안으로만 둔다 |
| 새 글 `postId` 선발급 + `posts/`에 바로 저장 | 버려진 업로드를 구분할 `draft/` 경로가 사라진다 |

## 리스크

| 리스크 | 발생 조건 | 영향 | 근거 | 대응 |
| --- | --- | --- | --- | --- |
| 본문 표시 회귀 | unified 출력이 지금 React 렌더와 다름 | 글 21편 모양 변화 | `mdx-renderer.tsx` 컴포넌트 맵 | 덤프 본문을 기존 `compileMDX` 렌더러로 로컬 렌더한 고정 자료와 새 렌더를 비교하는 회귀 테스트 |
| 고정 자료 확보 중 운영 쓰기 | 운영 `/posts/{slug}`를 GET | 운영 `view_count` 증가(Supabase 쓰기 금지 위반), 조회수 비교 기준 깨짐 | `post-server-data.ts:29-34`, `posts.service.ts:152-159` | 운영 HTTP를 쓰지 않고 덤프 본문을 로컬 렌더. 21편 200 확인은 새 앱에서만 |
| 적재 재실행 실패 | 같은 적재를 두 번 실행, 부모부터 DELETE, 파일에 `BEGIN/COMMIT` | UNIQUE·FK 오류로 중단 | D1 외래 키·import 문서 | "데이터 이관"의 새로 만들기·순서 규칙 |
| 값 변환 사고 | `'t'/'f'` 문자열 boolean, 초·밀리초 혼동, `google_id` 불일치 | 21편 비공개, 날짜 1000배, 관리자 로그인 불가 | `users.ts` unique 제약 | 명시 변환 덤프 + 모든 컬럼 비교 |
| 쓰기 부분 반영 | 글·태그 쓰기를 트랜잭션 없이 옮김 | 글에서 태그 유실 | `drizzle-posts.repository.ts:342,381,416` | `db.batch()` |
| 관리자 API 응답 오인 | 만료 뒤 island `fetch`가 리다이렉트를 따라감 | 저장 성공으로 오인해 본문 유실 | D1 관리자 확인 | `/api/admin/*`은 `401` JSON |
| 롤백 시 데이터 유실 | 전환 뒤 D1에서 쓴 내용 | Supabase에 없음 | 롤백 절차 | 관찰 기간 편집 동결(사용자 결정 7) |
| slug 불일치 | `generateSlug` 이식 결과가 다름 | 새 글·태그 주소 규칙 변화 | `packages/shared/src/utils/slug.ts` | 운영 제목 표본 단위 테스트 |
| 제목 수정 시 주소 변경 | 관리자 화면 이식 때 지금 slug 재생성 로직을 그대로 옮김 | 기존 글 404 | `posts.service.ts` `update` | 발행 글 slug 유지(사용자 결정 3) + 단위 테스트 |
| 옛 앱 빌드 깨짐 | 전환 전 `packages/*`·옛 앱 삭제 | Vercel 운영 배포 실패 | Vercel 빌드 설정 미확인 | 삭제는 전환 확인 뒤 |
| 로그인 콜백 불일치 | Google 콘솔에 미리보기·로컬 콜백 미등록 | 미리보기 관리자 로그인 실패 | OAuth 리디렉션 URI 규칙 | 운영은 기존 콜백 경로 유지, 미리보기·로컬 콜백만 등록(승인 후) |
| 시간 값 9시간 밀림 | 타임존 없는 Postgres `timestamp`(UTC 값)를 KST Mac에서 읽어 로컬 시간으로 해석 | 게시일·정렬·sitemap 날짜 변화 | `posts.published_at` 등 `timestamp` 컬럼, 운영 서버는 UTC 환경 | 덤프 시 UTC로 고정 해석(`TZ=UTC`, 문자열로 읽기), UTC epoch ms 기준 비교 |
| 전환 중 데이터 유실 | 원격 적재 뒤 DNS 전환 전에 옛 관리자 화면에서 글 수정·조회수 증가 | 새 D1에 최신 데이터 누락 | 작업 순서 7 | 적재 직전 관리자 편집 동결 → 최종 재적재(조회수 포함) → DNS 전환 |
| 직접 구현 인증 결함 | state·`callbackUrl`·쿠키 검증 누락 | 관리자 권한 탈취 또는 open redirect | D1 | middleware·콜백·쿠키 단위 테스트, 다른 출처 POST 거부 테스트 |

## 미확인

- `acorn-jsx`·`hangul-romanize`(CommonJS)·`oauth4webapi`가 workerd에서 동작하는지: 구현 첫 작업에서 확인.
- `__Host-` 쿠키가 로컬 http에서 동작하는지: 구현 첫 작업에서 확인.
- 지금 next-auth 세션이 이용 중에 만료가 밀리는지(새 설계는 고정 7일): 구현 첫 작업에서 확인하고 다르면 보고.
- Workers에서 가장 긴 글(15KB) 렌더 CPU 시간: 구현 후 미리보기에서 측정.
- Google 콘솔에 지금 등록된 리디렉션 URI, Vercel 프로젝트의 Root Directory·Ignored Build Step 설정.
- `mermaid` 클라이언트 번들을 Astro 페이지 스크립트로 옮길 때 크기 변화: 구현 후 확인.
- Google OAuth 클라이언트가 Doppler 어느 설정에 있는지(`local_web`/`prd` 계열): 구현 단계에서 이름만 확인.

## 테스트 계획(결정 항목 범위)

엔드포인트별 계약 테스트는 2단계 설계 증분에서 쓴다. 이 문서는 결정이 만드는 로직의 테스트와 2단계에 넘길 필수 대상만 정한다.

- 테스트 도구(`사용자 결정` 8): `@cloudflare/vitest-pool-workers` + Vitest 4.x 고정. 테스트가 workerd 안에서 돌아 D1·R2 binding과 `eval`·CommonJS 제약을 함께 확인한다. HTTP 수준 계약 테스트는 pool의 Worker `fetch` 호출로 한다.
- 새 목: Google 토큰 엔드포인트만. OAuth 콜백 처리 함수가 `fetch`를 인자로 받게 하고 테스트에서 가짜 응답을 넣는다.

### 회귀 테스트(구현 전에 고정 자료 확보)

기존 테스트 중 유지할 동작을 덮는 것은 새 앱으로 옮겨 같은 케이스를 유지한다.

| 기존 테스트 | 덮는 동작 | 새 위치 |
| --- | --- | --- |
| `apps/blog-web/scripts/parseXPostUrl.test.mjs` | X 게시물 주소 판정(D2 `XEmbed`) | `apps/blog/test/parse-x-post-url.test.ts` |
| `apps/blog-api/src/uploads/application/upload-policy.service.spec.ts` | 허용 MIME, 크기 상한, 목록이 비면 모두 허용 | `apps/blog/test/upload-policy.test.ts` |
| `apps/blog-api/src/uploads/application/content-image-finalizer.spec.ts`, `uploads.service.spec.ts`(:102 잘못된 소개 이미지 draft URL 거부) | 본문·소개 이미지 확정 | 2단계 업로드 증분 |
| `apps/blog-api/src/posts/posts.service.spec.ts` | 조회수 증가 시 `updatedAt` 유지(:208), 조회수 미증가 경로(:222), 미발행 글 404·조회수 미증가(:241), 없는 카테고리·태그 400(:335,:353), 이미지 확정 실패 롤백·보상 삭제(:374,:405,:553,:599), 집계 갱신(:452,:655) | 2단계 글 증분 |
| `apps/blog-api/src/posts/posts.integration.spec.ts`(`describe.skip`, 실행된 적 없음. 케이스 목록으로만 사용) | 검색(제목·내용·요약), 카테고리·태그 필터, 정렬·조회수순(:217,:238-291), 401·400(:437,:452), 중복 제목 slug(:524) | 2단계 공개 목록·글 증분 |
| `apps/blog-api/src/posts/posts-access.integration.spec.ts` | 초안 경계(:104,:123), sitemap·RSS에서 초안 제외 | 2단계 공개 화면 증분 |
| `apps/blog-api/src/categories/categories.service.spec.ts`, `tags/tags.service.spec.ts`(통합 테스트 2개는 `describe.skip`이라 제외) | 중복 Conflict, 글이 연결된 항목 삭제 거부 | 2단계 카테고리·태그 증분 |
| `apps/blog-api/src/settings/settings.service.spec.ts` | 행이 없을 때 기본값(:32, 운영 settings 0행이라 실제 운영 경로), 관리자 전용 필드 숨김, 소개 이미지 확정·이전 파일 삭제(:115) | 2단계 설정 증분 |
| `apps/blog-api/src/auth/strategies/jwt.strategy.spec.ts`(:108) | 로그인 때 프로필 갱신 | `apps/blog/test/oauth-callback.test.ts` |
| `apps/blog-web/scripts/verify-seo-runtime.mjs` | page 2 canonical, 필터 noindex, 404 메타, KST 날짜, JSON-LD `</script>` escape, og 이미지, sitemap, 로그인 화면 noindex, 조회수 분리 | assertion 목록은 유지하고 실행 틀을 로컬 D1 시드 + `astro preview` 대상으로 다시 쓴다(`next start`·next-auth 쿠키 위조·blog-api mock에 묶여 그대로 실행 불가). 위치는 `apps/blog/scripts/verify-seo-runtime.mjs` |

폐기 대상(앱이 하나가 되어 없어지는 동작): `apps/blog-web/scripts/caller-auth.test.ts`, `apps/blog-api/src/auth/guards/serverCallerGuard.spec.ts`, `apps/blog-api/src/auth/guards/serverCallerOidc.spec.ts`.

| 유지할 기존 동작 | 테스트 | 파일 |
| --- | --- | --- |
| 공개 글 21편 본문 표시 | 편집 동결 시점 덤프의 `content`를 기존 `MDXRenderer`(`compileMDX`)로 로컬 스크립트에서 렌더해 원문과 HTML을 함께 저장한다. 운영 HTTP는 쓰지 않는다(운영 `view_count` 증가 방지). 새 `renderPostHtml` 출력과 텍스트·구조(제목, 코드 블록 수, mermaid figure 수, 표 수, 링크) 비교 | `apps/blog/scripts/migrate/render-fixtures.mjs`, `apps/blog/test/fixtures/posts/*.{mdx,html}`, `apps/blog/test/render-regression.test.ts` |
| slug 규칙 | 운영 제목 21개·카테고리·태그 이름 → 기존 `generateSlug`와 같은 결과(기대값은 기존 함수로 만든다), 빈 결과 시 `generateEnglishSlug`→`'post'` 폴백, 중복 시 `-1`·`-2`, 발행된 글은 제목을 바꿔도 slug 유지·발행 전 글은 재생성 | `apps/blog/test/slug.test.ts` |

### 단위 테스트(구현 전에 실패 확인)

| 대상 | 케이스 | 파일 |
| --- | --- | --- |
| `renderPostHtml` | GFM 표, 언어 있는/없는 코드 블록, mermaid, `XEmbed` 정상·잘못된 URL, 이미지(alt 캡션·빈 src), 소문자 HTML 태그, h1→h2, 외부(`http`·`//`)/내부/앵커 링크, 맵에 없는 대문자 JSX, 파싱 오류, 빈 본문 | `apps/blog/test/render.test.ts` |
| 세션 쿠키 | 발급·복호화, 만료, 위조, 다른 키로 만든 쿠키 거부, `dir`/`A256GCM` 외 알고리즘 거부, `name` 포함, Set-Cookie 속성(`__Host-`, HttpOnly, Secure, SameSite=Lax, Path=/, Max-Age=604800) | `apps/blog/test/session.test.ts` |
| OAuth 시작 | state·verifier가 매번 다름, challenge `S256`, 임시 쿠키 속성(SameSite=Lax, Max-Age=600), 바깥 `callbackUrl` 차단 | `apps/blog/test/oauth-start.test.ts` |
| OAuth 콜백 | state 불일치·누락·만료 거부, 같은 state 재사용 거부, Google `error=access_denied`·`code` 없음, 토큰 엔드포인트 non-200·네트워크 실패 → `OAuthError`(500 아님, Google 원문 미노출), `iss` 두 형식 통과, `aud`·`iss` 불일치·만료 거부, `email`·`sub` 누락 거부, `email_verified=false` 거부, `ADMIN_EMAIL` 아닌 이메일(대소문자만 다른 경우 포함)은 쿠키 없이 `AccessDenied`, 기존 `google_id`면 같은 `users.id` 유지·name·image 갱신, 성공·실패 모두 임시 쿠키 삭제, 쿠키의 `callbackUrl` 재검증, `callbackUrl` 없으면 `/admin`, 로그에 code·토큰·쿠키 값 없음 | `apps/blog/test/oauth-callback.test.ts` |
| 관리자 middleware | 쿠키 없음·위조·만료 시 페이지는 `/auth/signin` 리다이렉트, `/api/admin/*`은 `401` JSON, `ADMIN_EMAIL`이 바뀐 뒤 예전 쿠키 거부, `/Admin`·`%2Fadmin` 같은 변형 경로도 거부, 빌드된 라우트 중 `/admin`·`/api/admin` 접두사 전체를 쿠키 없이 호출해 모두 거부되는지 확인 | `apps/blog/test/admin-guard.test.ts` |
| 출처 검사 | 다른 `Origin`의 POST·PUT·PATCH·DELETE를 JSON·multipart·form 모두에서 거부, `POST /auth/signout`도 거부 | `apps/blog/test/origin-check.test.ts` |
| 이미지 URL 치환 | 커버 전체 접두사 치환, 다른 호스트·다른 버킷·Supabase 문서 링크 유지, 이미 바뀐 URL 재실행 시 그대로 | `apps/blog/scripts/migrate/rewrite-urls.test.ts` |
| 덤프 변환 | boolean 0/1, UTC epoch ms(KST 환경에서도 같은 값), `BEGIN/COMMIT` 없음, INSERT 부모 순서, 같은 입력이면 같은 SQL | `apps/blog/scripts/migrate/dump-to-sql.test.ts` |

### 2단계 설계 증분에서 반드시 계약 테스트를 쓸 대상

- 인증: `GET /auth/google`, `GET /api/auth/callback/google`, `POST /auth/signout`. HTTP 상태(302/303), `Location`, `Set-Cookie` 속성을 고정한다.
- 관리자 쓰기: 글 생성·수정·삭제, 카테고리 생성·수정·삭제, 태그 생성·수정·삭제, 설정 수정, 업로드. 각각 미인증 401·다른 출처 거부를 포함한다.

### 실행 명령(구현 단계에서 만들고 확인)

- `pnpm --filter blog test`
- 전제: pool-workers가 띄우는 로컬 D1·R2, `.dev.vars`(Doppler에서 생성). 운영 Supabase는 덤프용 읽기 전용 조회만 한다.

## 작업 순서(이슈 2단계 이후, 개요)

세부 순서는 2단계 설계 증분에서 엔드포인트 하나씩 나눈다. 각 엔드포인트는 테스트 작성 → 실패 확인 → 구현 → 통과 순서로 끝내고 다음으로 넘어간다.

- [ ] 1. `apps/blog` 뼈대(Astro 7 + `@astrojs/cloudflare` 14 + D1·R2 binding, `session: false`, `imageService: 'passthrough'`, Workers Logs, `.gitignore`), pool-workers 테스트 환경, workerd 동작 확인(`acorn-jsx`·`hangul-romanize`·`oauth4webapi`, `__Host-` 로컬 쿠키)
- [ ] 2. D1 스키마(`sqlite-core`) + 덤프 변환·적재·비교 스크립트 → 로컬 D1 검증, 덤프 본문으로 회귀 고정 자료 렌더
- [ ] 3. `renderPostHtml`(D2) → 공개 화면(목록·상세·소개·약관), 목록 쿼리·noindex·404 계약
- [ ] 4. RSS·sitemap·robots
- [ ] 5. 로그인(D1): OAuth 시작 → 콜백 → 로그아웃 → 관리자 middleware·출처 검사
- [ ] 6. 업로드(D4): 업로드 정책 → R2 저장 → draft 확정
- [ ] 7. 관리자 글: 생성 → 수정 → 삭제(각각 `db.batch()`)
- [ ] 8. 관리자 카테고리 → 태그 → 설정 → 대시보드(overview)
- [ ] 9. 원격 D1 생성·적재, R2 커버 복사, workers.dev 미리보기 배포(각각 승인 후)
- [ ] 10. 관리자 편집 동결 → 최종 덤프·재적재·전 컬럼 비교 → A 레코드 기록 → 커스텀 도메인 연결(승인 후) → 7일 관찰 → 동결 해제 → 옛 코드 정리 PR

"리다이렉트"는 별도 단계로 두지 않는다. 공개 주소 변경이 0건이라 301 대상이 없다. 사라지는 주소는 내부 경로(`/api/auth/*` 중 콜백 외, `/api/admin/*`의 옛 Route Handler)뿐이다.

### 2단계 설계 증분에서 대응표를 만들 기존 항목

- 관리자 화면: `/admin`(overview), `/admin/posts`, `/admin/posts/new`, `/admin/posts/[slug]/edit`, `/admin/categories`, `/admin/tags`, `/admin/settings`
- Route Handler: `GET /api/admin/{posts,categories,tags,overview}`, `POST /api/admin/uploads/pre-signed`
- Server Action: `lib/admin/posts-actions.ts`, `categories-actions.ts`, `tags-actions.ts`, `settings-actions.ts`(`updateAdminBlogInfoAction`, `updateAdminPostSettingsAction`, `syncSettingsFromServer`)
- blog-api 컨트롤러: posts·`admin/posts`·categories·tags·`admin/settings`·`site/settings`(화면 호출 0건, 폐기 후보)
- 공개 목록 쿼리: `page`, `limit`, `search`, `category|categorySlug`, `tag|tagSlug`, `sort`, `order`

## 변경 파일 후보

| 파일·자원 | 변경 목적 | 주의점 |
| --- | --- | --- |
| `apps/blog/**` | 새 Astro 앱 | 옛 패키지에 의존하지 않음 |
| `.gitignore` | `.dev.vars`, `.wrangler/`, `.astro/` 추가 | 비밀값 커밋 방지 |
| `pnpm-workspace.yaml`, `turbo.json`, `pnpm-lock.yaml`, 루트 `package.json`(`doppler-setup`) | 새 앱 포함 | 옛 앱 빌드 유지(`--frozen-lockfile`, 옛 앱 build 통과) |
| D1 `mion-blog`, R2 `mion-blog-media` | 새 자원 | 생성·적재는 승인 후 |
| Doppler `mion-blog` | `SESSION_SECRET`, `SITE_URL` 등 추가 | 값 출력 금지 |
| Google OAuth 클라이언트 | 미리보기·로컬 콜백 URL 추가 | 승인 후 |

## 요구사항 추적

| 요구사항(근거) | 결정 | 테스트 |
| --- | --- | --- |
| Google 로그인 + `ADMIN_EMAIL` 1명(이슈) | D1 | 세션·OAuth 시작·콜백·관리자 middleware·출처 검사 테스트, 2단계 인증 계약 테스트 |
| Workers에서 MDX 본문 표시(이슈) | D2 | 렌더 단위·회귀 테스트 |
| 앱 하나로 통합, 패키지 정리(이슈) | D3 | `pnpm build`, 타입 체크 |
| 이미지 R2, URL 치환(이슈) | D4 | URL 치환·업로드 검사 단위 테스트 |
| 이관 전후 개수 동일(이슈) | 데이터 이관 | 덤프 변환 테스트, 전 컬럼 비교 스크립트 |
| RSS·sitemap(이슈) | 작업 순서 4 | 변경 명세 RSS·sitemap 계약, SEO 런타임 검증 |
| 기존 글 주소 유지(이슈) | 사용자 결정 3(발행 글 slug 유지) | 공개 글 21편 전부 200 확인, slug 규칙 단위 테스트(발행 글 제목 변경 시 slug 그대로) |
