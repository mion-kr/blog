# Components And Hooks Guardrails

## 목적

- 이 문서는 component와 hook을 client 상호작용 계층과 presentation 계층으로 나눠 관리하기 위한 기준입니다.
- 브라우저 상태, 이벤트, 렌더링 책임을 분리해 재사용성과 테스트 가능성을 유지합니다.

## 책임과 경계

- Client component는 이벤트, local state, browser API를 담당합니다.
- Presentation component는 props 기반 시각 표현을 담당합니다.
- Hook은 재사용 가능한 client 상호작용 로직을 추출할 때만 사용합니다.

## Must

- MUST 브라우저 상태와 이벤트가 없으면 presentation 계층을 기본값으로 선택합니다.
- MUST client component는 필요한 최소 범위에만 `'use client'`를 선언합니다.
- MUST 복잡한 폼, 업로드, 토글, 검색 상호작용은 렌더링 코드와 상태 코드를 분리합니다.
- MUST 컴포넌트 props는 UI 계약을 드러내고, data access 결과 원형을 그대로 끌고 오지 않습니다.
- MUST hook은 두 곳 이상에서 재사용되거나 컴포넌트 본문을 흐릴 때만 추출합니다.
- SHOULD 큰 client component는 helper 함수 또는 child component로 상호작용 단위를 나눕니다.
- SHOULD 업로드 같은 browser 전용 흐름은 공용 helper를 통해 endpoint 계약과 바이너리 전송을 숨깁니다.

## Must Not

- MUST NOT presentation component가 직접 fetch나 mutation orchestration을 수행합니다.
- MUST NOT hook 안에 route redirect, server token 처리 같은 server 전용 정책을 넣습니다.
- MUST NOT `'use client'`를 편의상 상위 트리에 과도하게 전파합니다.
- MUST NOT 컴포넌트 props에 data access 계층의 세부 에러 타입을 그대로 노출합니다.
- MUST NOT 여러 client component가 같은 upload fetch 계약을 복제합니다.

## Review Questions

- 이 컴포넌트는 client 상호작용 계층인가, presentation 계층인가?
- `'use client'`가 정말 필요한가?
- 같은 상호작용 로직이 다른 컴포넌트에서도 재사용되는가?
- props가 UI 계약을 표현하고 있는가, 내부 구현 디테일을 새고 있는가?

## Exception Process

- 상호작용과 표현이 강하게 결합된 작은 컴포넌트는 한 파일에 둘 수 있습니다.
- 다만 상태 전이, 업로드, 검증, optimistic UX가 커지면 helper나 child component로 분리합니다.
- hook 추출이 오히려 의도를 흐리면 component 내부 helper로 남길 수 있습니다.
- 파일 업로드는 client component에 남길 수 있지만, endpoint 계약과 signed upload 절차는 공용 helper로 먼저 승격합니다.
