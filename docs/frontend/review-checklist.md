# Review Checklist

## 목적

- 이 문서는 에이전트 구현 점검에 쓰는 짧은 Yes/No 체크리스트입니다.
- 질문은 프론트엔드 계층 책임과 경계 위반을 빠르게 찾도록 설계합니다.

## 책임과 경계

- 이 체크리스트는 구현 세부사항보다 “로직의 위치”를 먼저 묻습니다.
- 세부 규칙 판단이 필요하면 각 프론트엔드 문서로 돌아갑니다.

## Must

- MUST 첫 질문은 항상 “이 로직은 지금 프론트엔드 계층에 있어야 하는가?”입니다.
- MUST 애매하면 상위 경계 문서로 되돌아갑니다.
- MUST 새 패턴이 보이면 체크리스트만 통과시키지 말고 문서 갱신 필요 여부도 확인합니다.

## Must Not

- MUST NOT 세부 문서보다 체크리스트를 더 강한 source of truth로 취급합니다.
- MUST NOT 취향 차이를 계층 위반처럼 다룹니다.

## Review Questions

### 공통

- 이 로직은 지금 프론트엔드 계층에 있어야 하는가?
- client와 server 경계가 파일 수준에서 드러나는가?
- 같은 규칙이 다른 route segment에서도 재사용되어야 하는가?
- 새로운 예외를 도입했다면 문서화했는가?

### App Router

- page/layout이 route 계층 조합 책임만 담당하는가?
- metadata와 본문이 같은 data fetch를 제각각 구현하지 않는가?
- searchParams/params 해석 위치가 한 군데로 모여 있는가?

### Server Actions / Data Access

- 외부 API 호출이 data access 계층에 모여 있는가?
- redirect/revalidate/auth orchestration이 server 실행 계층에 있는가?
- form parsing과 mutation orchestration이 분리되어 있는가?
- 에러 해석이 공통 위치에 모여 있는가?
- 읽기 데이터가 page/server utility에서 먼저 준비되고 client에는 props로 내려가는가?
- browser upload가 필요하다면 inline fetch 대신 공용 helper를 사용하는가?

### Components / Hooks

- 이 컴포넌트는 client 상호작용 계층인가, presentation 계층인가?
- `'use client'`가 정말 필요한가?
- presentation 계층이 fetch나 mutation orchestration을 하지 않는가?
- hook 추출이 재사용성과 가독성 모두에 도움이 되는가?

### Styling / Theme

- 이 스타일은 전역, shared, route-local 중 어디에 있어야 하는가?
- provider/theme 계층이 feature 정책을 들고 있지 않은가?
- 반복되는 패턴을 shared UI로 올려야 하지 않는가?

### Route Handlers / Error

- route handler가 HTTP 경계 책임만 담당하는가?
- auth 확인, upstream 호출, response 변환이 구분되는가?
- 에러 shape와 상태코드 정책이 같은 feature에서 일관적인가?

## Exception Process

- 체크리스트만으로 판단이 안 되면 해당 레이어 문서를 먼저 확인합니다.
- 질문이 반복해서 모호하면 체크리스트보다 상위 문서를 먼저 보강합니다.
- 세 번 이상 반복되는 지적은 템플릿 또는 테스트 자동화 후보로 승격합니다.
