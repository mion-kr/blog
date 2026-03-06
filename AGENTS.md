# Repository Guidelines

## Quick Start

- 이 레포는 `apps/blog-web`(Next.js 15)과 `apps/blog-api`(NestJS 11)로 구성됩니다.
- 공용 패키지는 `packages/` 아래에 있습니다. 주요 패키지는 `database`, `shared`, `ui`, `eslint-config`, `typescript-config` 입니다.
- 백엔드 규칙의 source of truth는 `docs/backend/README.md` 입니다.
- 프론트엔드 규칙의 source of truth는 `docs/frontend/README.md` 입니다.
- 핵심 용어는 `transport 계층`, `use-case 계층`, `persistence 계층`, `응답 변환 계층`으로 통일합니다.
- 프론트엔드 핵심 용어는 `route 계층`, `server 실행 계층`, `data access 계층`, `client 상호작용 계층`, `presentation 계층`으로 통일합니다.

## Read Order

- 백엔드 작업 시작 전: `docs/backend/README.md`
- 프론트엔드 작업 시작 전: `docs/frontend/README.md`
- 레이어 경계 판단: `docs/backend/boundary-and-dependency-rules.md`
- 프론트엔드 경계 판단: `docs/frontend/boundary-and-dependency-rules.md`
- 구현 중 레이어별 규칙 확인: 해당 레이어 문서
- 구현 마무리 점검: `docs/backend/review-checklist.md`
- 프론트엔드 구현 마무리 점검: `docs/frontend/review-checklist.md`
- 새 모듈 설계: `docs/backend/module-template.md`
- 새 프론트엔드 화면/기능 설계: `docs/frontend/route-template.md`

## Repo Map

- `apps/blog-web`: Next.js 앱
- `apps/blog-api`: NestJS 앱
- `packages/database`: Drizzle ORM 래퍼
- `packages/shared`: 공용 유틸과 타입
- `packages/ui`: 디자인 시스템

## Commands

- 초기 셋업: `pnpm install`
- 환경 설정: `pnpm doppler-setup`
- 전체 빌드: `pnpm build`
- 타입 체크: `pnpm check-types`
- 프론트 dev: `pnpm --filter blog-web dev`
- 백엔드 dev: `pnpm --filter blog-api dev`
- 백엔드 테스트: `pnpm --filter blog-api test`
- 프론트 E2E: `pnpm --filter blog-web test:e2e`

## Working Rules

- MUST 기존 코드 스타일과 구조를 우선 따릅니다.
- MUST feature-first 구조를 유지합니다.
- MUST Nest 모듈 파일명은 `*.module.ts` 패턴을 유지합니다.
- MUST React/Nest 클래스는 `PascalCase`, 유틸과 일반 파일은 `camelCase`를 사용합니다.
- MUST 환경 변수는 Doppler를 기준으로 관리합니다.
- MUST `.env` 파일을 Git에 커밋하지 않습니다.
- MUST 백엔드 레이어 규칙 변경 시 `docs/backend/README.md`, 관련 세부 문서, `docs/backend/review-checklist.md`, `docs/backend/module-template.md`를 함께 갱신합니다.
- MUST 프론트엔드 레이어 규칙 변경 시 `docs/frontend/README.md`, 관련 세부 문서, `docs/frontend/review-checklist.md`, `docs/frontend/route-template.md`를 함께 갱신합니다.

## Backend Contract

- NestJS 컨트롤러 Swagger 기준은 `apps/blog-api/src/posts/posts.controller.ts` 패턴을 따릅니다.
- 신규/수정 컨트롤러는 `@ApiTags`, `@ApiExtraModels`, 공통 응답 데코레이터 패턴을 유지합니다.
- 세부 경계와 예외 규칙은 `docs/backend/` 하위 문서를 우선합니다.
- Controller는 transport 계층, Service는 use-case 계층, Repository는 persistence 계층으로 취급합니다.

## Testing Rules

- 백엔드 변경 시 관련 서비스 또는 통합 테스트 추가를 우선 검토합니다.
- 핵심 경로 변경 시 `pnpm --filter blog-api test` 실행을 우선 검토합니다.
- 커버리지는 `coverage/`에 생성됩니다.

## PR Rules

- 커밋 메시지는 간결한 한국어 명령형 한 문장을 기본값으로 사용합니다.
- PR 본문에는 목적, 영향 범위, 관련 이슈, 필요한 적용 절차를 포함합니다.
- 환경 변수나 DB 스키마 변경이 있으면 적용 절차와 검증 결과를 함께 남깁니다.

## Backend Docs Index

- 허브: `docs/backend/README.md`
- 경계/의존성: `docs/backend/boundary-and-dependency-rules.md`
- DTO: `docs/backend/dto-guardrails.md`
- Controller: `docs/backend/controller-guardrails.md`
- Service: `docs/backend/service-guardrails.md`
- Repository: `docs/backend/repository-guardrails.md`
- Error/Response: `docs/backend/error-and-response-guardrails.md`
- Testing/Change: `docs/backend/testing-and-change-management.md`
- 점검 체크리스트: `docs/backend/review-checklist.md`
- 모듈 템플릿: `docs/backend/module-template.md`

## Frontend Docs Index

- 허브: `docs/frontend/README.md`
- 경계/의존성: `docs/frontend/boundary-and-dependency-rules.md`
- App Router: `docs/frontend/app-router-guardrails.md`
- Server Actions/Data Access: `docs/frontend/server-actions-and-data-access-guardrails.md`
- Components/Hooks: `docs/frontend/components-and-hooks-guardrails.md`
- Styling/Design System: `docs/frontend/styling-and-design-system-guardrails.md`
- Route Handlers/Error: `docs/frontend/route-handlers-and-error-guardrails.md`
- Testing/Change: `docs/frontend/testing-and-change-management.md`
- 점검 체크리스트: `docs/frontend/review-checklist.md`
- 라우트 템플릿: `docs/frontend/route-template.md`
