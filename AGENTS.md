# Repository Guidelines

## Project Structure & Module Organization

- 루트는 `pnpm-workspace.yaml`과 `turbo.json`을 기준으로 워크스페이스를 orchestrate 합니다.
- 애플리케이션은 `apps/blog-web`(Next.js 15)과 `apps/blog-api`(NestJS 11)로 나뉘며, 두 앱 모두 `doppler.yaml`로 환경 구성을 관리합니다.
- 공용 패키지는 `packages`에 위치합니다: `database`는 Drizzle ORM 래퍼, `shared`는 유틸과 타입, `ui`는 디자인 시스템, `eslint-config`와 `typescript-config`는 툴링 프리셋을 제공합니다.
- 테스트 자원은 각 앱의 `tests` 또는 `test` 디렉터리에 있으며, 자산은 주로 `apps/blog-web/public`에 있습니다.

## Build, Test & Development Commands

- 초기 셋업: `pnpm install` 후 `pnpm doppler-setup`으로 환경 변수 템플릿을 받아주세요.
- 전체 빌드: `pnpm build`는 터보그래프를 사용해 모든 패키지의 `build` 태스크를 실행합니다.
- 프론트엔드 개발: `pnpm --filter blog-web dev`는 Turbopack 기반 개발 서버(기본 3000)를 띄웁니다.
- 백엔드 개발: `pnpm --filter blog-api dev`는 NestJS watch 모드를 Doppler 환경과 함께 실행합니다.
- 형상 점검: `pnpm lint`, `pnpm check-types`, `pnpm format`으로 린트·타입·포맷을 정리하세요.
- 데이터베이스 작업: `pnpm --filter @repo/database generate|push|migrate` 명령으로 Drizzle 스키마를 유지합니다.

## Coding Style & Naming Conventions

- 모든 TypeScript/TSX는 Prettier 기본값(2-space, 세미콜론 유지, 100열)을 따르며 ESLint presets(`@repo/eslint-config`)을 통해 Next/Nest 환경 규칙을 상속합니다.
- React 컴포넌트와 Nest 프로바이더·서비스는 `PascalCase`, 유틸 함수와 파일은 `camelCase`를 사용합니다.
- 폴더 구조는 feature-first를 지향하며, Next `app` 라우트는 폴더명 소문자-kebab-case, Nest 모듈은 `*.module.ts` 패턴을 유지합니다.

## Testing Guidelines

- 백엔드 단위 테스트: `pnpm --filter blog-api test`로 Jest 스위트를 실행하며, 스펙 파일명은 `*.spec.ts`입니다.
- 프론트엔드 E2E/UI 테스트: `pnpm --filter blog-web test:e2e` 또는 `test:ui`로 Playwright를 실행하고, 베이스 URL은 `.env` 또는 Doppler 설정을 우선합니다.
- 공유 패키지는 TSUP 빌드 후 `src/**` 기준으로 Vitest가 아닌 Jest/Playwright 의존이므로, 새로운 유틸은 최소한의 usage 예제를 `src/__tests__`에 추가해주세요.
- 커버리지 리포트는 `coverage/` 디렉터리에 생성되니 기능 추가 시 핵심 서비스 경로를 커버하도록 테스트를 확장합니다.

## Commit & Pull Request Guidelines

- 커밋 메시지는 현재 히스토리처럼 간결한 한국어 명령형 한 문장(예: `프론트엔드 빌드 오류 수정`)을 권장합니다.
- PR은 목적과 영향 범위를 요약하고, 관련 이슈·티켓을 `Closes #123` 형태로 링크하며, UI 변경이 있다면 스크린샷 또는 Playwright 레포트를 첨부해주세요.
- 주요 환경 변수나 DB 스키마 변경 시 PR 본문에 적용 절차를 bullet으로 정리하고, 병합 전 `pnpm build`와 해당 서비스 테스트가 통과했는지 체크박스로 명시합니다.

## Environment & Secrets

- 모든 시크릿은 Doppler 프로젝트(`mion-blog`)로 주입되니, 로컬 프로필을 `doppler setup --no-interactive` 후 `.env` 파일을 Git에 커밋하지 마세요.
- 로컬 실행 시 `NEXT_PUBLIC_API_URL`과 `DATABASE_URL`을 재확인하고, 필요 시 `.env.local`이 아닌 Doppler variables를 수정해 일관성을 유지합니다.
