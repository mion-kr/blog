# Testing And Change Management

## 목적

- 이 문서는 프론트엔드 가드레일이 문서로만 남지 않도록 테스트와 변경 관리 기준을 정의합니다.
- route, component, 상호작용, data access 변경을 어떤 테스트로 증명할지 명확히 합니다.

## 책임과 경계

- 테스트는 계층별 책임을 증명해야 합니다.
- 문서 변경은 코드 변경과 분리되지 않습니다.
- 예외 허용은 기록 가능한 절차를 따라야 합니다.

## Must

- MUST route 계층 변경 시 렌더링 조합, metadata, searchParams 처리 중 무엇이 바뀌었는지 명확히 남깁니다.
- MUST server action 변경 시 mutation 결과, redirect, revalidate, auth 실패 경로를 검토합니다.
- MUST client 상호작용 변경 시 상태 전이, 업로드, 폼 검증, 버튼 pending UX를 검토합니다.
- MUST data access 변경 시 에러 해석과 query/body/header 계약을 검토합니다.
- MUST 주요 사용자 흐름 변경 시 Playwright E2E 추가 또는 수정 여부를 함께 검토합니다.
- MUST 새 패턴 도입 시 관련 문서와 체크리스트를 같이 갱신합니다.
- SHOULD 반복되는 회귀는 E2E 또는 route-level test helper로 자동화합니다.

## Must Not

- MUST NOT 시각 변경인데 route/data access 책임 이동이 있는지 확인하지 않고 넘어갑니다.
- MUST NOT 문서 변경 없이 새 예외 패턴을 코드에서만 퍼뜨립니다.
- MUST NOT 임시 UI workaround를 종료 조건 없이 장기 규칙처럼 남깁니다.

## Review Questions

- 변경된 코드가 어느 프론트엔드 계층 책임을 추가하거나 이동시켰는가?
- 해당 책임 이동을 증명하는 테스트가 있는가?
- 문서와 체크리스트가 새 패턴을 반영하고 있는가?
- 이 회귀는 E2E로 자동화해야 하는가?

## Exception Process

- 긴급 패치로 문서 동기화가 늦어질 수는 있지만, 같은 작업 또는 즉시 후속 작업에서 보완합니다.
- 같은 예외가 두 번 반복되면 문서와 템플릿에 반영합니다.
- 테스트 추가가 어려우면 왜 어려운지와 어느 계층에서 보완할지를 기록합니다.
