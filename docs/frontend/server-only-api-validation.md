# Next 서버 전용 API 호출 전환 검증

검증일: 2026-09-05. 작업 워크트리: `/Users/mion/orca/workspaces/blog/next-server-only-api-calls`.

웹 구현과 아래 로컬 검증은 완료했습니다. API 호출자 인증 변경과 합친 통합 검증, 관리자 로그인 후 성공 CRUD, 실제 OAuth 및 Storage 업로드는 미확인입니다. 운영 독립 배포를 승인하는 보고서가 아닙니다.

## 변경 파일

| 파일 | 변경 |
| --- | --- |
| `apps/blog-web/lib/api/caller-auth.ts` | 서버 전용 URL 검증과 요청별 OIDC/개발 호출자 인증. 절대 URL·경로 이탈·운영 HTTP 설정 거부 |
| `apps/blog-web/lib/api/base-client.ts` | 공통 Nest 요청에 호출자 인증 추가. 관리자 Bearer 별도 유지. 입력 인증 헤더 제거, 리다이렉트 차단, 네트워크 오류 내용 일반화 |
| `apps/blog-web/lib/api-client.ts`, `apps/blog-web/lib/api/index.ts` | `server-only` 진입점 |
| `apps/blog-web/lib/api/settings.ts` | 공개 설정 조회를 공통 요청으로 통합 |
| `apps/blog-web/next.config.js` | 범용 `/api/:path*` Nest rewrite와 공개 백엔드 URL 의존성 제거 |
| `apps/blog-web/app/(site)/posts/posts-content.tsx` | 클라이언트 API 조회 제거. 서버 props를 표시하고 URL 탐색 및 `router.refresh()`로 갱신 |
| `apps/blog-web/app/(site)/about/page.tsx` | 직접 fetch 제거. 빌드 인증 미설정으로 기본 프로필이 정적 고정되지 않도록 동적 렌더링 |
| `apps/blog-web/app/(site)/page.tsx`, `apps/blog-web/app/sitemap.ts` | 캐시 범위의 환경변수를 서버 전용 URL로 전환 |
| `apps/blog-web/components/layout/sidebar.tsx` | 미사용 사이드바의 클라이언트 재조회 제거, 전달된 props 사용 |
| `apps/blog-web/components/layout/sidebar/index.tsx` | 참조 없는 중복 사이드바와 직접 API fetch 삭제 |
| `apps/blog-web/package.json`, `pnpm-lock.yaml` | 공식 `@vercel/oidc` 3.8.5 및 `server-only` 추가 |
| `turbo.json` | 감독자가 확장한 소유 범위. URL·OIDC 검증 설정·VERCEL을 환경변수 선언에 추가. OIDC 토큰과 개발 비밀은 캐시 키에 넣지 않는 `globalPassThroughEnv`로 전달 |
| `apps/blog-web/scripts/caller-auth.test.ts` | 모의 객체 없이 미설정 거부, 개발키 허용/운영 차단, URL 경계 검증 |
| `apps/blog-web/scripts/run-local-validation.py` | Doppler 개발 설정을 메모리로 공급하고 실제 임시 PostgreSQL 및 웹/API를 기동·정리하는 재현 실행기 |
| `apps/blog-web/scripts/verify-server-routing.mjs` | 실제 로컬 앱 HTTP·SEO·인증 누락·브라우저 스크립트 회귀 검사 |
| `docs/frontend/README.md`, `boundary-and-dependency-rules.md`, `server-actions-and-data-access-guardrails.md`, `review-checklist.md`, `route-template.md` | 서버 호출 경계 및 적용·검증 규칙 동기화 |
| `docs/frontend/server-only-api-validation.md` | 이 보고서 |

백엔드 소스와 다른 워크트리는 변경하지 않았습니다. 커밋·push·PR·병합·배포와 공유 Doppler 설정 변경은 하지 않았습니다. Next dev가 생성한 별도 `apps/blog-web/AGENTS.md`, `CLAUDE.md`는 검증 서버 종료 후 제거하여 요청과 무관한 가드레일 변경을 남기지 않았습니다.

## 통신 계약

- 공개 방문자는 로그인 없이 Next 페이지를 읽습니다. 공통 Nest 호출에만 서버 신뢰 인증이 추가됩니다.
- Vercel에서는 공식 `getVercelOidcToken()`을 요청마다 호출하고 `X-Mion-Caller-OIDC`로 전달합니다.
- 개발키는 `VERCEL` 자체가 없고 `NODE_ENV`가 `development` 또는 `test`이며 비어 있지 않은 `BLOG_API_LOCAL_SECRET`이 있을 때만 허용합니다. `VERCEL=''`도 개발키 사용을 차단합니다.
- 관리자 JWE는 기존 서버 쿠키에서 얻은 `Authorization: Bearer`로 별개 전달됩니다. Google OAuth, 서버 액션, 한정된 관리자 Route Handler의 사용자 인증 흐름은 유지했습니다.
- SSR·metadata·sitemap·feed·서버 액션·이미지 발급은 모두 같은 API client를 경유합니다. 클라이언트가 쓰는 공용 DTO는 기존 `@repo/shared` 타입을 유지합니다.
- 이미지 발급만 Next→Nest로 진행하고, 실제 바이너리 PUT은 기존 Supabase Storage 직접 업로드를 유지합니다.
- 이는 Nest 호스트의 네트워크 비공개화를 의미하지 않습니다.

공식 근거: [Vercel API 인증](https://vercel.com/docs/oidc/api), [OIDC 참조](https://vercel.com/docs/oidc/reference), [Turbo 환경변수와 캐시](https://turborepo.com/docs/crafting-your-repository/using-environment-variables).

## 실제 검증

| 명령/검증 | 실제 결과 |
| --- | --- |
| Git 계정 검사 스크립트 | 개인 계정·작성자 일치, 통과 |
| 런타임 파일 복사 | 원본 checkout 확인. 허용되는 신규 복사 대상 0개 |
| `pnpm install --no-frozen-lockfile` | 통과. 기존 패키지는 유지하고 웹 추가 의존성의 lockfile만 변경 |
| `pnpm --filter @repo/shared build` | 최초 실패: esbuild JS 0.25.9와 실행 파일 0.19.12 불일치. 재빌드로 해결되지 않음 |
| `ESBUILD_BINARY_PATH=/Users/mion/.cache/mion-blog-web-validation/esbuild-0.25.9 pnpm --filter @repo/shared build` | 공식 npm 패키지의 일치하는 검증용 실행 파일을 공급하여 통과 |
| 같은 환경으로 `pnpm --filter @repo/database build` | 통과 |
| `pnpm --filter blog-web check-types` | 최종 통과. 초기 공용 타입 산출물 누락과 테스트의 환경변수 리터럴 타입 문제를 해결 |
| `pnpm --filter blog-web lint` | 최종 통과, 경고 0개. 초기 Turbo 환경변수 선언 누락 해결 |
| `pnpm --filter blog-web build` | 최종 통과. 컴파일·타입 검사·정적 페이지 20개 생성 완료. 공개 데이터 페이지는 동적 경로. 기존 Browserslist 데이터 연령 경고 존재 |
| `NODE_OPTIONS=--conditions=react-server ESBUILD_BINARY_PATH=/Users/mion/.cache/mion-blog-web-validation/esbuild-0.25.9 pnpm --filter @repo/database exec tsx --test ../../apps/blog-web/scripts/caller-auth.test.ts` | 1개 검사 통과. 미설정, production, VERCEL 존재 및 빈 값에서 개발키 거부, 로컬 개발키 허용, 절대 URL·경로 이탈 거부 |
| `python3 apps/blog-web/scripts/run-local-validation.py` | 실제 Nest 3121, Next dev 3120, 임시 PostgreSQL 55432 기동. `local_api`/`local_web`만 사용하고 DB 주소를 로컬로 덮어씀 |
| `node apps/blog-web/scripts/verify-server-routing.mjs` | 31개 실제 HTTP 경로/상태 검사와 브라우저 스크립트 18개 검사 통과 |
| `/_next/mcp` tools/list 및 get_routes/get_errors/get_compilation_issues | Next 16.3.3 Turbopack 확인. 전체 경로 열람, 구성 오류·세션 오류·컴파일 문제 모두 0개 |
| `git diff --check` | 통과 |

실제 HTTP 결과:

- 200: 홈, 목록, 2페이지, 검색, 조회수 정렬, 카테고리·태그 필터, 글 상세, About, 약관, 개인정보처리방침, sitemap, feed, robots.
- sitemap의 글 URL 15개와 feed 항목 15개, 글 상세 본문·JSON-LD, 검색 페이지 noindex 및 목록 canonical 확인.
- 404: Next의 `/api/posts`, `/api/categories`, `/api/tags`, `/api/site/settings`. 범용 Nest 프록시가 남지 않음.
- 401: 무인증 관리자 posts/categories/tags/overview 조회와 이미지 presigned 발급 POST.
- 307: 무인증 관리자 홈·목록·새 글·수정·카테고리·태그·설정 페이지.
- 유효하지 않은 `limit=101`은 공개 페이지에서 오류 UI 표시. 실제 브라우저 Retry가 Next RSC 재요청을 생성함. 같은 잘못된 입력을 유지하므로 오류가 계속 표시되는 것까지 확인했으며 장애 복구 성공으로 주장하지 않음.

브라우저 검증:

- CUA에서 Chrome `미온` 프로필과 지정 개인 계정의 일치를 확인하고 기존 로컬 검증 탭 사용. 업무 프로필은 사용하지 않음.
- 목록 1→2페이지, 검색어 `검증 15`, 뒤로가기의 2페이지·빈 검색 입력 복원, Most Viewed 정렬의 15번 글 우선 표시, 글 상세 본문, 오류 재시도를 확인.
- 페이지·검색·정렬·재시도 시 CDP 네트워크에서 `localhost:3120` RSC·favicon 요청만 관측. Nest 직접 요청 없음. 해당 기록에 누락/잘림 표시 없음.
- 목록이 실제 전달한 스크립트 18개와 검사 대상 HTML에서 로컬 Nest URL 및 서버 호출자 인증 식별자 노출 없음.
- 글 상세에서 브라우저 error 로그 0개. `next-dev-loop`의 서버 측 MCP 검증과, 사용자 지정에 따라 agent-browser 대신 Chrome CUA 검증을 사용함. agent-browser의 React 내부 상태 검사는 실행하지 않음.

## 정리와 남은 검증

검증 데이터는 이 작업이 만든 임시 컨테이너에만 작성한 글 15개와 개발용 작성자·카테고리·태그입니다. 컨테이너와 두 서버를 종료했고 3120/3121/55432 리스너가 없음을 확인했습니다. 기존 서버·컨테이너는 종료하지 않았습니다. 공유 환경변수는 변경하지 않았으며 비밀값을 출력하지 않았습니다.

아래 항목은 미실행 또는 미확인입니다.

1. 다른 워크트리의 Nest 호출자 인증 guard와 실제 합친 검증. guard 소스를 읽어 헤더·환경 조건 일치만 확인했습니다. 이번 실제 Nest는 이 웹 워크트리의 기존 API이므로 호출자 토큰을 API에서 검증한 성공 근거가 아닙니다.
2. 실제 Vercel OIDC 서명·issuer/audience/subject 검증과 배포/빌드 환경 토큰 공급. 정확한 운영값은 조회·생성·설정하지 않았습니다.
3. Google 로그인 완료 후 관리자 글 생성·조회·수정·삭제, 카테고리·태그·설정 변경, presigned 발급 성공과 실제 Storage PUT. Google 로그인이나 관리자 세션을 임의로 대체하여 통과시키지 않았습니다.
4. 기존 `verify:seo:runtime`은 모의 API 기반이며 감독자의 지시에 따라 실행·보강하지 않았습니다. 해당 구형 실행기는 여전히 `NEXT_PUBLIC_API_URL`을 공급하므로 새 계약에 그대로 사용할 수 없습니다. 이번 실제 서버 회귀 실행기를 사용하고, 기존 모의 검사의 유지/대체 범위는 별도로 결정해야 합니다.
5. 운영 웹/API 독립 배포 금지. 통합 후 실제 신뢰하는 web 프로젝트·환경의 OIDC 값을 API의 세 설정에 정확히 넣고, 웹에는 HTTPS `BLOG_API_URL`을 공급해야 합니다. Vercel OIDC 활성화와 런타임·빌드 토큰 공급을 확인해야 합니다.
6. 통합 후 유효 호출자/무효 호출자, 유효 관리자/일반 사용자/만료 세션, SEO 전체 경로, 이미지 발급 및 Storage 직접 업로드를 재검증해야 합니다.

자율 판단: 기존 서버 조회·액션 구조를 재사용했고, 불필요한 공개 조회 Route Handler를 추가하지 않았습니다. About을 동적 렌더링으로 바꾼 것은 미설정 빌드 결과가 정적 기본값으로 남는 것을 막기 위함입니다. 범위 확장은 감독자가 승인한 `turbo.json`과 실제 임시 DB 검증만 적용했습니다. 승인 없는 운영 설정·제품 정책 변경은 없습니다.
