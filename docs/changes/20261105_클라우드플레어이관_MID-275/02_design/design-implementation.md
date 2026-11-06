# Cloudflare 이관 설계 — 2단계: 엔드포인트 계약·테스트·작업 순서

## 결론

- 범위: [design.md](design.md)의 결정 4개(사용자 결정, 2026-11-05)를 엔드포인트 단위 계약, 기존 항목 → 새 라우트 대응표, 테스트 목록, 엔드포인트 하나씩 끝내는 작업 순서로 푼다. 코드·DB·DNS는 바꾸지 않는다.
- 작업 크기: 고위험(1단계와 같음). 이 문서는 1단계 고위험 검토 결과를 전제로 한다.
- 구조(확인된 사실로 정할 수 있는 구현 세부, 제품 동작 변화 없음):
  - 관리자 화면의 읽기는 Astro 페이지가 서버에서 D1을 직접 조회한다. 지금 웹의 `GET /api/admin/{posts,categories,tags,overview}` Route Handler는 화면 코드의 호출이 0건이고 검증 스크립트(`verify-server-routing.mjs:46-50`, `verify-integrated-admin.mjs:47,66`)만 부르므로 옮기지 않는다.
  - 관리자 쓰기는 server action 대신 `/api/admin/*` API 라우트로 옮긴다. 관리자 보호 접두사(design.md D1)에 그대로 들어가고, island는 `useActionState`를 유지한 채 action 함수 안에서 `fetch`를 부른다.
  - 쓰기 요청 본문은 업로드만 `multipart/form-data`, 나머지는 JSON이다. 검증은 Astro에 들어 있는 `astro/zod`로 해서 의존성을 늘리지 않는다.
- 이 문서가 1단계 문서의 사실 오류와 회귀 근거를 바로잡는다([정정](#1단계-문서-정정)). 2026-11-05 독립 검토(`mion-reviewer`) 지적 중 근거가 확인된 것을 반영했다.
- 사용자 결정(2026-11-05, 2단계): 관리자 편집 화면은 조회수를 올리지 않는다. 설정 폼은 칸별 오류 문구를 보여 준다([사용자 결정](#사용자-결정)).

## 1단계 문서 정정

| 위치 | 이전 서술 | 확인된 사실(커밋 `75b70c7`) | 반영 |
| --- | --- | --- | --- |
| design.md "유지할 기존 동작" 로그인 항목 | 로그인 화면에 `AccessDenied`·`SessionExpired` 안내 | `AccessDenied`만 권한 없음 문구, 그 밖의 `error` 값은 `SessionExpired`를 포함해 모두 "로그인 도중 오류가 발생했어요."(`apps/blog-web/app/(site)/auth/signin/page.tsx:56-61`) | design.md 수정 |
| design.md 회귀 표 | `verify-seo-runtime.mjs`만 언급 | 검증 스크립트가 2개 더 있다: `verify-server-routing.mjs`, `verify-integrated-admin.mjs`(+ 실행기 `run-local-validation.py`). 초안 404→발행 200, 삭제 뒤 0개, 잘못된 업로드 400, feed 항목 수, `/posts?limit=101` 오류 문구, 관리자 페이지 미인증 307을 확인한다 | 회귀 표·기준선·폐기 목록에 분류 |
| design.md 회귀 표 `posts.integration.spec.ts`, `categories`·`tags` 통합 테스트 | 검색·필터·정렬 등을 덮는 회귀 근거 | 세 파일 모두 `describe.skip`(`posts.integration.spec.ts:78`, `categories.integration.spec.ts:56`, `tags.integration.spec.ts:58`)이라 현재 코드에서 실행된 적이 없다. `tags.integration.spec.ts:456`은 글이 연결된 태그 삭제를 204로 기대하지만 서비스는 409를 낸다(`tags.service.ts`, `tags.service.spec.ts:187`) | 케이스 목록으로만 쓰고 회귀 근거에서 뺀다. 기준선은 [작업 0](#작업-순서)에서 실제 실행 결과로 기록 |
| 변경 명세 변경 표 "관리자 API 미인증 응답: 이관 전 로그인 화면으로 리다이렉트" | 전부 리다이렉트 | 쓰기(server action)는 `/auth/signin?error=SessionExpired&callbackUrl=…`로 이동(`lib/auth.ts:101-117`), 웹 `/api/admin/*` Route Handler는 이미 401 JSON(`app/api/admin/uploads/pre-signed/route.ts:27-39`) | 변경 명세 행 수정 |
| 변경 명세 유지 표 "로그인 뒤 원래 보던 관리자 주소로 돌아간다" | 확인된 사실 | 관리자 레이아웃은 `/auth/signin?callbackUrl=%2Fadmin` 고정(`apps/blog-web/app/admin/layout.tsx:68-70`). 원래 주소를 넘기는 곳은 재인증 경로(`lib/auth.ts:101-117`)뿐 | 변경 명세에서 "변경" 행으로 옮김(2026-11-05 설계 승인 내용) |

## 환경별 값

한 Worker(`mion-blog`)가 workers.dev 주소와 운영 커스텀 도메인을 함께 받는다. 그래서 값은 배포 시점마다 하나이고, 전환 작업에서 바꾼다.

| 값 | 로컬(`astro dev`, pool-workers) | 미리보기(workers.dev, 전환 전) | 운영(전환 후) |
| --- | --- | --- | --- |
| `SITE_URL`(canonical·RSS·sitemap·OAuth `redirect_uri`·출처 검사 기준) | `http://localhost:4321` | `https://mion-blog.whddbs311.workers.dev` | `https://mion-space.dev` |
| OAuth 콜백 | `{SITE_URL}/api/auth/callback/google` | 같음(Google 콘솔 등록 필요, 승인 후) | 같음(지금 등록된 경로와 같다고 보지만 미확인) |
| `ROBOTS_INDEXABLE` | `false` | `false`(전체 `Disallow: /`) | `true`(`Allow: /`, `Disallow: /admin`, `/api`) |
| `MEDIA_BASE_URL`(공개 URL 조립·URL→키 추출 기준) | `http://localhost:4321/local-media/` | `https://mion-blog.whddbs311.workers.dev/local-media/`(사용자 결정 11) | `https://media.mion-space.dev/` |
| `SERVE_MEDIA_FROM_BINDING` | `true`(로컬 R2에 올린 파일을 `GET /local-media/{key}`로 보여 줌) | `true`(사용자 결정 11) | `false`(404) |
| 세션 쿠키 이름 | `__Host-mion-session`, 로컬 http에서 안 되면 `mion-session`(작업 1에서 확인) | `__Host-mion-session` | `__Host-mion-session` |
| `ADMIN_WRITES_FROZEN` | `false` | `false` | 전환 7일 동안 `true`, 이후 `false` |
| D1 / R2 binding | pool-workers·miniflare 로컬 | 원격 `mion-blog` / `mion-blog-media`(운영과 같은 자원) | 같음 |

- 지금 `robots.ts`는 `NODE_ENV`가 production이 아니면 전체 차단이다(`apps/blog-web/app/robots.ts:4-20`). 새 앱은 같은 판단을 `ROBOTS_INDEXABLE`로 명시한다.
- 미리보기는 운영과 같은 D1·R2를 쓴다. 최종 재적재(작업 49)가 D1을 새로 만들므로 미리보기에서 쓴 글은 사라지지만, R2에 올린 시험 이미지는 남는다. 미리보기 확인이 끝나면 시험 글을 관리자 화면에서 삭제해(삭제 시 이미지도 지움) 정리하고, 남은 `draft/` 객체는 목록을 보여 주고 승인 후 지운다.
- 전환 후 workers.dev 주소는 `workers_dev = false`로 끈다. 켜 두면 `SITE_URL`이 운영 주소라 그 주소의 관리자 쓰기가 모두 출처 검사에서 거부되고 canonical만 운영을 가리키는 사본이 생긴다.
- 전환 뒤 배포는 `pnpm --filter blog deploy:prod`로만 한다(운영 vars를 `--var`로 넣는다). 미리보기 배포 스크립트는 전환 때 지웠다(같은 Worker라 운영을 덮어쓴다). 전환 전 미리보기 배포는 `pnpm --filter blog deploy:preview`로만 했다. `wrangler.jsonc`의 `vars`는 로컬 값이라, 이 스크립트가 `--var`로 `SITE_URL`·`MEDIA_BASE_URL`을 미리보기 값으로 바꾼다. 맨 `wrangler deploy`는 로컬 값으로 배포한다.
- 미리보기 적재는 커버 URL을 미리보기 `MEDIA_BASE_URL`로 바꾼다(`MEDIA_TO=https://mion-blog.whddbs311.workers.dev/local-media/`를 `build-sql.ts`·`compare.ts`에 같이 준다). R2 키는 두 주소에서 같아(`posts/{id}/thumbnail/…`), 전환 때 재적재(작업 49)가 접두사만 `https://media.mion-space.dev/`로 바꾼다.
- 업로드 허용 MIME(`UPLOAD_ALLOWED_MIME`)은 Doppler `prd_api`·`local_api` 모두 3개로 설정돼 있고 svg는 없다(2026-11-05 확인, 값 미출력). 새 앱에도 같은 값을 `vars`로 옮긴다.

## 앱 구조

```text
apps/blog/src/
├── middleware.ts            # 경로 정규화 → 관리자 보호 → 출처 검사 → 편집 동결
├── pages/                   # route 계층: 화면(.astro)과 API 라우트(.ts)
│   ├── index.astro, posts/, about.astro, privacy-policy.astro, terms.astro
│   ├── feed.xml.ts, sitemap.xml.ts, robots.txt.ts, local-media/[...key].ts
│   ├── auth/signin.astro, auth/google.ts, auth/signout.ts, api/auth/callback/google.ts
│   ├── admin/…(.astro)      # 화면, React island 포함
│   └── api/admin/…(.ts)     # 관리자 쓰기
├── server/                  # use-case: posts, categories, tags, settings, uploads, auth(session·oauth·guard)
├── db/schema.ts             # Drizzle sqlite-core
├── lib/                     # slug, render(renderPostHtml), callback-url, http(응답 헬퍼)
└── components/              # Astro 공개 컴포넌트, admin island(기존 React 이식)
```

- 페이지와 API 라우트는 `server/`만 부르고, `server/`만 D1·R2에 접근한다. 기존 `docs/backend`·`docs/frontend` 규칙은 옛 앱용이라 새 앱에 그대로 적용하지 않는다(옛 코드 정리 PR에서 문서를 바꾼다).

## 기존 항목 → 새 라우트 대응표

### 화면

| 기존 | 기존 데이터 출처 | 새 위치 | 새 데이터 출처 |
| --- | --- | --- | --- |
| `/` | blog-api 글 목록 2회(최근 7, 인기 7), 카테고리·태그 목록, `unstable_cache` 300초 | `pages/index.astro` | `server/posts` 최근 7·인기 5, `server/categories`·`tags`. 캐시 없음(요청마다 D1) |
| `/posts` | `GET /api/posts`, 사이드바 카테고리 50·태그 30 | `pages/posts/index.astro` | `server/posts.listPublished`, 사이드바 같은 개수 |
| `/posts/[slug]` | `GET /api/posts/:slug`(메타 `trackView=false`, 본문 `true`) | `pages/posts/[slug].astro` | `server/posts.getPublishedBySlug` 1회 + 조회수 1 증가 |
| `/about`, `/privacy-policy`, `/terms` | 정적(`/about`은 `SITE_URL`만) | 같은 경로 `.astro` | 정적 |
| `/auth/signin` | next-auth `signIn('google')` | `pages/auth/signin.astro` | 버튼이 `GET /auth/google?callbackUrl=…` |
| `/admin` | blog-api 목록 4회의 `meta.total` + 초안 5 | `pages/admin/index.astro` | `server/admin-overview`(집계 4 + 초안 5) |
| `/admin/posts` | `GET /api/admin/posts`(blog-api) `page`·`search`·`published`, `limit=postsPerPage` | `pages/admin/posts/index.astro` | `server/posts.listForAdmin` |
| `/admin/posts/new` | 카테고리·태그 `limit:100`, `draftUuid=uuidv7()` | `pages/admin/posts/new.astro` | 같음 |
| `/admin/posts/[slug]/edit` | `GET /api/admin/posts/:slug`(조회수 증가) + 카테고리·태그 | `pages/admin/posts/[slug]/edit.astro` | `server/posts.getForAdmin`(조회수 증가 없음, 사용자 결정 1) |
| `/admin/categories` | blog-api 목록 `limit:20, sort:name asc` | `pages/admin/categories.astro` | `server/categories.listForAdmin` |
| `/admin/tags` | blog-api 목록 `limit:30, sort:name asc` | `pages/admin/tags.astro` | `server/tags.listForAdmin` |
| `/admin/settings` | `GET /api/admin/settings` | `pages/admin/settings.astro` | `server/settings.get` |

### 쓰기·인증

| 기존 | 새 엔드포인트 |
| --- | --- |
| `createAdminPostAction` → `POST /api/posts` | `POST /api/admin/posts` |
| `updateAdminPostAction` → `PUT /api/posts/:slug` | `PUT /api/admin/posts/{id}` |
| `deleteAdminPostAction` → `DELETE /api/posts/:slug` | `DELETE /api/admin/posts/{id}` |
| `create/update/deleteAdminCategoryAction` → `/api/categories[/:slug]` | `POST /api/admin/categories`, `PUT·DELETE /api/admin/categories/{id}` |
| `create/update/deleteAdminTagAction` → `/api/tags[/:slug]` | `POST /api/admin/tags`, `PUT·DELETE /api/admin/tags/{id}` |
| `updateAdminBlogInfoAction`, `updateAdminPostSettingsAction` → `PATCH /api/admin/settings` | `PATCH /api/admin/settings` |
| `POST /api/admin/uploads/pre-signed` + 브라우저의 S3 `PUT` | `POST /api/admin/uploads`(파일을 직접 받음) |
| `GET·POST /api/auth/[...nextauth]` | `GET /auth/google`, `GET /api/auth/callback/google`, `POST /auth/signout` |

- 경로 식별자는 slug 대신 `id`를 쓴다. 발행 전 글은 제목을 바꾸면 slug가 바뀌고, 카테고리·태그 수정은 slug 자체를 바꾸기 때문이다. 화면 주소(`/admin/posts/[slug]/edit`)는 그대로 둔다.

### 클라이언트 동작(island·스크립트로 옮김)

| 기존 | 동작 | 새 위치 |
| --- | --- | --- |
| `posts-filter.tsx:27-38`, `posts-content.tsx:80-129` | 검색어 500ms 대기 후 주소 반영·page 1로, `sortPreset`(latest·viewed, "Most Liked"는 최신순), 필터 바꾸면 옛 키 `category`·`tag` 삭제 | `/posts` 필터 island |
| `copy-link-button.tsx` | 글 주소 복사 | 상세 화면 스크립트 |
| `status-banner.tsx:47-61` | 3.5초 뒤 사라지며 주소의 `status`·`message` 삭제 | 관리자 배너 island |
| `delete-confirm-button.tsx:36-60` | 확인 대화상자, 실패 `alert`, 성공 시 `?status=deleted&message=` | 관리자 삭제 버튼 island |
| `editorial-auth-links.tsx` | 관리자면 `/admin` 링크와 로그아웃 | 공개 헤더(서버 렌더 + 로그아웃 form) |
| `admin-sidebar.tsx`, `admin-mobile-nav.tsx` | 관리자 메뉴, 이름·이메일 | 관리자 레이아웃 |

### 옮기지 않는 것(호출 0건 또는 앱 통합으로 불필요)

| 기존 | 이유 |
| --- | --- |
| 웹 `GET /api/admin/{posts,categories,tags,overview}` | 화면 호출 0건(검증 스크립트만 호출), 화면이 서버에서 직접 조회 |
| `verify-server-routing.mjs`의 blog-api 경로 404·GET Route Handler 401 확인, `run-local-validation.py`(옛 두 앱 기동기) | 확인 대상 경로가 없어짐. 나머지 assertion은 새 검증 스크립트로 옮김 |
| `syncSettingsFromServer`, blog-api `GET /api/site/settings`, 웹 `postsApi.getPostById`(`/api/posts/id/:id`, 컨트롤러에 없음) | 호출 0건 |
| next-auth의 나머지 경로(`/api/auth/session`, `csrf`, `providers`, `signin`, `signout`) | 새 앱에서 404. 설정 화면의 `/api/auth/signin` 리다이렉트(`app/admin/settings/page.tsx:19-25`)는 middleware의 `/auth/signin` 리다이렉트로 대체 |
| blog-api 전체(`/api/posts`, `/api/admin/posts`, `/api/categories`, `/api/tags`, `/api/admin/settings`, `/api/uploads/pre-signed`), Vercel OIDC 호출자 인증 | 앱 하나로 합쳐짐. 공개 주소가 아니라 301 대상 없음 |

## 공통 계약

### 응답 형식

- 성공: `{ "success": true, "data": … }`. 생성은 `201`, 수정·삭제는 `200`.
- 실패: `{ "success": false, "error": { "code": "…", "message": "…" } }`. `message`는 지금 화면에 나오는 한국어 문구를 그대로 쓴다. `400 VALIDATION_FAILED`에는 칸별 오류 `fieldErrors: Record<string, string[]>`(지금 화면 타입, `lib/admin/settings-actions.ts:39-54`)를 함께 담는다(사용자 결정 2). 설정 폼이 칸 아래에 표시한다.
- island는 실패 응답의 `error.message`를 지금 server action 반환값(`{ success, error }`, `SettingsActionState`)과 같은 자리에 넣는다.
- island의 상태별 처리:

| 응답 | 처리 | 근거 |
| --- | --- | --- |
| `401` | `/auth/signin?error=SessionExpired&callbackUrl={화면 주소}`로 이동. 화면 주소는 `/admin/posts/new`, `/admin/posts/{slug}/edit`, `/admin/posts`, `/admin/categories`, `/admin/tags`, `/admin/settings` | 지금 재인증 이동(`lib/auth.ts:101-117`, `features/posts/server/actions.ts:25,60,89`, `categories-actions.ts:11-19`, `settings-actions.ts:56-68`) |
| `403 ORIGIN_MISMATCH` | 오류 문구 "요청 출처가 올바르지 않아요." | 새 동작(정상 화면에서는 생기지 않음) |
| `423 EDIT_FROZEN` | 오류 문구 "전환 기간이라 편집이 잠겨 있어요." | 사용자 결정 7 |
| 그 밖의 실패 | 화면별 지금 방식(글: `?status=error&message=` 이동, 카테고리·태그: 폼 오류 문구, 삭제 실패는 `alert`, 설정: 폼 상태) | 지금 server action·`delete-confirm-button.tsx:36-60` |

### 오류 코드

| 상태 | code | 조건 |
| --- | --- | --- |
| 400 | `VALIDATION_FAILED` | 본문 형식·필수값·길이·형식 위반 |
| 400 | `CATEGORY_NOT_FOUND`, `TAG_NOT_FOUND` | 글 저장 시 없는 카테고리·태그(지금도 400) |
| 400 | `INVALID_UPLOAD_KEY` | 커버 키가 `draft/{draftUuid}/`로 시작하지 않음, 소개 이미지 draft 키 형식 위반 |
| 400 | `UPLOAD_MIME_NOT_ALLOWED`, `UPLOAD_TOO_LARGE` | 업로드 정책 위반 |
| 401 | `UNAUTHORIZED` | `/api/admin/*`에 세션 없음·만료·위조·`ADMIN_EMAIL` 불일치 |
| 403 | `ORIGIN_MISMATCH` | GET·HEAD가 아닌 요청의 `Origin`이 `SITE_URL` origin과 다르거나 없음 |
| 404 | `POST_NOT_FOUND`, `CATEGORY_NOT_FOUND`, `TAG_NOT_FOUND` | 경로의 `id`가 없음 |
| 409 | `CATEGORY_SLUG_TAKEN`, `CATEGORY_NAME_TAKEN`, `TAG_SLUG_TAKEN`, `TAG_NAME_TAKEN` | 중복(slug 먼저 검사) |
| 409 | `CATEGORY_IN_USE`, `TAG_IN_USE` | 연결된 글이 있어 삭제 불가(초안 포함) |
| 423 | `EDIT_FROZEN` | `ADMIN_WRITES_FROZEN=true`일 때 모든 관리자 쓰기 |
| 500 | `STORAGE_ERROR`, `INTERNAL_ERROR` | R2·D1 실패. 원문 오류는 로그에만 |

### middleware 처리 순서

1. 경로를 디코드·소문자로 정규화한다.
2. `/admin`·`/admin/*`·`/api/admin/*`이면 세션 쿠키를 복호화하고 `email === ADMIN_EMAIL`을 확인한다. 실패하면 페이지는 `307 /auth/signin?callbackUrl={원래 경로+쿼리}`(만료면 `&error=SessionExpired`, 지금도 307: `verify-server-routing.mjs:52-53`), API는 `401 UNAUTHORIZED`.
3. GET·HEAD가 아닌 모든 요청은 경로와 무관하게 `Origin`을 검사한다(사용자 결정 12). 실패하면 `403 ORIGIN_MISMATCH`.
4. `/api/admin/*` 쓰기이고 `ADMIN_WRITES_FROZEN=true`이면 `423 EDIT_FROZEN`.

- 관리자 확인이 출처 검사보다 먼저라서, 출처 검사·동결 테스트는 유효한 관리자 세션 쿠키를 붙여 보낸다.

## API 계약

### 인증

#### Google 로그인 시작(`GET /auth/google`)

- 인증: 없음.
- 요청: `callbackUrl` 선택. `getSafeCallbackUrl` 규칙(`/`로 시작, `//`·`\`·제어문자 금지, `%xx` 반복 디코드 후 재검사, 실패하면 `/admin`)을 그대로 옮긴다(`apps/blog-web/lib/auth/callback-url.ts:11-50`).
- 응답: `302`, `Location`은 `https://accounts.google.com/o/oauth2/v2/auth?…`로 `response_type=code`, `client_id`, `redirect_uri={SITE_URL}/api/auth/callback/google`, `scope=openid email profile`, `state`, `code_challenge`, `code_challenge_method=S256`을 담는다.
- `Set-Cookie`: `__Host-mion-oauth`(state·code_verifier·callbackUrl을 세션과 같은 방식으로 암호화), `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`.

#### Google 로그인 콜백(`GET /api/auth/callback/google`)

- 인증: 없음. 임시 쿠키 필요.
- 성공(`ADMIN_EMAIL` 일치): `302 Location={쿠키의 callbackUrl을 재검증한 값, 없으면 /admin}`, `Set-Cookie` 세션 발급 + 임시 쿠키 `Max-Age=0`. `users`를 `google_id`로 upsert(같은 `id` 유지). 지금처럼 바뀐 값만 갱신한다: `image`가 없으면 기존 값 유지, 바뀐 것이 있을 때만 `updated_at` 갱신, 없으면 `role=ADMIN`으로 생성(`apps/blog-api/src/auth/strategies/jwt.strategy.ts:212-238`). 편집 동결 중에도 이 갱신은 허용한다(롤백 때 잃어도 되는 이름·사진 값).
- 관리자 아님: `302 /auth/signin?error=AccessDenied`, 세션 쿠키 없음, 임시 쿠키 삭제, `users` 쓰기 없음.
- Google이 `error=access_denied`(사용자 취소)를 돌려줘도 design.md 단위 표대로 `302 /auth/signin?error=OAuthError`(일반 오류 문구). `AccessDenied`는 관리자가 아닌 계정에만 쓴다.
- 그 밖의 실패(임시 쿠키 없음·만료, state 불일치·재사용, `code` 없음, 토큰 교환 실패, ID 토큰 `iss`·`aud`·`exp` 위반, `email`·`sub` 없음, `email_verified=false`): `302 /auth/signin?error=OAuthError`. 500을 내지 않고 Google 원문을 넘기지 않는다.

#### 로그아웃(`POST /auth/signout`)

- 인증: 없음(세션이 없어도 같은 응답). 출처 검사 대상.
- 응답: `303 Location=/`, `Set-Cookie: __Host-mion-session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`.
- 접두사 없는 `mion-session`은 `SITE_URL`이 `http://localhost`일 때만 읽고 쓴다. 그 밖의 환경에서는 이 이름의 쿠키를 무시한다.
- 다른 출처: `403 ORIGIN_MISMATCH`, 쿠키 유지.
- 공개 헤더의 로그아웃 버튼은 이 경로로 가는 `<form method="post">`다.

#### 로그인 화면(`GET /auth/signin`)

- 관리자 세션이 있으면 `302 {안전한 callbackUrl}`.
- `error=AccessDenied`면 권한 없음 문구, 그 밖의 `error` 값은 "로그인 도중 오류가 발생했어요."(`role=alert`). 지금과 같다.
- `<meta name="robots" content="noindex, nofollow">`, canonical·OG 없음.

### 업로드

#### 이미지 업로드(`POST /api/admin/uploads`)

- 인증: 관리자 세션, 출처 검사, 편집 동결.
- 요청 `multipart/form-data`:

| 필드 | 필수 | 규칙 |
| --- | --- | --- |
| `file` | 필수 | 파일. 크기는 받은 바이트 수로 검사(지금은 클라이언트가 보낸 `size`를 믿음) |
| `type` | 필수 | `thumbnail` \| `content` \| `about` |
| `draftUuid` | 필수 | UUIDv7 |

- 정책: MIME이 `UPLOAD_ALLOWED_MIME`(쉼표 목록, 비면 모두 허용)에 없으면 `400 UPLOAD_MIME_NOT_ALLOWED`, `UPLOAD_MAX_SIZE`(기본 10MB) 초과면 `400 UPLOAD_TOO_LARGE`.
- 키: `draft/{draftUuid}/{type}/{Date.now()}-{정규화한 이름}{확장자}`. 이름 정규화·확장자 규칙은 `upload-policy.service.ts:63-114`를 그대로 옮긴다(한글 이름은 `image`가 된다). R2 `put`에 `httpMetadata.contentType = file.type`.
- 응답 `201`: `{ success: true, data: { objectKey, publicUrl } }`, `publicUrl = MEDIA_BASE_URL + objectKey`.
- 화면: 지금 `pre-signed` 요청 → `PUT` 두 단계를 이 요청 하나로 바꾼다. 브라우저 쪽 사전 검사(jpeg·png·webp, 10MB, `features/uploads/client/upload-image.ts:9-34`)와 오류 문구는 그대로 둔다.

### 관리자 글

공통 본문 필드(JSON):

| 필드 | 생성 | 수정 | 규칙 |
| --- | --- | --- | --- |
| `title` | 필수 | 필수 | 1~200자 |
| `content` | 필수 | 필수 | 생성: 1자 이상, 원문 그대로. 수정: trim 결과가 비면 기존 본문 유지(지금 `form-parser.ts:47-69`) |
| `excerpt` | 선택, nullable | 선택, nullable | 500자 이하. 수정 때 빠지거나 null이면 null로 저장(지금 `posts.service.ts:333`) |
| `coverImage` | 선택, nullable | 선택, nullable | http(s) URL. 수정 때 빠지거나 null이면 커버 제거 |
| `coverImageKey` | 선택 | 선택 | 새로 올린 커버의 `objectKey` |
| `published` | 필수 | 필수 | boolean |
| `categoryId` | 필수 | 필수 | UUIDv7 |
| `tagIds` | 필수 | 필수 | 1개 이상, 각 UUIDv7. 중복은 제거하고 저장 |
| `draftUuid` | 선택 | 선택 | UUIDv7 |

- 화면 쪽 검사(태그 1개 이상, 업로드 중 제출 막기, `post-form.tsx:246-266`)는 그대로 둔다.
- 공백 처리는 지금 `features/posts/server/form-parser.ts` 규칙을 서버가 그대로 적용한다: `title`·`excerpt`·`coverImage`는 trim, 빈 문자열은 없는 값. `content`는 생성 때 원문, 수정 때 trim.
- `tagIds`에 같은 값이 두 번 있으면 지금처럼 `400 TAG_NOT_FOUND`(존재 확인 개수가 맞지 않아 실패, `posts.service.ts:522-529`). 그래서 `post_tags` PK 위반은 생기지 않는다.
- `coverImageKey`가 있어도 `draftUuid`가 없으면 확정하지 않고 받은 `coverImage`를 그대로 저장한다(지금 `uploads.service.ts:93-95`).
- 본문 draft 이미지는 `MEDIA_BASE_URL` + `draft/{이번 요청 draftUuid}/content/`로 시작하는 URL만 옮기고, URL 끝은 공백·`)`·`"`·`'`·`<`·`>` 앞에서 끊는다(`content-image-finalizer.ts:106,175`). 다른 `draftUuid`의 URL은 그대로 둔다.

#### 글 생성(`POST /api/admin/posts`)

- 처리: 카테고리·태그 존재 확인(없으면 `400`, 저장소 작업 전) → 커버 키 검사 → `id = uuidv7()` 선발급 → slug 생성(`generateSlug` → `generateEnglishSlug` → `'post'`, 겹치면 `-1`·`-2`) → 커버·본문의 draft 이미지를 `posts/{id}/{type}/…`로 복사하고 URL 치환 → `db.batch([posts insert, post_tags insert, 카테고리·태그 post_count 재계산])` → 성공하면 draft 원본 삭제, 실패하면 이번에 복사한 객체만 삭제.
- `published=true`면 `published_at = now`.
- 응답 `201`: `{ success: true, data: { id, slug } }`. 화면은 지금처럼 `/admin/posts?status=created`로 이동한다.
- 실패 시 화면은 지금처럼 `/admin/posts/new?status=error&message=…`로 이동한다.

#### 글 수정(`PUT /api/admin/posts/{id}`)

- slug: 저장돼 있던 `published`가 `true`면 제목이 바뀌어도 유지(사용자 결정 3). `false`면 제목이 바뀔 때 자기 글을 빼고 다시 만든다.
- `published_at`:

| 저장돼 있던 값 → 요청 | 결과 |
| --- | --- |
| 미발행 → 발행 | `now` |
| 발행 → 미발행 | `null` |
| 발행 → 발행 | 유지 |

- 처리: 없는 `id`면 `404` → 카테고리가 바뀐 경우 존재 확인, 태그 존재 확인(`posts.service.ts:322-328`) → 커버 키 검사 → draft 이미지 복사 → `db.batch([posts update(`updated_at = now`), post_tags 교체, 이전·새 카테고리와 태그 합집합 post_count 재계산])` → 성공하면 draft 원본, 바뀐 이전 커버, 본문에서 빠진 `posts/{id}/content/` 이미지를 삭제. 실패하면 이번에 복사한 객체만 삭제.
- `post_count`를 다시 셀 때 해당 카테고리·태그의 `updated_at`도 지금처럼 바뀐다(`drizzle-categories.repository.ts:281-284`, `drizzle-tags.repository.ts:301-304`). 생성·삭제도 같다.
- 이미지 키 추출은 `MEDIA_BASE_URL`로 시작하는 URL만 한다. 다른 주소(옛 Supabase 주소, 외부 링크)는 키가 없다고 보고 지우지 않는다.
- 응답 `200`: `{ success: true, data: { slug } }`. 화면은 `/admin/posts?status=updated`로 이동한다. 실패하면 `/admin/posts/{기존 slug}/edit?status=error&message=…`.
- `404 POST_NOT_FOUND`: 없는 `id`.

#### 글 삭제(`DELETE /api/admin/posts/{id}`)

- 처리: `db.batch([post_tags delete, posts delete, post_count 재계산])` → 커버와 `posts/{id}/content/` 이미지 삭제(삭제 실패는 경고 로그만).
- 응답 `200`: `{ success: true }`. 화면은 `/admin/posts?status=deleted`로 이동한다. 실패하면 `/admin/posts?status=error&message=…`.
- `404 POST_NOT_FOUND`.

### 관리자 카테고리

#### 카테고리 생성(`POST /api/admin/categories`)

- 본문: `name` 필수 1~50자, `slug` 필수 `^[a-z0-9]+(?:-[a-z0-9]+)*$` 100자 이하, `description` 선택 500자 이하, `color` 선택 `#RRGGBB`. `color`는 지금처럼 검증만 하고 저장하지 않는다(컬럼 없음, `categories.service.ts:82`).
- 공백: `name`·`slug`는 받은 그대로, `description`·`color`는 trim 후 빈 값이면 없는 값(`categories-actions.ts:103-108`).
- 응답 `201`: `{ success: true, data: { id } }`. 중복은 slug 먼저 `409 CATEGORY_SLUG_TAKEN`, 다음 `409 CATEGORY_NAME_TAKEN`(대소문자 구분).
- slug는 지금처럼 화면 폼이 `generateSlug(name)`으로 채운다.

#### 카테고리 수정(`PUT /api/admin/categories/{id}`)

- 본문: 생성 필드 모두 선택. 값이 바뀐 `name`·`slug`만 자기 자신을 빼고 중복 검사하며, 수정은 지금처럼 이름을 먼저 검사한다(`categories.service.ts:109-115`). 빈 `description`은 무시돼 지울 수 없다(지금과 같음). `updated_at` 갱신.
- 응답 `200`: `{ success: true }`. `404 CATEGORY_NOT_FOUND`, `409` 중복.

#### 카테고리 삭제(`DELETE /api/admin/categories/{id}`)

- 연결된 글(초안 포함)이 있으면 `409 CATEGORY_IN_USE`. 없으면 삭제 후 `200 { success: true }`. `404 CATEGORY_NOT_FOUND`.

### 관리자 태그

#### 태그 생성(`POST /api/admin/tags`)

- 본문: `name` 필수 1~30자, `slug` 필수 같은 정규식 50자 이하.
- 응답 `201`: `{ success: true, data: { id } }`. `409 TAG_SLUG_TAKEN` → `409 TAG_NAME_TAKEN` 순서.

#### 태그 수정(`PUT /api/admin/tags/{id}`)

- 본문: 생성 필드 모두 선택. 바뀐 값만 중복 검사(이름 먼저, `tags.service.ts:103-109`). `200 { success: true }`, `404`, `409`.

#### 태그 삭제(`DELETE /api/admin/tags/{id}`)

- `post_tags`에 연결이 하나라도 있으면(초안 포함) `409 TAG_IN_USE`. 없으면 `200 { success: true }`. `404 TAG_NOT_FOUND`.

### 관리자 설정

#### 설정 수정(`PATCH /api/admin/settings`)

- 본문(모두 선택): `siteTitle` 1~60자, `siteDescription` 1~160자, `siteUrl` http(s) URL이고 최상위 도메인 필요(지금 `IsUrl` 기본값, `update-settings.dto.ts`), `postsPerPage` 정수 5~50, `profileImageUrl` http(s) URL, `profileImageRemove` boolean.
- 처리: 저장값과 다른 필드만 모아 key 단위 upsert(`site_title`, `site_description`, `site_url`, `posts_per_page`, `profile_image_url`), `updated_by = 세션 sub`. 바뀐 것이 없으면 쓰지 않고 현재 값을 돌려준다.
- 소개 이미지:
  - `profileImageRemove=true`: `''` 저장 후 이전 객체 삭제.
  - `profileImageUrl`이 `MEDIA_BASE_URL` 아래 `draft/{uuid}/about/…`: `about/{파일명}`으로 복사 → 저장 → draft·이전 객체 삭제. 형식이 맞지 않으면 `400 INVALID_UPLOAD_KEY`.
  - `/draft/`가 들어 있지만 `MEDIA_BASE_URL` 아래 draft 키로 읽히지 않는 URL: 지금처럼 `400 INVALID_UPLOAD_KEY`(`settings.service.ts:145`, `uploads.service.ts:173-215`).
  - 그 밖의 URL: 그대로 저장.
  - 지금은 이전 객체를 DB 저장 전에 지운다(`settings.service.ts:137-149`). 새 앱은 저장 성공 뒤에 지운다. 저장이 실패해도 설정이 지워진 객체를 가리키지 않게 하려는 순서 변경이고, 성공 경로의 결과는 같다.
- 응답 `200`: `{ success: true, data: { siteTitle, siteDescription, siteUrl, postsPerPage, profileImageUrl } }`. 폼이 `updatedSettings`로 화면을 갱신하므로 설정 전체를 돌려준다.
- 행이 없을 때 기본값: `siteTitle "Mion's Blog"`, `siteDescription "개발과 기술에 관한 이야기를 나눕니다."`, `siteUrl "http://localhost:3000"`, `postsPerPage 10`, `profileImageUrl null`(`settings-response.mapper.ts:11-17`). `posts_per_page`가 숫자가 아니거나 0이면 기본값.
- 검증 실패 시 `fieldErrors`를 담아 폼이 칸별 문구를 보여 준다(사용자 결정 2).
- 설정 화면의 프로필 카드(`app/admin/settings/page.tsx:71-76`)는 이름·이메일·사진·역할을 쓴다. 세션에는 사진이 없으므로(design.md D1 세션 내용) 화면이 세션 `sub`로 `users`를 조회해 채운다.

## 화면 계약(유지할 기존 동작)

### 공개 화면

| 화면 | 고정할 동작 | 근거 |
| --- | --- | --- |
| `/` | 대표 1 + 최근 6(발행 글 `published_at desc` 7건), 인기 5(`view_count desc` 7건 중 앞 5), 카테고리 8(이름순, 발행 글 수 > 0), 태그 12(이름순) | `apps/blog-web/app/(site)/page.tsx:171-204,290-298` |
| `/posts` 쿼리 | `page`·`limit`이 정수 > 0이 아니면 기본값(1, 12). `order`가 `asc`·`desc`가 아니면 `desc`. `category`→`categorySlug`, `tag`→`tagSlug` 별칭. 빈 값은 없는 것으로 봄 | `query-utils.ts:21-45,85-96` |
| `/posts` 잘못된 값 | `sort`가 `createdAt·updatedAt·publishedAt·title·viewCount` 밖이거나 `limit > 100`이면 `200`으로 목록 자리에 오류 문구(지금은 blog-api 400을 받아 `initialError`로 표시) | `page.tsx:133-157`, `post-query.dto.ts:33-50` |
| `/posts` 범위 | `page > 1`이고 `page > totalPages`면 404. 없는 카테고리·태그 slug는 빈 목록 | `page.tsx:146-150`, `posts.service.ts:103-119` |
| `/posts` 검색 | 제목·본문·요약 `LIKE '%검색어%'`(`%`·`_` 이스케이프 안 함, 지금과 같음). 대소문자 무시는 ASCII만(Postgres `ILIKE`와 달리 비ASCII 라틴 문자는 구분, 한글은 영향 없음) | `drizzle-posts.repository.ts:105-114` |
| `/posts` 사이드바 | 카테고리 50·태그 30, 글 수 많은 순, 카테고리는 발행 글 수 > 0만 | `get-posts-sidebar-data.ts:15-21` |
| `/posts/[slug]` | 발행 글 `200`, 없거나 미발행이면 `404`(조회수 그대로). 성공 시 `view_count + 1`, `updated_at` 유지, 화면의 조회수는 증가한 뒤 값(`posts.service.ts:158-159`). 조회수 증가 실패는 로그만 남기고 화면은 그림. 링크 복사 버튼 | `posts.service.ts:146-164`, `drizzle-posts.repository.ts:422-432` |
| 글 수(postCount) | 카테고리 목록·홈·사이드바는 발행 글만 실시간 계산. 태그 목록은 `post_tags` 전체(초안 포함). 저장 컬럼 `post_count`는 초안 포함이고 `sort=postCount`에 쓴다 | `drizzle-categories.repository.ts:67,81-84`, `drizzle-tags.repository.ts:67,81-85` |
| `/feed.xml` | 변경 명세 RSS 계약, 정렬은 지금처럼 `created_at desc`(정렬을 넘기지 않아 기본값, `feed.xml/route.ts:26`, `posts.service.ts:33`), `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` | `app/feed.xml/route.ts:11,18-19` |
| `/sitemap.xml` | 변경 명세 계약. 고정 경로 `/`(1.0, daily), `/posts`(0.8, daily), `/about`(0.5, monthly), `/terms`(0.3, monthly), `/privacy-policy`(0.3, monthly), 글은 0.7 weekly, `created_at desc` 50개씩 모두 | `app/sitemap.ts:20-98` |
| `/robots.txt` | `ROBOTS_INDEXABLE=true`면 `Allow: /`, `Disallow: /admin`, `Disallow: /api`, 아니면 `Disallow: /`. 둘 다 `Sitemap: {SITE_URL}/sitemap.xml`, `Host: {SITE_URL}` | `app/robots.ts:7-33` |
| `/posts` 잘못된 값 문구 | `/posts?limit=101`에 "포스트를 불러올 수 없습니다" 포함 | `verify-server-routing.mjs` |
| 404 화면 | 전역 404, 글 상세 404 | `app/not-found.tsx`, `app/(site)/posts/[slug]/not-found.tsx` |

- 이름순 정렬: 운영 DB 정렬 규칙은 `en_US.UTF-8`, D1은 BINARY다. 운영 이름(태그 `AI | Infra | Nest.js | Next.js | Security`, 카테고리 `Skills | 개발`)은 두 규칙에서 순서가 같다(2026-11-05 읽기 전용 조회). 소문자로 시작하는 이름이 생기면 순서가 달라질 수 있다.
- 운영 공개 글 21편은 모두 `published_at`이 있다(2026-11-05 조회: 발행 글 중 `published_at` null 0건). 그래서 Postgres와 SQLite의 null 정렬 차이는 공개 목록에 나타나지 않는다. 같은 값끼리의 순서를 고정하려고 모든 목록에 `id desc`를 두 번째 정렬로 붙인다.

### 관리자 화면

| 화면 | 고정할 동작 | 근거 |
| --- | --- | --- |
| 레이아웃 | 사용자 이름·이메일 표시, 세션 만료까지 0초 초과 10분 미만이면 경고 배너(서버 렌더 때 1회 계산), noindex | `app/admin/layout.tsx:12-21,76-82,109-114`, `admin-sidebar.tsx:72-78` |
| `/admin` | 발행 글 수, 초안 수, 카테고리 수, 태그 수, 최근 초안 5개(`created_at desc`, 표시 날짜 `updated_at ?? created_at`, 편집 링크) | `features/admin/server/get-admin-dashboard.ts:36-61` |
| `/admin/posts` | `page`, `search`(trim), `published`(`true/1/yes`·`false/0/no`)만 사용, `limit = postsPerPage`, `updated_at desc` 고정, `status` 쿼리로 배너(`created`·`updated`·`deleted`·`error`+`message`) | `get-admin-posts.ts:39-75`, `status-banner.tsx:35-69` |
| `/admin/posts/new` | 카테고리·태그 각 100개, 새 `draftUuid` | `app/admin/posts/new/page.tsx:23-34` |
| `/admin/posts/[slug]/edit` | 초안 포함 조회, 없으면 404, 삭제 버튼 | `app/admin/posts/[slug]/edit/page.tsx:40-50,99-115` |
| `/admin/categories` | 20개씩, 이름순, `page`·`search`(이름 `LIKE`) | `get-admin-categories.ts:43-49`, `drizzle-categories.repository.ts:74-76` |
| `/admin/tags` | 30개씩, 나머지 같음 | `get-admin-tags.ts:43-49` |
| `/admin/settings` | 5개 필드 폼, 프로필은 세션 값 | `app/admin/settings/page.tsx:28,71-95` |

## 데이터

### D1 스키마(`apps/blog/src/db/schema.ts`)

| 테이블 | 컬럼(Postgres → D1) | 제약·인덱스 |
| --- | --- | --- |
| `users` | `id` text PK, `email` text NN, `name` text NN, `image` text, `google_id` text NN, `role` text enum `ADMIN`·`USER` NN default `USER`, `created_at`·`updated_at` integer `timestamp_ms` NN | `email`·`google_id` UNIQUE |
| `categories` | `id`, `name` NN, `slug` NN, `description`, `post_count` integer NN default 0, `created_at`, `updated_at` | `name`·`slug` UNIQUE |
| `tags` | `id`, `name` NN, `slug` NN, `post_count` NN default 0, `created_at`, `updated_at` | `name`·`slug` UNIQUE |
| `posts` | `id`, `title` NN, `slug` NN, `content` NN, `excerpt`, `cover_image`, `published` integer boolean NN default 0, `view_count` NN default 0, `category_id` NN FK→categories, `author_id` NN FK→users, `created_at`, `updated_at`, `published_at` | `slug` UNIQUE, 인덱스 `(published, published_at)`, `(published, view_count)` |
| `post_tags` | `post_id` NN FK→posts ON DELETE CASCADE, `tag_id` NN FK→tags ON DELETE CASCADE, `created_at` | PK `(post_id, tag_id)`, 인덱스 `(tag_id)` |
| `settings` | `id`, `key` NN, `value` NN, `description`, `updated_at`, `updated_by` FK→users nullable | `key` UNIQUE |

- `post_tags` PK: 지금 Postgres에는 PK가 없다(`packages/database/src/schemas/posts.ts:44-52`). 운영 데이터에 같은 `(post_id, tag_id)` 중복은 0건이다(2026-11-05 읽기 전용 조회). 새로 PK를 두고, 글 저장 때 `tagIds` 중복을 먼저 제거한다.
- 운영의 카테고리·태그 `post_count`는 실제 연결 수와 모두 같다(같은 조회). 적재 후 비교 스크립트가 이 일치를 다시 확인한다.
- 마이그레이션: `drizzle-kit generate`로 `apps/blog/migrations/`에 SQL을 만들고 `wrangler d1 migrations apply`로 적용한다(로컬은 `--local`, 원격은 승인 후).

## 트랜잭션·정합성

- 한 요청의 D1 쓰기는 `db.batch()` 하나로 묶는다(글 생성·수정·삭제, 설정 여러 key upsert). batch 안의 문장 수와 바인딩 파라미터 100개 한도에 맞춘다(태그는 최대 수십 개라 한도 안).
- R2는 D1 batch에 들어가지 않는다. 그래서 순서를 "복사 → D1 batch → 성공 시 원본·이전 객체 삭제 / 실패 시 이번에 복사한 객체만 삭제"로 고정한다. 복사한 키는 하나씩 목록에 쌓아, 중간에 실패해도 이미 복사한 객체가 보상 삭제에서 빠지지 않게 한다(지금 코드는 본문 확정이 루프 중간에 실패하면 일부가 빠진다, `posts.service.ts:207-229,262-265`).
- 삭제 실패는 경고 로그만 남기고 응답은 성공으로 둔다(지금과 같음). 남는 객체는 데이터 유실이 아니라 저장 공간 문제다.
- 동시성: 관리자 1명이라 같은 글 동시 수정은 고려하지 않는다(지금도 잠금 없음). 조회수 증가는 `UPDATE posts SET view_count = view_count + 1` 한 문장이라 동시 요청에도 누락이 없다.

## 보안·운영

- 인증·출처 검사·쿠키는 design.md D1 표 ①~⑨를 따른다. 이 문서는 HTTP 계약만 더한다.
- 로그: 오류 code와 단계만. 요청 본문(본문 MDX 포함), 쿠키, 토큰, 업로드 파일명 원문은 남기지 않는다.
- 업로드 MIME 목록이 비면 지금처럼 모두 허용한다. 대신 미리보기·운영 배포 전에 `UPLOAD_ALLOWED_MIME`이 비어 있지 않은지 확인한다(작업 48). 비어 있으면 `text/html` 같은 파일도 `media.mion-space.dev`에서 그대로 서비스된다.
- 편집 동결: `ADMIN_WRITES_FROZEN=true`면 모든 관리자 쓰기가 `423`이다. 공개 화면과 조회수 증가는 영향 없다. 옛 앱(Vercel)의 동결은 코드 변경 없이 운영 절차로 한다(관리자 1명이 편집하지 않음).

## 사용자 결정

2026-11-05 2단계 설계 검토 뒤 결정.

| # | 결정 | 이전 동작(확인된 사실) | 반영 |
| --- | --- | --- | --- |
| 1 | 관리자 편집 화면을 열어도 조회수를 올리지 않는다 | 편집 화면이 blog-api `GET /api/admin/posts/:slug`를 부르고 이 경로가 조회수를 올렸다(`admin-posts.controller.ts:54-62`, `posts.service.ts:152`) | 작업 35, `admin-pages.test.ts` |
| 2 | 설정 폼에서 칸별 오류 문구를 보여 준다 | 운영에서는 blog-api가 검증 상세를 빼고 보내 일반 문구만 나왔다(`global-exception.filter.ts:247-256`) | 공통 응답 형식, 작업 44, `admin-settings-update.test.ts` |

2026-11-06 로컬 구현 뒤 결정.

| # | 결정 | 이전 계획 | 반영 |
| --- | --- | --- | --- |
| 11 | 미리보기 커버 이미지는 로컬처럼 앱이 R2에서 내려 주는 `/local-media/{key}`로 보인다 | 미리보기도 `media.mion-space.dev`(DNS 연결 전이라 미리보기에서 커버가 비어 보임) | 환경별 값 표, 작업 48 |
| 12 | 출처 검사를 GET·HEAD가 아닌 모든 요청에 적용한다 | 관리자 경로 쓰기와 `/auth/signout`만 | middleware, `origin-check.test.ts` |
| 13 | 테스트 도구는 `@cloudflare/vitest-plugin` 1.6.0으로 유지한다(`vitest-pool-workers`의 바뀐 이름) | 설계 결정 8의 `@cloudflare/vitest-pool-workers` | 작업 1 확인 결과 |
| 14 | Astro 기본 `security.checkOrigin`은 끄고 middleware 출처 검사 하나로 둔다 | Astro 기본 검사와 middleware 검사를 함께 | `astro.config.mjs` |
| 15 | 원격 D1·R2 생성, 원격 스키마 적용, `wrangler secret` 등록, 운영 데이터 원격 D1 적재, 커버 R2 복사, workers.dev 미리보기 배포를 진행한다 | 작업 48 각 단계 승인 후 | 작업 48 |
| 16 | `SESSION_SECRET`도 Doppler로 관리한다 | Worker 비밀값에만 있음 | Doppler `prd_blog`, 미리보기 배포 결과 |
| 17 | 보안 응답 헤더를 넣는다: HSTS, CSP(`frame-ancestors 'none'` 등 최소), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. 관리자 클릭재킹 방지 우선 | 이관 전·후 모두 없음 | middleware, `security-headers.test.ts` |

## 대안

| 대안 | 선택하지 않은 이유 |
| --- | --- |
| Astro Actions(`/_actions/*`)로 관리자 쓰기 | 관리자 보호 접두사(`/admin`, `/api/admin`) 밖이라 별도 보호 목록이 생긴다. 401 JSON 계약(design.md D1)과도 다르다 |
| 관리자 읽기도 `/api/admin/*` GET으로 | 지금도 화면이 서버에서 직접 조회하고 GET Route Handler 호출은 0건이다 |
| 글 생성 때 먼저 insert 후 이미지 확정, 실패 시 글 삭제(지금 순서) | `id`를 먼저 만들면 글 롤백 단계가 없어진다. 관찰되는 결과는 같다 |
| zod 의존성 추가 | `astro/zod`가 이미 있다 |
| 업로드 키에 파일마다 uuid 추가 | 지금 키 규칙을 바꾸는 일이다. 같은 밀리초에 같은 이름을 올리는 경우만 겹친다(리스크 표) |

## 리스크

| 리스크 | 발생 조건 | 영향 | 근거 | 대응 |
| --- | --- | --- | --- | --- |
| 이미지 정리 중단 | 이관 뒤에도 URL이 옛 Supabase 주소 | 커버 교체·글 삭제 때 R2 객체가 안 지워지고 쌓임 | `object-storage.service.ts:144-157` | 적재 때 커버 URL 치환(design.md D4), `MEDIA_BASE_URL` 밖 URL은 키 없음으로 처리, 계약 테스트로 고정 |
| 미리보기에서 운영 설정 오용 | `SITE_URL`을 운영 값으로 둔 채 미리보기 배포 | 관리자 쓰기 전부 403, OAuth 콜백 불일치, canonical이 운영을 가리킴 | 환경별 값 표 | 배포 전 `wrangler` vars 확인 단계(작업 48) |
| 미리보기 색인 | `ROBOTS_INDEXABLE=true`로 미리보기 배포 | 검색엔진에 workers.dev 사본 | `robots.ts` | 미리보기 `false`, 전환 작업에서만 `true` |
| 업로드 키 덮어쓰기 | 같은 밀리초에 같은 정규화 이름(한글 이름은 모두 `image`) | 먼저 올린 이미지가 바뀜 | `upload-policy.service.ts:63-93` | 관리자 1명·한 번에 하나씩 올리는 화면이라 그대로 둔다 |
| pool-workers에서 Astro Worker 미기동 | 빌드 산출물을 pool의 `main`으로 쓸 수 없음 | HTTP 계약 테스트 실행 불가 | 미확인 | 작업 1에서 확인. 안 되면 멈추고 사용자에게 묻는다(테스트 도구는 사용자 결정 8) |
| 검색 결과 차이 | 비ASCII 라틴 문자 대소문자 | `é`·`É` 검색 결과 다름 | SQLite `LIKE` | 운영 제목·본문은 한글·ASCII 위주라 받아들임. 회귀 테스트는 한글·영문 대소문자 케이스만 |

## 테스트 계획

테스트 도구는 `@cloudflare/vitest-pool-workers` + Vitest 4.x(사용자 결정 8). HTTP 계약 테스트는 pool 안의 Worker `fetch`로 요청을 보내고 로컬 D1·R2 상태까지 확인한다. 관리자 세션은 테스트용 `SESSION_SECRET`으로 `server/auth/session`이 만든 쿠키를 쓴다.

### 기준선(작업 0, 구현 전)

- 이 워크트리에 `pnpm install --frozen-lockfile` 후 `pnpm --filter blog-api test`를 실행해 통과·건너뜀 개수를 기록한다. `describe.skip` 파일 3개는 실행되지 않았다고 따로 적는다.
- `node apps/blog-web/scripts/parseXPostUrl.test.mjs`, `verify-seo-runtime.mjs`, `run-local-validation.py`(→ `verify-server-routing.mjs`, `verify-integrated-admin.mjs`)가 지금 코드에서 도는지 실행해 결과를 기록한다. 로컬 DB·두 앱 기동이 필요해 실행하지 못하면 `미실행`과 이유를 적고 assertion 목록만 가져간다.
- 기록 위치: 이 문서 아래 "기준선 결과"(실행 단계에서 추가).

### 회귀 테스트

옛 앱 테스트는 새 앱에서 그대로 돌릴 수 없다. 그래서 "실행된 기존 테스트의 케이스"와 "옛 코드로 만든 고정 자료"를 기대값으로 옮긴다. `describe.skip` 파일은 케이스 아이디어로만 쓰고 기대값은 현재 서비스 코드로 정한다.

| 유지할 동작 | 기대값 출처 | 새 테스트 파일 |
| --- | --- | --- |
| 공개 글 21편 본문 | 덤프 본문을 기존 `compileMDX` 렌더러로 만든 고정 자료(design.md) | `apps/blog/test/render-regression.test.ts` |
| slug 규칙 | 기존 `generateSlug` 실행 결과 | `apps/blog/test/slug.test.ts` |
| 글 서비스 동작 | `posts.service.spec.ts` 실행 케이스(:120~:693) | `apps/blog/test/contract/admin-posts-*.test.ts`, `public-post-detail.test.ts` |
| 공개·관리자 접근 경계 | `posts-access.integration.spec.ts`(:87,:104,:123,:132) | `public-posts-list.test.ts`, `admin-guard.test.ts` |
| 카테고리·태그 | `categories.service.spec.ts`, `tags.service.spec.ts` 실행 케이스 | `admin-categories-*.test.ts`, `admin-tags-*.test.ts` |
| 설정 | `settings.service.spec.ts`(:32,:46,:79,:89,:115,:148), `settings-response.mapper.spec.ts` | `admin-settings-update.test.ts` |
| 업로드 정책 | `upload-policy.service.spec.ts`(:25,:45,:55) | `apps/blog/test/upload-policy.test.ts` |
| 본문·소개 이미지 확정 | `content-image-finalizer.spec.ts`(:27,:51), `uploads.service.spec.ts`(:84,:102) | `apps/blog/test/image-finalize.test.ts` |
| SEO 런타임 | `verify-seo-runtime.mjs` assertion | `apps/blog/scripts/verify-seo-runtime.mjs` |
| 관리자 통합 흐름 | `verify-integrated-admin.mjs`(초안 공개 404 → 발행 200, 삭제 뒤 0개, 잘못된 업로드 400), `verify-server-routing.mjs`(feed 항목 수, `/posts?limit=101` 문구, 관리자 페이지 미인증 307) | `apps/blog/scripts/verify-admin-flow.mjs` |
| 관리자 화면 | 위 "관리자 화면" 표 | `admin-pages.test.ts`(레이아웃 만료 경고·이름, 대시보드 집계 4개·초안 5, `/admin/posts` 쿼리·배너·페이지 크기, 편집 화면 404·초안 조회, 카테고리 20·태그 30 이름순, 설정 5필드·프로필 사진) |
| 공개 화면 계약 | 위 "화면 계약" 표 | `public-home.test.ts`, `public-posts-list.test.ts`, `public-post-detail.test.ts`, `public-feed.test.ts`, `public-sitemap.test.ts`, `public-robots.test.ts` |

- 초안이 있는 시드(발행 2·초안 1, 카테고리 2, 태그 2)로 글 수 의미가 화면마다 다르게 나오는 것을 고정한다.

### API 계약 테스트(구현 전에 실패해야 함)

파일은 모두 `apps/blog/test/contract/` 아래.

| 엔드포인트 | 케이스 | 확인할 상태·필드 | 파일 |
| --- | --- | --- | --- |
| `GET /auth/google` | 정상, 바깥·`//`·인코딩 우회 `callbackUrl` | 302, `Location` 쿼리 7개, 임시 쿠키 속성, 쿠키 안 `callbackUrl`이 `/admin`으로 바뀜 | `auth-google.test.ts` |
| `GET /api/auth/callback/google` | design.md 단위 표의 콜백 케이스 전부(`access_denied`→`OAuthError`), 기존 사용자 image 없음 → 기존 값 유지, 바뀐 값 없음 → `updated_at` 그대로, 편집 동결 중 로그인 성공 | 302 `Location`, 세션 쿠키 유무·속성, 임시 쿠키 삭제, `users` 행 변화 | `auth-callback.test.ts` |
| `POST /auth/signout` | 세션 있음·없음, 다른 출처 | 303 `/`, 쿠키 삭제 / 403 | `auth-signout.test.ts` |
| `GET /auth/signin` | 비로그인, 관리자 로그인, `error` 3종 | 200 noindex 문구 / 302 | `auth-signin-page.test.ts` |
| 관리자 보호 | `src/pages`의 `/admin`·`/api/admin` 라우트 파일을 `import.meta.glob`으로 모아 메서드별로 쿠키 없이 호출(라우트가 늘면 자동 포함, 작업 47에서 전체 재실행), 위조·만료·`ADMIN_EMAIL` 변경 쿠키, 대소문자·인코딩 변형 경로, 운영 `SITE_URL`에서 `mion-session` 이름 쿠키 무시 | 페이지 307(+`callbackUrl`, 만료면 `SessionExpired`), API 401 JSON | `admin-guard.test.ts` |
| 출처 검사·편집 동결 | 같은 방식으로 모은 관리자 쓰기 라우트 전부에 유효 세션 + 다른 `Origin`·`Origin` 없음(JSON·multipart), 관리자 밖 주소의 POST·PUT·PATCH·DELETE·OPTIONS(HEAD는 검사 안 함), 동결 켬. 각 쓰기 엔드포인트의 계약 파일에도 401·403·423 케이스를 하나씩 둔다 | 403 `ORIGIN_MISMATCH`, 423 `EDIT_FROZEN`, D1·R2 변화 없음 | `origin-check.test.ts`, `edit-freeze.test.ts` |
| `POST /api/admin/uploads` | 정상 3종 type, 허용 밖 MIME, 크기 초과(실제 바이트), `type`·`draftUuid` 누락·형식 오류, 한글 파일명 | 201 `objectKey` 형식·`publicUrl`, R2 객체와 `contentType` / 400 code | `admin-uploads.test.ts` |
| `POST /api/admin/posts` | 정상(발행·초안), 필수 누락·길이 초과, 앞뒤 공백 trim, 없는 카테고리·태그(R2 복사 없음), `tagIds` 중복 400, 잘못된 커버 키, `draftUuid` 없이 `coverImageKey`만, 같은 제목 두 번(`-1`), 한글 제목 slug, draft 커버·본문 이미지 이동(다른 `draftUuid` URL은 그대로), 복사 도중 실패·batch 실패 시 그때까지 복사한 객체 모두 삭제, 카테고리·태그 `post_count`·`updated_at`, 401·403·423 | 201 `id`·`slug`, `published_at`, `post_tags`, `post_count`, R2 키 | `admin-posts-create.test.ts` |
| `PUT /api/admin/posts/{id}` | 발행 글 제목 변경 시 slug 유지, 초안 제목 변경 시 재생성, 발행 전환 3종 `published_at`, `updated_at` 갱신, `excerpt`·`coverImage` 생략 시 null, 빈 본문은 유지, 커버 교체 시 이전 객체 삭제, 본문에서 뺀 이미지 삭제, 옛 Supabase URL은 지우지 않음, batch 실패 시 이번 요청 복사본만 삭제(`posts.service.spec.ts:599`), 이전·새 카테고리 집계, 없는 `id`, 401·403·423 | 200 `slug`, D1 행, R2 객체 | `admin-posts-update.test.ts` |
| `DELETE /api/admin/posts/{id}` | 정상, 없는 `id`, R2 삭제 실패해도 200, 401·403·423 | 200, `post_tags`·`post_count`, R2 / 404 | `admin-posts-delete.test.ts` |
| `POST /api/admin/categories` | 정상, `color` 보내도 저장 안 됨, slug 형식 오류, slug 중복, 이름 중복(검사 순서) | 201 `id` / 400 / 409 code | `admin-categories-create.test.ts` |
| `PUT /api/admin/categories/{id}` | 일부 필드, 자기 값 그대로, 이름·slug 둘 다 중복이면 이름 오류 먼저, 빈 `description` 무시, 없는 `id` | 200, `updated_at` / 409 / 404 | `admin-categories-update.test.ts` |
| `DELETE /api/admin/categories/{id}` | 글 없음, 초안만 연결, 없는 `id` | 200 / 409 `CATEGORY_IN_USE` / 404 | `admin-categories-delete.test.ts` |
| `POST /api/admin/tags` | 카테고리와 같은 구성(이름 30자, slug 50자) | 201 / 400 / 409 | `admin-tags-create.test.ts` |
| `PUT /api/admin/tags/{id}` | 같은 구성 | 200 / 409 / 404 | `admin-tags-update.test.ts` |
| `DELETE /api/admin/tags/{id}` | 연결 없음, 초안 글에만 연결, 없는 `id` | 200 / 409 `TAG_IN_USE` / 404 | `admin-tags-delete.test.ts` |
| `PATCH /api/admin/settings` | 행 없음 기본값, 일부 필드, 변경 없음(쓰기 없음), 범위 밖 값, TLD 없는 `siteUrl`, 검증 실패 시 `fieldErrors`의 칸 이름·문구, 이미지 제거, draft 확정 후 이전 객체 삭제(저장 뒤), 잘못된 draft 키·`/draft/`가 든 외부 URL 400, 외부 URL 그대로, `updated_by`, 401·403·423 | 200 설정 5필드 / 400 | `admin-settings-update.test.ts` |

### 단위 테스트

design.md "단위 테스트" 표(render, session, oauth-start, oauth-callback, admin-guard, origin-check, rewrite-urls, dump-to-sql)를 그대로 쓰고 아래를 더한다.

| 대상 | 케이스 | 파일 |
| --- | --- | --- |
| URL → R2 키 추출 | `MEDIA_BASE_URL` 접두사, 쿼리·해시 제거, 다른 호스트·옛 Supabase 주소는 null | `apps/blog/test/media-key.test.ts` |
| 업로드 키 생성 | 이름 정규화(`한글 사진.png`→`image`, `café_photo.jpg`→`cafe-photo`, `a..b.webp`→`ab`), 확장자 없을 때 MIME으로 보충 | `apps/blog/test/upload-policy.test.ts` |
| 편집 화면 조회수(사용자 결정 1) | 편집 화면을 열어도 `view_count` 그대로 | `admin-pages.test.ts` |
| 공개 목록 쿼리 파싱 | `query-utils.ts` 규칙 전부, 허용 밖 `sort`·`limit > 100` 판정 | `apps/blog/test/posts-query.test.ts` |
| `publishedAt`·slug 갱신 규칙 | 발행 전환 표, 발행 글 slug 유지 | `apps/blog/test/post-rules.test.ts` |

### 실행 명령

- `pnpm --filter blog test`(단위·계약·회귀 전부, workerd 안)
- `node apps/blog/scripts/verify-seo-runtime.mjs`(로컬 D1 시드 + `astro preview`)
- 기존 앱: `pnpm --filter blog-api test`, `pnpm --filter blog-web build`, `pnpm --filter blog-api build`
- 전제: `.dev.vars`(Doppler에서 생성, 커밋 금지), 로컬 D1 마이그레이션 적용.

## 작업 순서

엔드포인트 하나씩 `테스트 작성 → 실패 확인 → 구현 → 통과 확인`을 끝내고 다음으로 넘어간다. 각 항목 끝에 `pnpm --filter blog test` 전체를 다시 돌린다.

준비

- [x] 0. 기준선: `pnpm install --frozen-lockfile`, `pnpm --filter blog-api test`, `parseXPostUrl.test.mjs`, `verify-seo-runtime.mjs`, `run-local-validation.py` 실행 결과(또는 `미실행` 이유) 기록
- [x] 1. `apps/blog` 뼈대(design.md 작업 1)와 확인: pool-workers에서 Astro Worker `fetch` 호출, `acorn-jsx`·`hangul-romanize`·`oauth4webapi` workerd 동작, `__Host-` 로컬 쿠키. pool-workers로 Astro Worker를 띄울 수 없으면 여기서 멈추고 묻는다
- [x] 2. D1 스키마·마이그레이션(로컬 적용)

데이터

- [x] 3. `dump-to-sql` 단위 테스트 → 구현
- [x] 4. `rewrite-urls` 단위 테스트 → 구현
- [x] 5. 읽기 전용 덤프 → 로컬 D1 적재 → 전 컬럼 비교 스크립트(차이 있으면 종료 코드 1)
- [x] 6. 덤프 본문으로 렌더 고정 자료 생성(옛 렌더러, 운영 HTTP 사용 안 함)

공개 화면

- [x] 7. `renderPostHtml` 단위·회귀
- [x] 8. slug·`post-rules`·`posts-query` 단위
- [x] 9. `GET /posts/{slug}`(`public-post-detail.test.ts`, 404 화면 포함)
- [x] 10. `GET /posts`(`public-posts-list.test.ts`, 필터 island 포함)
- [x] 11. `GET /`(`public-home.test.ts`)
- [x] 12. `/about`, `/privacy-policy`, `/terms`, 정적 파일 6개(`public-static.test.ts`, `/ads.txt` 본문 일치 포함)
- [x] 13. `GET /feed.xml`
- [x] 14. `GET /sitemap.xml`
- [x] 15. `GET /robots.txt`

로그인·보호

- [x] 16. 세션 쿠키 단위(`session.test.ts`)
- [x] 17. middleware 관리자 보호(`admin-guard.test.ts`)
- [x] 18. middleware 출처 검사(`origin-check.test.ts`)
- [x] 19. middleware 편집 동결(`edit-freeze.test.ts`)
- [x] 20. `GET /auth/google`
- [x] 21. `GET /api/auth/callback/google`
- [x] 22. `POST /auth/signout`
- [x] 23. `GET /auth/signin`
- [x] 24. 공개 헤더의 관리자 링크·로그아웃 form(`public-header.test.ts`)
- [x] 25. 관리자 레이아웃(메뉴, 이름·이메일, 만료 경고, noindex, 상태 배너 island)

업로드

- [x] 26. `media-key`·`upload-policy` 단위
- [x] 27. `POST /api/admin/uploads`
- [x] 28. 로컬 전용 `GET /local-media/{key}`(`media-route.test.ts`, `SERVE_MEDIA_FROM_BINDING=false`면 404)

관리자 글

- [x] 29. 이미지 확정 공통 함수(`image-finalize.test.ts`)
- [x] 30. `POST /api/admin/posts`
- [x] 31. `PUT /api/admin/posts/{id}`
- [x] 32. `DELETE /api/admin/posts/{id}`
- [x] 33. `/admin/posts` 화면
- [x] 34. `/admin/posts/new` 화면(글 폼 island, 업로드 연결, 401 이동)
- [x] 35. `/admin/posts/[slug]/edit` 화면(조회수 증가 없음)

카테고리·태그·설정·대시보드

- [x] 36. `POST /api/admin/categories`
- [x] 37. `PUT /api/admin/categories/{id}`
- [x] 38. `DELETE /api/admin/categories/{id}`
- [x] 39. `/admin/categories` 화면(삭제 확인 island)
- [x] 40. `POST /api/admin/tags`
- [x] 41. `PUT /api/admin/tags/{id}`
- [x] 42. `DELETE /api/admin/tags/{id}`
- [x] 43. `/admin/tags` 화면
- [x] 44. `PATCH /api/admin/settings`(칸별 오류 `fieldErrors`)
- [x] 45. `/admin/settings` 화면(프로필 카드는 `users` 조회)
- [x] 46. `/admin` 대시보드

마무리(로컬)

- [x] 47. `verify-seo-runtime.mjs`·`verify-admin-flow.mjs` 재작성·실행, `admin-guard`·`origin-check`·`edit-freeze` 전체 재실행(모든 라우트가 생긴 뒤), `pnpm build`, `pnpm check-types`, 옛 앱 build, `pnpm --filter blog-api test`

원격(각각 승인 후)

- [ ] 48. 미리보기. 아래 남은 항목이 끝나면 체크한다.
  - [x] 원격 D1 생성·마이그레이션·적재·전 컬럼 비교, R2 버킷 생성·커버 21개 복사, 비밀값 등록, 미리보기 vars 확인 후 배포(실행 기록 "미리보기 배포 결과")
  - [ ] Google 콘솔에 미리보기 콜백 추가(사용자), 미리보기에서 로그인·글 작성·이미지 업로드·수정 직접 확인, 시험 글·이미지 정리
  - [x] `media.mion-space.dev` 연결: 전환(작업 49) 때 R2 커스텀 도메인으로 연결했다
- [x] 49. 전환(2026-11-06, 실행 기록 "전환 결과"): 옛 관리자 편집 동결 → 최종 덤프·D1 재생성·적재·전 컬럼 비교 → A 레코드 기록 → vars를 운영 값(`SITE_URL=https://mion-space.dev`, `ROBOTS_INDEXABLE=true`, `ADMIN_WRITES_FROZEN=true`, `MEDIA_BASE_URL=https://media.mion-space.dev/`, `SERVE_MEDIA_FROM_BINDING=false`)으로 바꿔 배포 → 커스텀 도메인 연결 → `workers_dev=false` → 21편·RSS·sitemap 확인
- [ ] 50. 7일 관찰 → `ADMIN_WRITES_FROZEN=false` 배포 → 옛 코드 정리 PR(별도)

## 변경 파일 후보

design.md "변경 파일 후보"에 더한다.

| 파일 | 변경 목적 | 주의점 |
| --- | --- | --- |
| `apps/blog/wrangler.jsonc` | binding(D1 `DB`, R2 `MEDIA`), vars(환경별 값 표), `observability`, `workers_dev` | 비밀값은 넣지 않음 |
| `apps/blog/migrations/*.sql` | D1 스키마 | `drizzle-kit generate` 산출물 |
| `apps/blog/vitest.config.ts`, `apps/blog/test/**` | pool-workers 테스트 | Vitest 4.x 고정 |
| `apps/blog/scripts/migrate/**` | 덤프·변환·비교·고정 자료 | 운영은 `begin read only`만 |

## 요구사항 추적

| 요구사항(근거) | 작업 | 테스트 |
| --- | --- | --- |
| Google 로그인 + `ADMIN_EMAIL` 1명(이슈, 사용자 결정) | 16~25 | `session`, `auth-*`, `admin-guard`, `origin-check`, `public-header` |
| 관리자 아닌 계정 세션 없이 거부(사용자 결정 4) | 21 | `auth-callback` |
| 관리자 API 401(변경 명세) | 17 | `admin-guard`, 각 쓰기 계약 파일 |
| 전환 후 7일 편집 동결(사용자 결정 7) | 19, 49, 50 | `edit-freeze`, 각 쓰기 계약 파일 |
| MDX 본문 표시(이슈, D2) | 6, 7, 9 | `render`, `render-regression`, `public-post-detail` |
| 글 작성·수정·삭제(이슈) | 29~35 | `admin-posts-*`, `admin-pages`, `verify-admin-flow` |
| 발행 글 slug 유지(사용자 결정 3) | 8, 31 | `post-rules`, `admin-posts-update` |
| 카테고리·태그·설정·대시보드(이슈) | 36~46 | `admin-categories-*`, `admin-tags-*`, `admin-settings-update`, `admin-pages` |
| 관리자 Editorial 디자인 유지(이슈) | 25, 33~46 | `admin-pages`, 미리보기 직접 확인 |
| 이미지 업로드 R2(이슈, D4) | 26~29 | `admin-uploads`, `image-finalize`, `media-key`, `media-route` |
| 공개 목록·필터 동일(변경 명세) | 10, 11 | `public-posts-list`, `public-home`, `posts-query` |
| RSS·sitemap·robots(이슈, 변경 명세) | 13~15, 47 | `public-feed`, `public-sitemap`, `public-robots`, `verify-seo-runtime` |
| 조회수(변경 명세 유지) | 9 | `public-post-detail` |
| 정적 파일·소개·약관(변경 명세 유지) | 12 | `public-static` |
| 이관 전후 개수·전 컬럼 동일(이슈, 변경 명세) | 3~5, 48, 49 | `dump-to-sql`, `rewrite-urls`, 비교 스크립트 |
| 공개 글 21편 200, 커버 21개 200(변경 명세) | 48, 49 | 미리보기·운영 직접 확인 |

## 실행 기록

### 기준선 결과(작업 0, 2026-11-05)

| 명령 | 결과 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 성공 |
| `pnpm --filter blog-api test` | 처음엔 13개 파일이 `@repo/database` 해석 실패. `pnpm --filter @repo/database --filter @repo/shared build` 뒤 재실행: 파일 19 통과·3 건너뜀(`describe.skip` 3개), 테스트 188 통과·91 건너뜀 |
| `node apps/blog-web/scripts/parseXPostUrl.test.mjs` | 통과(fail 0) |
| `pnpm --filter blog-web verify:seo:runtime` | 실패(기존 결함). 첫 확인 `assertPublicFooter`가 `<footer class="neon-footer">`를 찾지만 Editorial 개편(`9a7c3c1`) 뒤 푸터는 `class="foot"`라 `undefined !== 1`. 스크립트가 개편을 따라가지 못했다. 나머지 assertion은 실행되지 않았다. 새 스크립트에는 푸터 선택자만 지금 마크업으로 바꿔 옮긴다 |
| `python3 apps/blog-web/scripts/run-local-validation.py` | 미실행. 고정 포트 `55432`를 다른 프로젝트 컨테이너(`signalforge-postgres-1`)가 쓰고 있다. 그 컨테이너는 건드리지 않았다. `verify-server-routing.mjs`·`verify-integrated-admin.mjs`도 이 서버가 필요해 미실행, assertion 목록만 가져간다 |

### 작업 1 확인 결과(2026-11-05)

- 테스트 도구: `@cloudflare/vitest-pool-workers`는 npm에서 deprecated이고 "`@cloudflare/vitest-plugin`으로 이름이 바뀌었으며 더 이상 갱신하지 않는다"고 안내한다(0.23.0이 마지막). 같은 도구의 후속 패키지 `@cloudflare/vitest-plugin` 1.6.0 + Vitest 4.1.12로 고정했다(사용자 결정 8의 "workerd 안 Vitest 통합 + Vitest 4.x"는 그대로).
- `astro build` 산출물 `dist/server/wrangler.json`을 `cloudflareTest({ wrangler: { configPath } })`로 띄우고 `exports.default.fetch`로 호출하는 방식이 동작한다(스모크 테스트 통과). 그래서 `pnpm --filter blog test`는 `astro build && vitest run`이다.
- workerd 빌드 확인(임시 라우트, 확인 뒤 삭제): `oauth4webapi` 동작, `remark-mdx`(acorn-jsx)가 `<XEmbed />`를 `mdxJsxFlowElement`로 파싱, `remark-gfm` 표 변환 동작. `hangul-romanize`는 패키지의 `module` 진입(`dist-esm`)이 `ReferenceError: module is not defined`로 실패하고, CommonJS 진입 `hangul-romanize/dist/index.js`를 import하면 동작한다. slug 코드는 이 경로를 쓴다.
- `pnpm` 9.0.0은 새 `esbuild` 0.28.2의 플랫폼 패키지를 잘못 연결해 설치가 실패했다. lockfile 갱신만 `pnpm@9.15.9`로 했고, 그 lockfile로 9.0.0 `--frozen-lockfile` 설치가 통과했다. 깨끗한 설치 확인은 작업 47에서 한다.
- `__Host-` 쿠키의 로컬 http 동작은 브라우저 동작이라 로그인 작업(작업 20~23)에서 브라우저로 확인한다.

### 로컬 구현 결과(작업 2~47, 2026-11-06)

- 결과(독립 리뷰 반영 뒤): `pnpm --filter blog test` 51개 파일 297개 통과(workerd, 계약·회귀·단위), `pnpm build` 6개 작업 통과(옛 앱 포함), `pnpm check-types` 8개 작업 통과, `pnpm --filter blog-api test` 기준선과 같음(19 통과·3 건너뜀, 188 통과), `pnpm --filter blog-web build`·`pnpm --filter blog-api build` 다시 통과. `git diff --check 18c2b5c..HEAD`는 옛 앱에서 그대로 복사한 두 파일(`fonts/paperlogy/OFL license.txt`, `styles/globals.css`)의 줄 끝 공백만 남는다(원본과 같게 두려고 고치지 않음). 깨끗한 설치(`node_modules` 삭제 후 pnpm 9.0.0 `--frozen-lockfile`) 통과.
- 실제 데이터 확인(`apps/blog/scripts/verify-local.mjs`, 운영 덤프를 적재한 로컬 D1 + `astro dev`): 공개 글 21편 200, RSS·sitemap이 운영 응답(2026-11-06 수집)과 글자 단위로 같음, 관리자 주소 307, 관리자 API 401, `/posts?limit=101` 오류 문구.
- 관리자 화면 확인(Playwright, 로컬): 새 글 작성 → 대표·본문 이미지 업로드 → 발행 저장 → 공개 상세 200·커버 로드 → 발행 글 제목 수정 후 예전 주소 200 → 삭제. 페이지 오류 없음.
- 설계와 달라진 점
  - 로컬 이미지 경로는 `/_media/` 대신 `/local-media/`다. Astro는 `_`로 시작하는 라우트 파일·폴더를 무시한다.
  - Astro 기본 `security.checkOrigin`은 끄고 middleware 출처 검사 하나로 둔다(form 요청이 Astro 검사에서 먼저 막혀 응답 형식이 갈라지는 것을 막기 위해서다. 검사 범위는 설계 D1 ⑥ 그대로).
  - `SITE_URL`이 `http://localhost`일 때만 세션·임시 쿠키 이름을 `mion-session`·`mion-oauth`(Secure 없음)로 쓴다. 그 밖에는 `__Host-` 이름이다. 운영 주소에서 접두사 없는 이름을 읽지 않는 것은 `session.test.ts`가 확인한다.
  - 관리자 대시보드(작업 46)는 관리자 레이아웃(작업 25) 테스트 대상이 필요해 함께 했다.
  - 덤프의 시간 변환을 반올림에서 버림(`floor`)으로 고쳤다. 운영 sitemap과 비교하다 `lastmod`가 1ms 밀리는 것을 찾았다(Postgres 마이크로초 → 이관 전 JS Date는 밀리초 아래 버림). 비교 스크립트에 드라이버로 읽은 값과의 비교를 더해 같은 실수를 다시 잡게 했다.
  - 새 앱의 React·타입 버전을 옛 앱과 같은 값(react 19.2.8, @types/react 19.2.18)으로 맞췄다. 다른 사본이 생기면 옛 앱 `next build` 타입 검사가 TS2742로 깨진다.
  - `astro check`는 Astro 7.4.5에서 `@astrojs/check`를 찾지 못하고 `@emnapi/runtime`에서 멈춰 쓸 수 없다. `check-types`는 `tsc --noEmit`이고 `.astro` 템플릿은 계약 테스트 렌더로만 확인한다.
  - 관리자 목록·대시보드 날짜를 `Asia/Seoul`로 고정했다(서버 UTC·브라우저 KST 렌더 불일치로 생기던 hydration 경고 제거, 화면 값은 같음).
  - 옛 `verify-seo-runtime.mjs`의 확인 항목은 계약 테스트로 옮겼다(page 2 canonical·필터 noindex: `public-posts-list`, 404 메타: `public-post-detail`·`public-static`, KST 날짜·JSON-LD `</script>` 이스케이프·og 이미지: `public-post-detail`, sitemap: `public-sitemap`, 로그인 noindex: `auth-signin-page`, 조회수 분리: `public-post-detail`·`admin-post-pages`).
- 독립 구현 리뷰(2026-11-06, `mion-reviewer`) 반영
  - 본문 렌더러가 `javascript:` 주소(마크다운 링크, 소문자 `a`·`img`·`form`)를 이관 전 React와 같은 차단 문자열로 바꾼다(`render.test.ts`). 이관 전에는 React가 막고 있었다.
  - 설정의 이미지 URL 검증 연산자 우선순위를 고쳤다(`javascript://localhost`·`ftp://localhost` 거부).
  - 추가 테스트: 임시 쿠키 만료, 편집 동결 중 로그인, 쓰기 11개 전부 423(`test/frozen`), 카테고리·태그 수정·삭제 401·403, 글 생성 D1 실패 시 보상 삭제, 운영 주소에서 접두사 없는 쿠키 이름 무시.
  - 같은 state 재사용: 콜백이 임시 쿠키를 지우므로 브라우저는 다시 보내지 않는다. 다만 누군가 같은 임시 쿠키를 복사해 다시 보내는 것은 서버가 막지 않고, Google의 일회용 `code`가 막는다(서버 저장소를 두지 않는 설계 D1의 한계).
  - 옛 `verify-integrated-admin.mjs` 흐름(초안 공개 404 → 발행 200 → 삭제 404)은 `admin-flow.test.ts`, 잘못된 업로드 400은 `admin-uploads.test.ts`, feed 항목 수는 `public-feed.test.ts`로 옮겼다.
  - 테스트 도구 패키지 이름 변경(`@cloudflare/vitest-plugin`)과 Astro 기본 `checkOrigin` 끄기는 사용자 결정 13·14로 확정했다.
- 테스트를 구현 뒤에 쓴 곳(실패 먼저 확인 못 함): `compare-core`, `buildRobots` 단위, `public-header`(레이아웃을 먼저 만듦), `public-static`(이관 전 렌더 결과를 옮긴 정적 화면), 글 삭제(`PUT`과 같은 파일에 구현). 그 밖의 엔드포인트는 실패를 먼저 확인했다.
- 테스트 기대값을 고친 곳: mermaid 원문의 `>` 이스케이프 가정과 줄 앞 공백(이관 전과 같은 결과로 맞춤), 로마자 표기 추정값(`jemog` → 이관 전 함수 결과 `jemok`), 덤프 쿼리 문자열(`floor` 수정), 테스트 도우미의 계산·선택자 오류.

### 미리보기 배포 결과(작업 48 일부, 2026-11-06)

- 원격 자원: D1 `mion-blog`(위치 힌트 `apac`, id는 `wrangler.jsonc`), R2 `mion-blog-media`(위치 힌트 `apac`). `wrangler d1 migrations apply mion-blog --remote`로 `0000_init.sql` 적용.
- 적재: 운영 Supabase를 읽기 전용 트랜잭션으로 다시 덤프 → `MEDIA_TO=https://mion-blog.whddbs311.workers.dev/local-media/`로 `build-sql.ts` → 원격 D1에 `clear.sql`·`load.sql` 실행(INSERT 57건, D1 `rows_written` 221은 인덱스 쓰기 포함) → `compare.ts --remote` 결과: users 1/1, categories 2/2, tags 5/5, posts 21/21, post_tags 28/28, settings 0/0, 전 컬럼 일치(덤프 쿼리 값·드라이버 값 모두).
  - 첫 적재 뒤 비교에서는 `view_count`만 1씩 달랐다. 운영이 살아 있어 덤프와 비교 사이에 조회수가 올랐다. 덤프부터 비교까지 다시 이어서 실행해 일치를 확인했다. 최종 전환(작업 49)은 편집 동결 뒤 적재하지만 조회수는 계속 오르므로, 같은 방식으로 적재 직후 비교한다.
- 커버: 덤프의 Supabase 공개 URL 21개를 HTTP로 받아(모두 200 `image/webp`) R2 `posts/{id}/thumbnail/…` 키에 `--content-type image/webp`로 올렸다. 배포 뒤 `/local-media/{key}` 21개 모두 200 `image/webp`, 원본과 바이트가 같다.
- 비밀값: `GOOGLE_CLIENT_ID`·`GOOGLE_CLIENT_SECRET`·`ADMIN_EMAIL`은 Doppler `prd_web` 값을 표준 입력으로 `wrangler secret put`에 넘겼다(값 미출력, `local_web`과 같은 Google 클라이언트). `SESSION_SECRET`은 Doppler `mion-blog`/`prd_blog`(새 앱용 config, 환경 `prd`)에 새 무작위 값으로 저장하고 그 값을 등록했다(사용자 결정 16). `prd_web`은 Vercel `blog-web` 운영 환경변수로 동기화되고 있어(`vercel env ls`의 이름 목록이 `prd_web`과 같고 `DOPPLER_*`가 있음) 넣으면 Vercel이 바뀌므로 쓰지 않았다.
- 배포: `pnpm --filter blog deploy:preview` 같은 명령으로 `https://mion-blog.whddbs311.workers.dev`. 배포 vars: `SITE_URL`·`MEDIA_BASE_URL` 미리보기 값, `ROBOTS_INDEXABLE=false`, `SERVE_MEDIA_FROM_BINDING=true`, `ADMIN_WRITES_FROZEN=false`, `UPLOAD_ALLOWED_MIME=image/jpeg,image/png,image/webp`.
- 미리보기 확인(`verify-local.mjs`를 미리보기 주소로 실행): 공개 글 21편 200, RSS·sitemap이 운영 응답(2026-11-06 수집)과 글자 단위로 같음, 관리자 주소 307, 관리자 API 401, 목록 오류 문구. 그 밖에 `robots.txt` 전체 차단, canonical이 미리보기 주소, 다른 출처 `POST /posts` 403, 같은 출처 로그아웃 303, `/auth/google`이 미리보기 콜백 주소로 302하고 `__Host-mion-oauth`(Secure) 쿠키를 붙임, 홈 이미지 깨짐 0.
- 브라우저 확인(Playwright, 미리보기): 글 상세 21편·`/about`·`/posts`에서 이미지 33개 모두 로드(깨짐 0), 페이지 오류 0. `pnpm --filter blog deploy:preview -- --dry-run`이 두 값을 덮어쓰는 것도 확인했다.
- 독립 리뷰(`mion-reviewer`) 반영: 작업 49 운영 vars에 `MEDIA_BASE_URL`·`SERVE_MEDIA_FROM_BINDING` 추가, 변경 명세 문구를 관리자 확인 순서에 맞춤, 편집 동결 판정이 소문자 메서드(`patch`, fetch가 대문자로 바꾸지 않음)도 잡게 고침(`edit-freeze.test.ts` 실패 확인 후 통과).
- 출처 검사 확장(사용자 결정 12): 관리자 밖 주소 케이스를 먼저 추가해 실패를 확인했고(`POST /`가 200), middleware 조건을 바꾼 뒤 51개 파일 300개 통과.
- 미리보기 글 상세를 열어 원격 D1 조회수가 올랐다. 전환 때 D1을 다시 적재하므로 운영 값에는 영향이 없다.
- 남은 일: Google 콘솔에 `https://mion-blog.whddbs311.workers.dev/api/auth/callback/google` 추가(사용자), 로그인 뒤 관리자 쓰기 확인, 시험 글·이미지 정리.

### 전환 결과(작업 49, 2026-11-06)

#### 전환 전 DNS 기록(롤백 기준)

Cloudflare 대시보드(zone `mion-space.dev`, id `d65a809cbae6807de55799f23bcc3fa8`)에서 수정 전에 읽은 값이다.

| 이름 | 타입 | 값 | TTL | 프록시 | 레코드 id |
| --- | --- | --- | --- | --- | --- |
| `mion-space.dev` | CNAME | `712930625c6bf100.vercel-dns-017.com` | Auto | DNS only | `21248d48d43b58a5ead009e61472c52b` |
| `media.mion-space.dev` | 없음 | | | | |
| `www.mion-space.dev` | 없음 | | | | |

- 건드리지 않는 레코드: `blog`(CNAME railway, proxied), `speed`(CNAME pages.dev, proxied), MX 3개, TXT(SPF, google-site-verification 2개, `cf2024-1._domainkey` DKIM), `game-1`(AAAA, 다른 Worker 커스텀 도메인).
- 루트 A 응답이 질의마다 바뀐 것은 CNAME 평탄화 때문이었다.
- 롤백: Worker 커스텀 도메인 `mion-space.dev` 해제 → 위 CNAME(DNS only, TTL Auto) 다시 생성 → 옛 사이트 응답 확인. `media`는 R2 커스텀 도메인 해제만 하면 된다.

#### 전환 실행(2026-11-06 KST)

- 편집 동결: 사용자가 옛 관리자에서 편집하지 않는 것으로 동결했다(옛 앱 코드·설정은 바꾸지 않음). 새 앱은 `ADMIN_WRITES_FROZEN=true`.
- 10:49 최종 덤프(읽기 전용) → `MEDIA_TO` 기본값 `https://media.mion-space.dev/`로 `build-sql.ts` → 원격 D1 `clear.sql`(57행 삭제)·`load.sql` → `compare.ts --remote`: users 1/1, categories 2/2, tags 5/5, posts 21/21, post_tags 28/28, settings 0/0, 전 컬럼 일치(10:49:20). D1은 새로 만들지 않고 모든 행을 지운 뒤 다시 넣었다(미리보기 중 시험 글이 없어 결과는 같다). R2에는 커버 21개만 있다.
- `pnpm --filter blog deploy:prod`: `SITE_URL=https://mion-space.dev`, `ROBOTS_INDEXABLE=true`, `ADMIN_WRITES_FROZEN=true`, `MEDIA_BASE_URL=https://media.mion-space.dev/`, `SERVE_MEDIA_FROM_BINDING=false`.
- `media.mion-space.dev`: `wrangler r2 bucket domain add`로 R2 `mion-blog-media`에 연결(최소 TLS 1.2). 커버 21개 200 `image/webp`, 원본과 바이트 같음.
- `mion-space.dev`: Workers 커스텀 도메인 API가 기존 CNAME 때문에 거부(`100117`)해, 대시보드 세션으로 루트 CNAME을 지우고(10:52:08) 바로 커스텀 도메인을 붙였다(10:52:15). Cloudflare가 루트에 Worker용 AAAA `100::`(proxied)을 만들었다.
- `wrangler.jsonc`에 `workers_dev: false`, `preview_urls: false`, `routes`(`mion-space.dev` 커스텀 도메인)를 넣고 다시 배포했다. workers.dev 주소는 404.
- 전환 뒤 DNS 레코드 수 12(전: 11). 루트 CNAME → AAAA, `media` CNAME 추가 외에는 같다(MX·TXT 그대로).

#### 전환 뒤 확인

Cloudflare IP로 고정해 새 Worker 응답을 확인했다(로컬 리졸버는 TTL 300초 동안 옛 Vercel을 가리켰다. 1.1.1.1·8.8.8.8은 바로 Cloudflare).

- `server: cloudflare`, canonical `https://mion-space.dev`, robots `Allow: /`·`Disallow: /admin`·`/api`
- `/feed.xml`·`/sitemap.xml`이 전환 직전 옛 사이트 응답과 바이트 단위로 같음
- sitemap의 글 21편 모두 200, 옛 sitemap 표본 10개(`/`, `/about`, `/privacy-policy`, 글 7편) 모두 200
- `/auth/google` → 302 `accounts.google.com`, `redirect_uri=https://mion-space.dev/api/auth/callback/google`
- 홈 커버 7개 200(`media.mion-space.dev`), `/admin` 307, `/local-media/x` 404, 다른 출처 `POST /posts` 403
- 확인하느라 글 상세를 열어 새 D1 조회수가 글마다 1~2 올랐다. 덤프(10:49)부터 리졸버 캐시가 끝날 때까지 옛 사이트에 쌓인 조회수는 옮기지 않았다(설계 결정 7에서 조회수 유실 허용).
- 남은 일: 운영 Google 콜백 콘솔 등록 확인(감독), 관리자 로그인 확인, 7일 관찰 뒤 작업 50.

### 전환 뒤 수정: 화면 이동 때 글자 크기 깜빡임(2026-11-06, 운영 미배포)

- 증상: 운영에서 공개·관리자 화면을 옮길 때마다 글자가 작아졌다 커졌다 한다.
- 원인: 글꼴 파일이 `public/fonts/`에 있어 Workers 정적 자산 기본값 `Cache-Control: public, max-age=0, must-revalidate`로 나갔다. 새 앱은 페이지마다 문서를 새로 받으므로(이관 전 Next는 클라이언트 이동이라 글꼴을 다시 받지 않았다) 이동할 때마다 글꼴을 304로 재검증했고, 그동안 `font-display: swap`이 대체 글꼴로 먼저 그렸다. 운영 측정: 홈 → 글 목록 이동 시 첫 그림(DOMContentLoaded) 시점에 Paperlogy 400·500·800이 `loading`, 응답 304 3개. 대체 글꼴에 크기 보정도 없었다(이관 전 `next/font`는 `paperlogy Fallback` 등에 `size-adjust`를 넣었다). CSS(`/_astro/*.css`)는 이미 immutable이라 원인이 아니다. 외부 CDN 글꼴 링크는 없었다(이미 자체 호스팅).
- 수정:
  - 글꼴 파일을 `src/assets/fonts/`로 옮겨 Vite가 `/_astro/{이름}.{해시}.woff2`로 내보내게 했다(`_headers`의 `/_astro/*` immutable 캐시).
  - 첫 화면 굵기 Paperlogy 400·500·800을 `Base.astro`에서 `preload`(굵기마다 약 430KB라 9개 모두는 하지 않는다).
  - 대체 글꼴 `… Fallback`(local Arial + `size-adjust`·`ascent-override` 등)을 이관 전 `next/font` 빌드 값 그대로 옮기고 글꼴 변수에 붙였다. `font-display: swap`은 이관 전과 같다.
- 테스트: `test/contract/fonts.test.ts`(빌드된 CSS의 글꼴 주소가 `/_astro/`이고 `/fonts/`가 없음, 대체 글꼴 값, `/`·`/auth/signin`·`/admin`의 preload 3개). 수정 전 코드로 5개 실패를 확인한 뒤 고쳐 통과. 전체 52개 파일 305개 통과, 타입 검사 통과.
- 브라우저 확인(로컬, 빌드 산출물을 `wrangler dev`로): 홈 ↔ 글 목록, 관리자 대시보드 → 포스트 관리 → 카테고리 → 대시보드 이동마다 첫 그림 시점에 이미 받은 굵기가 모두 `loaded`. 관리자 포스트 관리에서 처음 쓰는 700만 첫 방문 1회 `loading`(이후 캐시).
- 글꼴 라이선스(재배포 허용 확인): Paperlogy(Copyright 2024 The PAPERLOGY Authors), Geist(Copyright 2023 Vercel), IBM Plex Mono(Copyright 2017 IBM, `@fontsource/ibm-plex-mono`) 모두 SIL Open Font License 1.1이다. OFL 1.1은 소프트웨어와 함께 묶어 재배포·웹 임베딩을 허용하고, 글꼴만 따로 파는 것과 수정본에 예약 이름을 쓰는 것을 막는다. 파일을 수정하지 않았고 Paperlogy 라이선스 원문은 `/fonts/paperlogy/OFL license.txt`로 계속 제공한다.
- 운영 배포(사용자 승인, 2026-11-06): `pnpm --filter blog deploy:prod`, 버전 `dd37bc42-a82b-45c4-a1f4-255522649718`(이전 `2bf2d17c-15ee-4acc-919c-4a4468e1a1fe`). 운영 확인: 글꼴 응답 `Cache-Control: public, max-age=31536000, immutable`, 홈 → 글 목록 → 글 상세와 관리자 대시보드 → 포스트 관리 → 카테고리 → 대시보드 이동마다 첫 그림 시점에 쓰는 굵기 모두 `loaded`, 304 재확인 0건. 글 21편·`/feed.xml`·sitemap 200, 피드는 전환 직전 옛 사이트 응답과 같다. 관리자 화면은 운영 `SESSION_SECRET`으로 만든 세션 쿠키로 열었다(값 미출력, 조회만).

### 전환 뒤 수정: 보안 응답 헤더(사용자 결정 17, 2026-11-06, 운영 미배포)

- middleware가 모든 동적 응답(페이지·API·리디렉션·오류)에 붙인다(`withSecurityHeaders`, `src/server/http/guard.ts`). `Response.redirect()`처럼 헤더가 잠긴 응답도 복사본에 붙인다.
  - `Strict-Transport-Security: max-age=31536000`: 다른 하위 도메인(`blog`·`speed`·`game-1`)에 영향을 주지 않게 `includeSubDomains`·`preload`는 넣지 않았다.
  - `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'`: 화면이 island·JSON-LD 인라인 스크립트와 `style` 속성을 써서 `script-src`·`style-src`·`default-src`는 넣지 않았다(넣으려면 nonce·hash 작업이 필요하다). `form-action`도 Google 로그인 리디렉션과 얽혀 넣지 않았다.
  - `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- 정적 자산(`/_astro/*`, 공개 파일)은 Worker를 거치지 않아 이 헤더가 붙지 않는다. HTML은 모두 Worker 응답이라 클릭재킹 방지에는 영향이 없다.
- 테스트: `test/contract/security-headers.test.ts`(공개 홈·목록·404·RSS·로그인 화면·Google 302·관리자 200·307·401·출처 거부 403에 다섯 헤더, CSP에 스크립트·스타일 정책 없음, Google 302와 임시 쿠키 유지). 구현 전 11개 실패 확인 후 통과. 전체 53개 파일 317개 통과, 타입 검사 통과.
- 브라우저 확인(로컬, 빌드 산출물 + 로컬 테스트 비밀값): 공개 `/`·`/posts`·`/about`·글 상세, 로그인 화면 → Google 버튼 → `accounts.google.com` 이동, 관리자 6개 화면 200·이미지 깨짐 0·메뉴 클릭 이동, 다른 페이지에서 `/admin`을 iframe으로 넣으면 `frame-ancestors 'none'`으로 차단. 페이지 오류 0, 그 밖의 CSP 위반 0.

### 전환 뒤 수정: 소개 페이지 구성 문구(2026-11-06, 운영 미배포)

- 문구는 DB가 아니라 코드(`src/pages/about.astro`)에 있다.
- 전: "이 블로그는 Next.js 16(App Router)와 NestJS 11 위에서 동작하며, Turborepo + PNPM 모노레포로 관리됩니다. Vercel에 배포하고, PostgreSQL과 이미지 저장소는 Supabase를 사용합니다. 이미지 업로드는 S3 호환 pre-signed URL 흐름을 사용하며, Doppler가 모든 환경 변수를 제공합니다."
- 후: "이 블로그는 Astro로 만들어 Cloudflare Workers에서 동작합니다. 글은 D1에, 이미지는 R2에 저장합니다." 저장소 링크 버튼 2개는 그대로다. 테스트: `public-static.test.ts`(실패 확인 후 통과).

### 전환 뒤 수정: 공개 페이지 응답 속도(2026-11-06, 운영 미배포)

측정(한국 단말, 요청은 Cloudflare LAX에서 처리, D1 primary는 APAC):

| 구간 | 값 | 근거 |
| --- | --- | --- |
| 단말 ↔ LAX 네트워크 | TCP 왕복 약 150ms, 새 연결 TLS까지 약 0.5초, 새 연결 `/cdn-cgi/trace` TTFB 약 0.9초. 연결을 재사용해도 D1을 안 쓰는 `/robots.txt`가 0.34~3.4초로 흔들린다 | `curl -w` |
| Worker 실행 위치 | 운영 요청 모두 `colo=LAX`(tail `cf.colo`) | `wrangler tail` |
| D1 왕복 1회(LAX → APAC) | 약 117~121ms. 쿼리 4개를 직렬로 보내면 465ms, 병렬(`Promise.all`) 121ms, `db.batch` 117ms | 임시 측정 Worker(읽기 전용, 삭제함) |
| 페이지별 서버 시간(수정 전, 운영 tail) | `/robots.txt`·`/about` 1~5ms, `/feed.xml` 130ms(왕복 1), `/` 350~400ms, `/posts` 450~585ms | `wrangler tail` `wallTime` |

- 원인: 공개 페이지가 D1 쿼리를 단계적으로(글 → 태그, 목록 → 사이드바, 카테고리 slug → 목록, 상세 → 태그 → 조회수) 보내 LAX → APAC 왕복이 2~4번 겹쳤다. 그 위에 한국 ↔ LAX 네트워크 지연과 흔들림(새 연결 약 0.9초)이 더해졌다. 1.3~4.6초 중 앱이 줄일 수 있는 부분은 D1 왕복이다.
- 적용(효과 확인): 같은 왕복으로 보낼 수 있는 쿼리를 병렬로 묶었다. 태그는 글 id 하위 쿼리로 글과 함께, 카테고리·태그 slug는 하위 쿼리로, 목록과 사이드바를 함께, 글 상세는 글·태그·조회수 +1(slug 기준, 발행 글만)을 함께 보낸다. 결과·응답은 그대로다(전체 318개 통과).
  - 측정(같은 임시 Worker에 수정 전·후를 배포해 tail `wallTime` 중앙값): `/` 403 → 274ms, `/posts` 456 → 206ms, `/posts?categorySlug=…` 635 → 225ms, `/posts?tagSlug=…` 255 → 154ms, `/feed.xml` 131 → 134ms(변화 없음). 글 상세는 직렬 3왕복 → 1왕복(없는 글로 잰 1왕복 156ms, 운영 조회수를 올리지 않으려고 실제 글은 재지 않았다).
- 적용하지 않음
  - Worker 배치(Placement): `aws:ap-northeast-1`(도쿄)에 두면 D1 왕복이 약 13ms로 줄지만 단말 응답은 오히려 느려졌다(연결 재사용 중앙값 `/` 0.65 → 2.37초, `/posts` 1.05 → 2.66초, `cf-placement: remote-NRT`). LAX → 도쿄 → LAX 경유가 더해진다. `aws:ap-southeast-1`, `aws:ap-northeast-2`는 D1 왕복이 각각 약 90ms, 45ms로 도쿄보다 멀다. Smart Placement는 분석에 트래픽과 최대 15분이 필요하고, 같은 경유 비용이 생겨 시험하지 않았다.
  - 공개 HTML 캐시(Cache API·`Cache-Control`): 글 상세는 조회수를 매 요청 올리므로 캐시하면 동작이 바뀐다. 목록도 조회수를 보여 준다. Cache API 삭제는 데이터센터 하나에만 적용돼 관리자 쓰기 때 전 세계 무효화가 안 되므로 짧은 TTL이 필요하다. 제품 결정이 필요해 넣지 않았다.
  - D1 읽기 복제(Global read replication): 복제본 추가 요금 없음(공식 문서). 켜면 LAX 근처(WNAM) 복제본에서 읽어 남은 D1 왕복(약 120~270ms)을 줄일 수 있다. 원격 D1 설정 변경과 Sessions API(`withSession`) 코드가 필요해 승인 전에는 켜지 않았다. 켜기 전에는 효과를 잴 수 없다.

