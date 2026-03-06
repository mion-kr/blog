# Frontend Guardrails

## 목적

- 이 디렉터리는 Next.js App Router 프론트엔드의 source of truth 문서입니다.
- `AGENTS.md`는 목차만 제공하고, 실제 규칙은 이 문서와 하위 문서에서 관리합니다.
- 핵심 용어는 `route 계층`, `server 실행 계층`, `data access 계층`, `client 상호작용 계층`, `presentation 계층`으로 통일합니다.

## 책임과 경계

| 질문 | 읽을 문서 |
| --- | --- |
| 이 로직이 어느 프론트엔드 계층에 있어야 하는가? | `boundary-and-dependency-rules.md` |
| App Router의 page, layout, metadata, route segment 경계는 무엇인가? | `app-router-guardrails.md` |
| Server Action, 서버 유틸, API client를 어디에 둬야 하는가? | `server-actions-and-data-access-guardrails.md` |
| Client Component, Hook, presentational component를 어떻게 나누는가? | `components-and-hooks-guardrails.md` |
| 스타일, 테마, 디자인 시스템 경계는 무엇인가? | `styling-and-design-system-guardrails.md` |
| Route Handler와 에러 응답은 어떻게 유지하는가? | `route-handlers-and-error-guardrails.md` |
| 테스트와 문서 변경을 어떻게 운영하는가? | `testing-and-change-management.md` |
| 구현 점검 시 무엇을 체크하는가? | `review-checklist.md` |
| 새 화면이나 기능은 어떤 구조로 시작하는가? | `route-template.md` |

| 계층 | 역할 | 출력 | 금지 |
| --- | --- | --- | --- |
| Route 계층 | page/layout/loading/not-found/metadata에서 진입점 구성 | 렌더링 트리, route metadata | 직접 fetch 세부 로직 난립, client 전용 상태 관리 남용 |
| Server 실행 계층 | server action, server utility, 인증/redirect/revalidate orchestration | 서버 측 mutation/result | 브라우저 전용 API 의존 |
| Data Access 계층 | API client, query string, 에러 해석, 외부 API 호출 | typed response, domain-friendly result | UI 상태 관리, JSX 반환 |
| Client 상호작용 계층 | 이벤트 처리, local state, browser API, optimistic UX | 상호작용 가능한 UI | 서버 비밀/토큰 직접 접근 |
| Presentation 계층 | 시각 표현, props 기반 렌더링, 조합 가능한 UI | 마크업과 스타일 | data fetch, mutation orchestration |
| Shared UI/Theme | provider, theme, 전역 스타일, 디자인 토큰 | 일관된 스타일 기반 | feature 정책 보유 |

## Must

- MUST 세부 규칙을 프론트엔드 문서에만 기록하고, `AGENTS.md`에는 요약만 남깁니다.
- MUST 중복 규칙이 생기면 `boundary-and-dependency-rules.md`를 기준 문서로 승격합니다.
- MUST 문서가 코드 현실과 다르면 현재 `app/`, `components/`, `lib/`, `features/` 패턴을 먼저 확인합니다.
- MUST 새 화면, 새 data access 패턴, 새 상호작용 패턴이 생기면 관련 문서와 체크리스트를 같이 갱신합니다.

## Must Not

- MUST NOT 세부 규칙을 `AGENTS.md`나 임시 노트에 복제합니다.
- MUST NOT App Router 구조를 무시하고 page 안에 모든 책임을 몰아넣습니다.
- MUST NOT presentation 계층과 data access 계층을 한 컴포넌트에 섞어 넣습니다.

## Review Questions

- 이 로직은 route 계층, server 실행 계층, data access 계층, client 상호작용 계층 중 어디에 있어야 하는가?
- 같은 로직이 다른 route segment에서도 재사용될 가능성이 있는가?
- 에이전트가 5분 안에 읽고 어느 파일에 둬야 하는지 판단할 수 있는가?

## Exception Process

- 기존 규칙과 충돌하는 구현이 필요하면 먼저 상위 경계 문서에서 허용 가능한 계층 이동인지 확인합니다.
- 일회성 예외는 코드 주석으로 끝내지 말고, 반복 가능성이 있으면 관련 문서에 예외 기준을 추가합니다.
- client와 server 경계를 의도적으로 넘는 예외는 이유, 허용 범위, 종료 조건을 기록합니다.
