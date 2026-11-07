# Repository Guidelines

## Quick Start

- 이 레포는 블로그 앱 `apps/blog` 하나로 구성됩니다. Astro 7 서버 렌더링 앱을 Cloudflare Workers에 배포하고, 데이터는 D1(SQLite), 이미지는 R2에 둡니다.
- 운영 도메인은 `mion-space.dev`, 이미지 공개 주소는 `media.mion-space.dev`입니다.
- `@repo/shared`는 별도 패키지가 아니라 `apps/blog/astro.config.mjs`·`apps/blog/tsconfig.json`의 경로 별칭으로 `apps/blog/src/shared`를 가리킵니다.

## Repo Map

- `apps/blog/src/pages`: 공개 화면(`posts`), 관리자 화면(`admin`), 인증(`auth`), API(`api`) 라우트
- `apps/blog/src/server`: 서버 처리(인증·세션, 관리자 쓰기, 글, 설정, 업로드)
- `apps/blog/src/db`: Drizzle 스키마(`schema.ts`)
- `apps/blog/src/lib`: 글 조회 조건, MDX 렌더링, slug 같은 순수 로직
- `apps/blog/src/components`, `src/layouts`, `src/styles`: Astro·React 화면 구성 요소와 스타일
- `apps/blog/src/islands`: 관리자 화면 React island 진입점
- `apps/blog/src/features`: 관리자 화면 데이터 조회(`*/server`)와 업로드 요청(`uploads/client`)
- `apps/blog/src/shims`: 관리자 React 컴포넌트가 쓰는 `next/*` import를 대신하는 모듈
- `apps/blog/migrations`: D1 마이그레이션 SQL
- `apps/blog/test`: Vitest 테스트(`test/contract`는 빌드 산출물을 workerd에서 띄워 호출하는 계약 테스트, `test/fixtures`는 이관 때 만든 회귀 고정 자료)
- `docs/changes`: 변경 기록(설계·구현 문서), `docs/content`: 블로그 글 원고
- `.claude/agents/blog-post-reviewer.md`: 블로그 글 검토 서브에이전트 정의

## Commands

- 설치: `pnpm install`
- 전체 빌드: `pnpm build`
- 타입 체크: `pnpm check-types`
- 테스트: `pnpm --filter blog test` (`astro build` 뒤 `vitest run`)
- 로컬 실행: `pnpm --filter blog dev` (`http://localhost:4321`)
- 로컬 D1 마이그레이션 적용: `pnpm --filter blog exec wrangler d1 migrations apply mion-blog --local`
- 스키마 변경 뒤 마이그레이션 생성: `pnpm --filter blog exec drizzle-kit generate`
- 운영 배포: `pnpm --filter blog deploy:prod` (운영 Worker를 바꾸므로 사용자 승인 뒤에만 실행)

## Environment And Secrets

- 비밀값(`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAIL`, `SESSION_SECRET`)의 원본은 Doppler 프로젝트 `mion-blog`입니다. 운영은 `prd_blog`, 로컬은 `local_blog` 설정을 씁니다.
- 운영 Worker에는 `wrangler secret`으로, 로컬에는 `local_blog` 값으로 만든 `apps/blog/.dev.vars`로 넣습니다.
- 비밀이 아닌 설정값은 `apps/blog/wrangler.jsonc`의 `vars`(로컬 기본값)와 `deploy:prod`의 `--var`(운영 값)에 둡니다.
- MUST `.dev.vars`, `.env*`, 운영 덤프를 Git에 커밋하지 않습니다.
- MUST 운영 D1·R2에 쓰는 명령(`wrangler d1 execute --remote`, `wrangler r2 object put` 등)은 사용자 승인 뒤에만 실행합니다.

## Working Rules

- MUST 기존 코드 스타일과 구조를 우선 따릅니다.
- MUST 파일 이름은 같은 디렉터리의 관례를 따릅니다(`src/islands`와 Astro 컴포넌트는 `PascalCase`, `src/pages` 라우트와 그 밖의 파일은 kebab-case).
- MUST DB 스키마를 바꾸면 `src/db/schema.ts`와 `migrations/`를 함께 갱신합니다.
- MUST 서버 처리나 공개 응답을 바꾸면 관련 테스트(`test/`, 계약 테스트는 `test/contract/`)를 추가하거나 고치고 `pnpm --filter blog test`를 실행합니다.

## Blog Writing Rules

- MUST 블로그 글을 새로 쓰거나 고치면, 저장·발행 전에 `blog-post-reviewer` 서브에이전트(`.claude/agents/blog-post-reviewer.md`)로 리뷰하고 지적을 반영합니다.
- MUST 기존 글의 관례를 따릅니다: 본문에 `# 제목`을 넣지 않음(화면이 제목을 따로 표시), 짧은 도입부로 시작, 한다체 일인칭, 짧은 문단, 표·Mermaid·코드로 설명, 대표 이미지 1장, `## 정리`로 마무리.
- MUST 글을 쓰거나 다듬을 때 `humanizer` 스킬을 적용하고, `humanizer/sample.txt`를 문체 샘플로, `humanizer/title-sample.txt`를 제목 샘플로 씁니다. `humanizer/revised/`의 원고는 참고용입니다.
- MUST 글에 '주인', '주인님' 호칭, 계정 ID·내부 도메인·비밀값, 아직 고치지 않은 보안 취약점을 넣지 않습니다.

## PR Rules

- 커밋 메시지는 간결한 한국어 명령형 한 문장을 기본값으로 사용합니다.
- PR 본문에는 목적, 영향 범위, 관련 이슈, 필요한 적용 절차를 포함합니다.
- 환경 변수, D1 스키마, 운영 배포 설정이 바뀌면 적용 절차와 검증 결과를 함께 남깁니다.
