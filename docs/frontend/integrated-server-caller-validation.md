# 웹·API 호출자 인증 통합 검증

검증일: 2026-09-05. 작업 위치: `next-server-only-api-calls`.

## 통합 범위

- 웹·홈 제목 보존 커밋 `983b178`, 최신 main 통합 `18f1501`, API 인증 반영 `4596dbb`(원본 `9973a024`)를 합쳤습니다.
- main의 DB 상태 HTTP endpoint 삭제 PR77과 X 게시물 표시 PR76을 보존했습니다. 문서 충돌은 `route-template.md`의 두 설명을 모두 유지했습니다.
- 브라우저의 Nest 직접 호출과 범용 rewrite를 제거하고 server-only API client에서 서버 호출자 인증을 공급합니다. 관리자 JWE는 별도 Authorization로 유지합니다. 홈 HTML title만 `Mion's Blog`로 변경했습니다.
- API 포스트 7개 진입점은 호출자 인증을 요구합니다. 다른 공개 API의 접근 정책과 API 호스트의 네트워크 공개 여부는 변경하지 않았습니다.
- 이번 통합 추가 파일은 `scripts/verify-integrated-admin.mjs`, 본 보고서이며 `verify-server-routing.mjs`에 정확한 홈 title 검증을 추가했습니다. 전체 변경은 `git diff origin/main...HEAD --stat`과 PR diff에서 확인합니다.

## 실제 실행과 결과

`python3 apps/blog-web/scripts/run-local-validation.py`로 실제 Next(3120), Nest(3121), Docker PostgreSQL(55432)을 실행했습니다. 기존 포트 충돌을 먼저 검사했고 다른 서버는 종료하지 않았습니다. Doppler local 설정은 메모리에서 읽되 DB 주소·마이그레이션 주소를 임시 컨테이너로 강제 교체했습니다. 호출자 비밀은 이번 프로세스에만 생성했으며 출력·공유 설정 저장을 하지 않았습니다.

| 명령 / 검증 | 실제 결과 |
| --- | --- |
| `node apps/blog-web/scripts/verify-server-routing.mjs` | 31개 공개·SEO·미인증 요청 통과. 초기 HTML 본문, canonical/noindex/JSON-LD, sitemap 15개 글, feed 15개 항목, 홈 title 정확한 일치. 브라우저 JS 18개에서 백엔드 주소·호출자 헤더명 부재 확인 |
| `node apps/blog-web/scripts/verify-integrated-admin.mjs` | 실제 NextAuth JWE → Next → Nest → 임시 DB 경로 통과. 관리자 posts/categories/tags/overview route와 새 글 페이지 200, 글 생성·수정·삭제 서버 액션 200 및 각각 created/updated/deleted 리다이렉트 헤더 확인, DB 행 생성·본문 수정·삭제 확인. 초안 공개 상세 404, 발행 후 200 |
| 같은 관리자 검증 스크립트 | 이미지 발급 잘못된 입력 400, Google OAuth provider 및 CSRF 진입점 200. 스토리지 쓰기와 Google 로그인 왕복은 실행하지 않음 |
| `pnpm --filter blog-api exec ts-node test/serverCaller.local.ts` | 동일 통합 AppModule로 실제 HTTP 28개 통과. 호출자 누락 401, 공개 읽기 200, 일반 사용자 JWE 403, 관리자 JWE CRUD 201/200/204, production 및 VERCEL의 로컬 우회 401 |
| `pnpm --filter blog-api exec jest --runInBand` | 19개 묶음·188개 통과, 기존 비활성 3개 묶음·91개 건너뜀. 승인된 테스트 RSA 키/JWKS로 OIDC 서명·필수 claim·만료·프로젝트/환경 불일치 검증 포함 |
| `NODE_OPTIONS=--conditions=react-server ESBUILD_BINARY_PATH=/Users/mion/.cache/mion-blog-web-validation/esbuild-0.25.9 pnpm --filter @repo/database exec tsx --test ../../apps/blog-web/scripts/caller-auth.test.ts` | 1개 묶음 통과. URL 경계, 미설정 거부, 개발 비밀의 운영/Vercel 사용 차단 |
| `node --test apps/blog-web/scripts/parseXPostUrl.test.mjs` | main에서 통합한 기존 X URL 회귀 2개 통과 |
| `pnpm --filter blog-web lint`, `pnpm --filter blog-web check-types`, `pnpm --filter blog-api exec tsc --noEmit --incremental false` | 모두 통과 |
| API 변경 TypeScript 8개 파일 대상 `pnpm --filter blog-api exec eslint` 및 `git diff --check` | 통과 |
| `pnpm --filter blog-web build` | Next 16.3.3 webpack production 빌드·타입 검사·20개 정적 페이지 생성 통과. 오래된 Browserslist 데이터 경고만 있음. 운영 OIDC 런타임 통과를 의미하지 않음 |

API 독립 HTTP/Jest 실행에는 같은 전용 컨테이너 안에 `caller_auth_test` DB를 따로 만들고 기존 migrations를 적용했습니다. Python에서 컨테이너의 이번 임시 비밀과 Doppler local_api를 메모리로 조합하고 `DATABASE_URL`, `DATABASE_MIGRATION_URL`을 `127.0.0.1:55432/caller_auth_test`, `NODE_ENV=test`로 덮어쓴 후 위 명령을 실행했습니다. 저장소 기본 test 스크립트의 Doppler 재주입은 사용하지 않았습니다. 실제 HTTP 스크립트는 본인이 만든 행만 정리합니다.

관리자 검증은 Google 로그인 자체를 흉내 낸 API 대역이 아닙니다. 임시 DB에 ADMIN을 만들고 공식 NextAuth `encode`로 짧은 JWE를 발급하여 실제 세션·JwtStrategy·AdminGuard를 통과시켰습니다. 토큰은 프로세스 메모리 안에서만 사용했습니다. 서버 액션 식별자는 실제 SSR 응답에서 읽고 설치된 Next의 `encodeReply`로 직렬화했습니다.

## Chrome 및 개발 루프

- 미온 개인 프로필의 로컬 탭만 사용했습니다. 처음 탭에 남아 있던 이전 서버 종료 오류를 새 페이지 이동으로 교체한 뒤 확인했습니다.
- 페이지 2에서 글 13~15의 3개 항목, 검색 `검증 15`에서 1개 항목, 뒤로가기에서 검색 입력 초기화와 페이지 2의 3개 항목 복원, Most Viewed 정렬에서 글 15가 첫 항목인 것을 실제 DOM·URL로 확인했습니다.
- 해당 동작의 7개 네트워크 요청 origin은 모두 `http://localhost:3120`이었습니다. 홈 `document.title`은 정확히 `Mion's Blog`였습니다.
- `limit=101` 오류의 Retry 버튼이 Next RSC GET을 다시 보냈습니다. 잘못된 입력은 유지되므로 오류 복구 성공이라고 판정하지 않았습니다.
- Next MCP `get_compilation_issues`는 `issues: []`, 홈 브라우저를 연결한 마지막 `get_errors`는 `configErrors: [], sessionErrors: []`였습니다. Vercel 확인을 위해 브라우저가 로컬에서 벗어난 중간 조회의 세션 미연결 결과는 통과로 세지 않았습니다.
- next-dev-loop의 브라우저 부분은 사용자 지시에 따라 외부 Chrome/CUA로 수행했습니다. agent-browser의 React 내부 상태 검사는 실행하지 않았습니다.

## 운영 준비: 병합 차단

개인 Chrome의 [Doppler prd_web](https://dashboard.doppler.com/workplace/a8eb24ae4f0a20586859/projects/mion-blog/configs/prd_web)에서 활성 설정 8개 중 `BLOG_API_URL`이 없고 기존 `NEXT_PUBLIC_API_URL`만 있었습니다. [prd_api](https://dashboard.doppler.com/workplace/a8eb24ae4f0a20586859/projects/mion-blog/configs/prd_api)의 활성 14개에도 `BLOG_API_CALLER_ISSUER`, `BLOG_API_CALLER_AUDIENCE`, `BLOG_API_CALLER_SUBJECT`가 모두 없었습니다. 설정 이름만 확인했고 비밀값은 열거나 출력하지 않았습니다.

[Vercel blog-web 보안 설정](https://vercel.com/whddbs311-8943s-projects/blog-web/settings/security)에서 Team issuer 모드가 선택되어 있었습니다. 화면에 표시된 production 공개 claim은 다음과 같습니다. 실제 토큰을 취득·노출한 결과는 아닙니다.

| API 설정 이름 | Vercel 화면에 표시된 공개 claim |
| --- | --- |
| `BLOG_API_CALLER_ISSUER` | `https://oidc.vercel.com/whddbs311-8943s-projects` |
| `BLOG_API_CALLER_AUDIENCE` | `https://vercel.com/whddbs311-8943s-projects` |
| `BLOG_API_CALLER_SUBJECT` | `owner:whddbs311-8943s-projects:project:blog-web:environment:production` |

Vercel 프로젝트 목록에서 API 프로젝트의 연결 도메인은 `blog-api-gules-beta.vercel.app`으로 확인했습니다. Doppler 기존 백엔드 URL 값과 동일한지까지는 확인하지 않았으므로 `BLOG_API_URL`의 적용 값으로 임의 저장하지 않았습니다.

[Vercel 공식 OIDC 문서](https://vercel.com/docs/oidc)는 빌드 환경변수와 Function 요청에서 토큰을 공급한다고 설명합니다. 현재 화면의 issuer 설정과 공식 설명만으로 실제 배포 함수에서 토큰 전달·JWKS 검증까지 성공한다고 판단하지 않습니다.

적용 전 별도 승인과 확인이 필요합니다.

1. 실제 API URL을 확인하여 웹 서버 전용 `BLOG_API_URL`을 추가하고 위 production 신뢰 claim 3개를 API에 반영합니다. 기존 공개 변수는 전환 전 제거하지 않습니다.
2. Doppler→Vercel 프로젝트/환경 동기화 범위와 새로운 설정의 빌드·런타임 공급을 확인합니다. preview를 production과 같은 API에 허용할지 임의 결정하지 않습니다. 현재 계약은 정확한 단일 subject만 허용합니다.
3. 실제 Vercel 발급 토큰으로 정상 web→API 공개 읽기, 다른 프로젝트/환경·만료 토큰 거부, JWKS HTTPS 접근, production/VERCEL의 개발 비밀 우회 차단을 확인합니다.
4. 웹·API의 배포 순서를 조정해야 합니다. API 인증이 먼저 활성화되고 이전 웹이 남아 있는 구간에는 공개 글이 막힐 수 있습니다. 독립 배포를 성공으로 취급하지 않습니다.
5. 설정 준비와 실제 배포 검증 절차가 승인되기 전에는 main에 병합하지 않습니다. 이번 작업에서 운영 설정 저장·배포는 실행하지 않았습니다.

## 미확인과 실패 이력

- 실제 Google OAuth 로그인 왕복, 실제 Supabase presigned 발급 및 이미지 PUT/최종화, 카테고리·태그·설정의 브라우저 수정 전체 흐름은 미실행입니다. 로컬 설정의 외부 스토리지 대상에 운영 쓰기를 하지 않았습니다.
- 실제 Vercel 토큰과 원격 JWKS를 합친 배포 검증은 미실행입니다. 테스트 키/JWKS 검증과 구별합니다.
- 처음 서버 액션 수동 FormData 직렬화가 잘못되어 title 누락 500이 있었습니다. 실제 Next encodeReply를 사용하도록 검증 스크립트를 고쳤습니다. 이후 생성 성공 응답이 RSC 리다이렉트 포함 200임을 확인했고 DB 반영까지 검사했습니다. 삭제 액션을 목록에서 찾은 오류는 실제 액션이 있는 편집 페이지를 사용해 해결했습니다. 제품 코드 수정으로 우회하지 않았습니다.
- 임시 컨테이너·서버 종료 후에도 두 작업자의 로컬 워크트리와 보존 커밋은 유지합니다. 병합 전에는 원격 브랜치 삭제도 하지 않습니다.
