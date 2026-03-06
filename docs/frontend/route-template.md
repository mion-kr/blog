# Route Template

## 목적

- 이 문서는 새 화면, route segment, admin 기능을 시작할 때 사용할 기본 구조와 최소 기준을 제공합니다.
- route 계층, server 실행 계층, data access 계층, client 상호작용 계층을 초반부터 분리해 이후 refactor 비용을 줄입니다.

## 책임과 경계

- 새 기능은 현재 레포의 `app/`, `components/`, `lib/`, `features/` 패턴을 기준으로 시작합니다.
- 파일 수보다 계층 책임 분리를 우선합니다.

## Must

- MUST route 계층 파일은 `app/` 아래에 두고, 화면 조합 책임만 맡깁니다.
- MUST server 실행 계층 로직은 `features/*/server` 또는 목적이 분명한 server-only 유틸에 둡니다.
- MUST 외부 API 호출은 `lib/api` 또는 목적별 data access 계층에 둡니다.
- MUST page의 읽기 데이터는 가능하면 server utility에서 준비하고 client component에는 초기 props로 전달합니다.
- MUST 브라우저 상호작용이 큰 UI는 client component로 분리합니다.
- MUST 공통 UI는 `components/` 또는 `@repo/ui` 재사용 가능 형태로 둡니다.
- MUST 새 기능 추가 시 테스트 추가 위치를 함께 결정합니다.

## Must Not

- MUST NOT page 파일에 fetch, mutation, 상호작용, 스타일 정책을 모두 몰아넣습니다.
- MUST NOT route 전용 예외를 전역 provider/theme에 숨깁니다.
- MUST NOT data access 없이 컴포넌트마다 직접 fetch 계약을 새로 씁니다.
- MUST NOT 읽기 전용 목록/설정 데이터를 client component mount fetch의 기본값으로 둡니다.

## Review Questions

- 이 화면의 주 책임은 route 조합인가, 상호작용인가, data access인가?
- 재사용 가능한 UI와 route-local UI가 구분되는가?
- 같은 기능이 admin/site 양쪽에 확장될 가능성을 고려했는가?
- 테스트 위치가 계층 책임과 맞는가?

## Exception Process

- 아주 작은 정적 화면은 별도 feature 디렉터리 없이 route와 presentation component만으로 시작할 수 있습니다.
- 하지만 server action, auth, 업로드, 목록 조회가 생기면 server 실행 계층과 data access 계층을 분리합니다.
- 파일 업로드가 필요한 route는 browser 예외 경로를 허용할 수 있지만, 업로드 계약은 공용 client helper로 분리합니다.

## 기본 구조 예시

```text
app/(segment)/feature/page.tsx
app/(segment)/feature/layout.tsx
app/api/feature/route.ts
features/feature/server/actions.ts
features/feature/server/query.ts
features/feature/client/upload-file.ts
components/feature/feature-view.tsx
components/feature/feature-form.tsx
lib/api/feature.ts
tests/feature-flow.playwright.spec.ts
```

## 새 화면 시작 체크

1. route 계층이 조합해야 할 data와 UI를 먼저 정합니다.
2. 외부 API 호출이 있으면 data access 계층부터 만듭니다.
3. 읽기 흐름이면 page가 server utility에서 먼저 데이터를 준비하도록 설계합니다.
4. redirect, revalidate, auth가 있으면 server 실행 계층을 분리합니다.
5. 브라우저 이벤트와 local state가 크면 client component로 분리합니다.
6. 파일 업로드가 있으면 inline fetch 대신 공용 client helper를 둡니다.
7. 공통 UI와 route-local UI를 구분합니다.
8. 회귀 가능성이 큰 사용자 흐름은 E2E 후보로 표시합니다.
