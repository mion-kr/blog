# 포스트 서버 호출자 인증 작업 보고

검증일: 2026-09-05. 워크트리: `/Users/mion/orca/workspaces/blog/authenticate-post-endpoints`.

보존 커밋 대상: 기존 파일 8개 수정(74줄 추가·7줄 삭제), 새 파일 6개로 총 14개 파일입니다. 통합 담당 `next-server-only-api-calls`가 가져갈 API 인증 변경만 포함합니다.

## 변경

- `apps/blog-api/src/auth/guards/serverCallerGuard.ts`: Vercel OIDC RS256 서명·issuer·audience·subject·만료 검증, 미설정 거부, 제한된 로컬 비밀 인증.
- `apps/blog-api/src/posts/posts.module.ts`: 호출자 Guard와 ConfigModule 등록.
- `apps/blog-api/src/posts/posts.controller.ts`, `admin-posts.controller.ts`: 모든 7개 포스트 진입점에 호출자 Guard 적용, 기존 관리자 Guard 유지, 헤더·401 문서화.
- `apps/blog-api/src/auth/guards/serverCallerGuard.spec.ts`: 실제 임시 HTTP 서버로 개발 인증·운영 차단 검사.
- `apps/blog-api/src/auth/guards/serverCallerOidc.spec.ts`: 사용자 승인에 따라 테스트 키와 JWKS 공급처만 대체하고 실제 Guard·jose로 서명·클레임 검증 18개를 실행합니다.
- `apps/blog-api/src/posts/posts-access.integration.spec.ts`: 기존 서비스/관리자 대역은 유지하고 실제 호출자 Guard를 추가, 모든 포스트 진입점의 호출자 누락 거부 검사. 이 테스트의 관리자 대역 결과를 실제 관리자 인증 검증으로 세지 않았습니다.
- `apps/blog-api/test/serverCaller.local.ts`: 실제 AppModule·PostgreSQL·JwtStrategy·AdminGuard로 3112 포트 HTTP 검증. 생성한 행만 정리하며 로컬 전용 DB 이름과 주소를 강제합니다.
- `docs/backend/server-caller-auth.md`: 통신 계약·설정·통합 조건·잔여 노출 정리.
- `docs/backend/README.md`, `controller-guardrails.md`, `review-checklist.md`, `module-template.md`: 인증 문서 연결과 포스트 transport 등록 규칙 반영.
- 본 보고서. 기존 `jose`를 사용하므로 의존성·루트 잠금 파일 변경은 없습니다. 웹, DB health, 전역 접근 정책은 변경하지 않았습니다.

## 실행 결과

| 검증 | 실제 결과 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 통과, 잠금 파일 유지 |
| `pnpm --filter @repo/shared --filter @repo/database build` | 통과 |
| `pnpm --filter blog-api exec tsc --noEmit --incremental false` | 통과 |
| 아래 전체 Jest 명령 | 17개 묶음·167개 테스트 통과, 기존 3개 묶음·91개 테스트 건너뜀 |
| 추가 OIDC 테스트 `pnpm --filter blog-api exec jest --runInBand --runTestsByPath src/auth/guards/serverCallerOidc.spec.ts` | 18개 통과 |
| OIDC 추가 후 관련 7개 묶음 재검증 | 81개 통과 |
| 아래 실제 로컬 검증 명령 | 28개 HTTP 요청의 상태코드와 공개 읽기 본문 검증 통과 |
| 생성 데이터 정리 | users/categories/tags/posts/post_tags 각각 0개 확인 |
| 변경한 TypeScript 8개 파일 대상 `pnpm --filter blog-api exec eslint` | 통과 |
| `git diff --check` | 통과 |

실제 실행한 명령입니다. DB 포트 64789는 Docker가 이번 실행에 할당한 값이며 재실행 시 새 컨테이너의 포트를 사용해야 합니다. Doppler의 DB 설정은 명령 내부에서 반드시 임시 DB로 덮어씁니다. 저장소 기본 `test` 스크립트는 Doppler 설정으로 DB 주소를 다시 주입하므로, 동일 Jest 실행기를 아래처럼 직접 호출했습니다.

```sh
doppler run --project mion-blog --config local_api -- env DATABASE_URL=postgres://postgres@127.0.0.1:64789/caller_auth_test DATABASE_MIGRATION_URL=postgres://postgres@127.0.0.1:64789/caller_auth_test NODE_ENV=test LOG_LEVEL=silent pnpm --filter blog-api exec jest --runInBand
doppler run --project mion-blog --config local_api -- env DATABASE_URL=postgres://postgres@127.0.0.1:64789/caller_auth_test DATABASE_MIGRATION_URL=postgres://postgres@127.0.0.1:64789/caller_auth_test NODE_ENV=test LOG_LEVEL=silent pnpm --filter blog-api exec ts-node test/serverCaller.local.ts
pnpm --filter blog-api exec jest --runInBand --runTestsByPath src/auth/guards/serverCallerOidc.spec.ts src/auth/guards/serverCallerGuard.spec.ts src/posts/posts-access.integration.spec.ts src/posts/posts.controller.spec.ts src/posts/admin-posts.controller.spec.ts src/auth/strategies/jwt.strategy.spec.ts src/posts/posts.service.spec.ts
```

임시 PostgreSQL은 기존 로컬 이미지 `postgres:17-alpine`로 생성하고 loopback에만 포트를 공개했습니다. 기존 `packages/database/migrations/0000_peaceful_baron_zemo.sql`, `0001_smooth_posts_indexes.sql`을 `psql -v ON_ERROR_STOP=1`로 적용했습니다. 이미지가 있어 내려받지 않았습니다. 테스트용 JWE는 기존 HKDF/JWE 방식으로 발급하고, 임시 DB에 실제 ADMIN/USER 행을 만들어 검사했습니다. 스토리지 호출이 없는 텍스트 포스트만 사용했습니다.

검증 후 본인이 생성한 `mion-caller-auth-local-test` 컨테이너를 중지했고 `--rm`으로 정리했습니다. 3112 포트에 남은 수신 프로세스가 없음을 확인했습니다.

재현 시에는 기존 서버를 종료하지 말고 3112 포트가 비어 있는지 먼저 확인합니다. 아래 명령은 새 임시 DB를 준비하는 절차이며, 위 명령의 64789를 `docker port`가 출력한 포트로 바꿔 실행합니다. 같은 이름의 컨테이너가 이미 있으면 덮어쓰지 말고 별도 이름을 사용합니다.

```sh
lsof -nP -iTCP:3112 -sTCP:LISTEN
docker run --rm -d --name mion-caller-auth-local-test -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=caller_auth_test -p 127.0.0.1::5432 postgres:17-alpine
docker exec mion-caller-auth-local-test pg_isready -U postgres -d caller_auth_test
docker port mion-caller-auth-local-test 5432
docker exec -i mion-caller-auth-local-test psql -U postgres -d caller_auth_test -v ON_ERROR_STOP=1 < packages/database/migrations/0000_peaceful_baron_zemo.sql
docker exec -i mion-caller-auth-local-test psql -U postgres -d caller_auth_test -v ON_ERROR_STOP=1 < packages/database/migrations/0001_smooth_posts_indexes.sql
```

DB가 준비되었다는 `pg_isready` 결과를 확인한 후 마이그레이션을 실행합니다. 검증 후 본인이 생성한 컨테이너만 `docker stop mion-caller-auth-local-test`로 정리합니다. 로컬 비밀은 검증 스크립트가 해당 프로세스에만 생성하므로 공유 설정을 바꾸지 않습니다.

## 실제 HTTP 결과

| 엔드포인트·상황 | 결과 |
| --- | --- |
| 7개 포스트 진입점, 호출자 없이 관리자 사용자 토큰만 전달 | 모두 401 |
| `GET /api/posts`, `GET /api/posts/:slug?trackView=false`, 유효 로컬 호출자·사용자 토큰 없음 | 200, 생성한 공개 글 본문 확인 |
| 관리자 목록·상세 및 POST/PUT/DELETE, 사용자 토큰 없음 | 각각 401 |
| 같은 관리자 5개 경로, 실제 일반 사용자 JWE | 각각 403 |
| 관리자 목록·상세, 실제 관리자 JWE | 각각 200 |
| 관리자 생성/수정/삭제 | 201/200/204 |
| 생성한 미발행 글의 공개 상세 | 404 |
| 잘못된 OIDC와 유효 로컬 비밀을 함께 전달 | 401 |
| `NODE_ENV=production`의 로컬 비밀 인증 | 401 |
| `VERCEL=1`의 로컬 비밀 인증 | 401 |

정적 검사만으로 기능 통과를 판단하지 않았습니다. 실제 AppModule의 ValidationPipe·응답 인터셉터·예외 필터·사용자 저장소와 Guard를 거쳤습니다. 다만 이 스크립트는 `main.ts`의 Helmet/CORS/Swagger 초기화까지 실행하지 않습니다.

## 실패 이력과 해결

- 첫 타입 검사는 워크트리에 `tsc`가 없어 실패했습니다. 고정 잠금 파일 설치 후 공용 패키지 미빌드로 발생한 타입 오류를 공용 패키지 빌드로 해결했습니다.
- 테스트 설정의 비공개 ConfigService 속성 접근과 UUID 타입 추론 오류를 제거한 뒤 타입 검사가 통과했습니다.
- 실제 관리자 생성 첫 요청은 테스트 데이터가 DTO의 UUIDv7/필수 태그 조건을 충족하지 않아 400이었습니다. 실제 스키마가 생성한 ID와 태그를 전달한 후 201을 확인했습니다.
- 테스트 파일의 포맷 검사 오류는 해당 파일만 정리했습니다.

## 미확인·통합 조건

- 사용자 `jwks 진행` 승인 후 테스트 전용 RSA 키와 JWKS 공급 대역으로 실제 Guard·jose 검증을 실행했습니다. 정상 서명 허용, 위조·만료·필수 클레임 누락·다른 issuer/audience/프로젝트/환경·미설정 거부, 팀/global 공개 키 주소, JWKS 공급 실패를 확인했습니다. 서비스·저장소 대역은 새로 추가하지 않았습니다.
- 실제 Vercel 발급 토큰과 원격 JWKS 통신을 연결한 검증은 미실행입니다. 테스트 키를 사용한 암호 검증은 해당 통합 검증을 대체하지 않습니다.
- 기존 DB 통합 테스트 91개는 원래 `describe.skip` 상태를 유지했습니다. 전체 삭제 정리 로직이 있는 기존 테스트를 활성화하지 않았습니다.
- 웹 통합과 Chrome의 공개 열람/SEO/관리자 로그인 검증은 다른 작업과 합친 뒤 필요합니다. 이번 API 작업에서 브라우저는 사용하지 않았습니다.
- 운영 issuer/audience/subject, OIDC 활성화, 환경별 신뢰 대상, JWKS 외부 통신을 확인하고 Doppler에 반영해야 합니다. 실제 공유 개발 비밀이나 외부 서비스 설정은 변경하지 않았습니다.
- API와 웹을 독립 운영 배포하지 않아야 합니다. 후속 사용자 승인으로 로컬 보존 커밋만 생성하며, 이 워크트리에서는 push·PR·병합·배포를 수행하지 않습니다.
- categories/tags 공개 읽기와 site/settings는 기존 공개 상태이고, 기타 관리자 API는 사용자 인증만 유지합니다. API 호스트의 네트워크 비공개화는 이 작업의 결과가 아닙니다.

자율 판단: 기존 `jose` 재사용, 호출자 Guard를 포스트 모듈에만 등록, OIDC 존재 시 로컬 우회 금지, 임시 Docker DB로 실제 관리자 검증을 선택했습니다. 승인되지 않은 제품 정책·외부 설정 변경은 없습니다.

## 보존 커밋 전 재확인과 운영 미검증 목록

- 현재 Guard·컨트롤러·모듈·테스트를 기존 보고서와 대조했고, 관련 7개 테스트 묶음 81개를 다시 실행해 통과했습니다. 기존 실제 Nest/DB 28개 요청 검증 결과는 보존하며 이번 커밋 작업에서 DB를 다시 만들지는 않았습니다.
- 실제 웹 프로젝트의 OIDC 활성화 여부와 issuer 모드, 정확한 `BLOG_API_CALLER_ISSUER`, `BLOG_API_CALLER_AUDIENCE`, 프로젝트·환경이 포함된 `BLOG_API_CALLER_SUBJECT` 값을 확인해야 합니다.
- 실제 배포 API가 해당 JWKS 주소에 HTTPS로 접근하고 키 교체 후에도 검증할 수 있는지 확인해야 합니다.
- 실제 웹 요청 및 데이터 조회가 있는 빌드 경로에서 토큰이 공급되고, 다른 프로젝트/환경·만료 토큰이 실제 배포 API에서도 거부되는지 확인해야 합니다.
- 운영 API의 `NODE_ENV=production`과 Vercel 배포의 `VERCEL` 공급, 로컬 대체 인증 차단을 배포 설정과 함께 확인해야 합니다.
- 웹의 서버 전용 `BLOG_API_URL`, 관리자 사용자 토큰 전달, 방문자 미로그인 공개 열람·SEO는 통합 워크트리 검증 대상입니다. 비밀을 `NEXT_PUBLIC` 변수나 브라우저 응답·번들·로그에 넣지 않아야 합니다.
