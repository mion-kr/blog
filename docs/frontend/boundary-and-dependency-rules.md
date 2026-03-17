# Boundary And Dependency Rules

## 목적

- 이 문서는 프론트엔드 계층 경계와 의존 방향의 최상위 기준입니다.
- 세부 프론트엔드 문서가 충돌하면 이 문서의 경계 원칙을 우선합니다.

## 책임과 경계

- Route 계층은 App Router 진입점입니다.
- Server 실행 계층은 서버에서만 실행되는 orchestration 계층입니다.
- Data access 계층은 외부 API와의 계약을 캡슐화합니다.
- Client 상호작용 계층은 브라우저 상태와 이벤트를 담당합니다.
- Presentation 계층은 props 기반 시각 표현을 담당합니다.
- Shared UI/Theme 계층은 전역 스타일과 provider를 담당합니다.

| From | May Depend On | Must Not Depend On |
| --- | --- | --- |
| Route 계층 | Server 실행 계층, Presentation 계층, Shared UI/Theme | 브라우저 전용 상태 로직, 임의 fetch 난립 |
| Server 실행 계층 | Data access 계층, 인증 유틸, Next server API | 브라우저 API, client hook |
| Data access 계층 | fetch, API 에러 타입, shared 타입 | JSX, React state |
| Client 상호작용 계층 | Presentation 계층, browser API, action props | 서버 비밀, direct DB access |
| Presentation 계층 | UI util, 스타일, child component | fetch, mutation orchestration |
| Shared UI/Theme | provider, theme config, 스타일 토큰 | feature 정책, page-specific 데이터 로직 |

## Must

- MUST data 흐름을 `Route -> Server 실행 -> Data access -> 외부 API` 또는 `Route -> Presentation -> Client 상호작용`으로 명확히 유지합니다.
- MUST client와 server 경계는 파일 수준에서 드러나야 합니다.
- MUST 외부 API 호출은 data access 계층에 모읍니다.
- MUST redirect, revalidate, auth orchestration은 server 실행 계층에 둡니다.
- MUST presentation 계층은 props를 받아 렌더링하는 데 집중합니다.

## Must Not

- MUST NOT page, layout, component 본문 곳곳에서 직접 API 호출 방식을 제각각 정의합니다.
- MUST NOT client component가 token, secret, server-only 유틸에 접근합니다.
- MUST NOT data access 계층이 UI 메시지 렌더링까지 책임집니다.
- MUST NOT presentation 계층이 mutation orchestration을 직접 관리합니다.

## Review Questions

- 이 로직은 route 계층에 있어야 하는가, server 실행 계층에 있어야 하는가?
- 이 API 호출은 data access 계층에 모아야 하지 않는가?
- 이 컴포넌트는 상호작용 계층인가, presentation 계층인가?
- 같은 인증/redirect/revalidate 정책이 다른 화면에서도 재사용되어야 하는가?

## Exception Process

- 경계를 넘는 직접 의존이 필요하면 먼저 기존 server utility, data access function, shared component로 해결 가능한지 검토합니다.
- 그래도 예외가 필요하면 이유를 “점진적 이전”, “성능”, “Next 제약”, “외부 라이브러리 제약” 중 하나로 명시합니다.
- 예외를 허용할 때는 허용 범위와 제거 시점을 문서에 함께 남깁니다.
