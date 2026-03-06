# Review Checklist

## 목적

- 이 문서는 에이전트 구현 점검에 쓰는 짧은 Yes/No 체크리스트입니다.
- 질문은 레이어 책임과 경계 위반을 빠르게 찾도록 설계합니다.

## 책임과 경계

- 이 체크리스트는 구현 세부사항보다 “로직의 위치”를 먼저 묻습니다.
- 세부 규칙 판단이 필요하면 각 레이어 문서로 돌아갑니다.

## Must

- MUST 첫 질문은 항상 “이 로직은 지금 레이어에 있어야 하는가?”입니다.
- MUST 애매하면 상위 경계 문서로 되돌아갑니다.
- MUST 새 패턴이 보이면 체크리스트만 통과시키지 말고 문서 갱신 필요 여부도 확인합니다.

## Must Not

- MUST NOT 취향 차이를 가드레일 위반처럼 다룹니다.
- MUST NOT 세부 문서보다 체크리스트를 더 강한 source of truth로 취급합니다.

## Review Questions

### 공통

- 이 로직은 지금 레이어에 있어야 하는가?
- 다른 진입점이나 use-case에서도 같은 규칙이 재사용되어야 하는가?
- 공통 에러/응답/로깅 규칙을 깨지 않았는가?
- 새로운 예외를 도입했다면 문서화했는가?

### DTO

- DTO가 검증과 문서화 외의 책임을 갖고 있지 않은가?
- optional, nullable, default 표현이 서로 일관적인가?
- Query DTO의 sort/filter/default가 Service 계약과 맞는가?
- 응답 DTO가 persistence shape를 직접 노출하지 않는가?

### Controller

- Controller가 use-case 계층 위임 외에 복잡한 정책 분기를 하지 않는가?
- `ApiPublicController`, `ApiFeatureController`, `ApiAdminController` 중 맞는 preset을 선택했는가?
- Guard, 상태코드, Swagger 문서가 엔드포인트 계약과 맞는가?
- 메서드 문서화가 `ApiPublic*` 또는 `ApiAdmin*` 공통 데코레이터 조합만으로 표현되는가?
- Repository 직접 호출이나 응답 수작업 조립이 없는가?
- transport parsing 이상으로 로직이 커지지 않았는가?

### Service

- 정합성 검증과 예외 변환이 use-case 계층에 모여 있는가?
- use-case orchestration이 Service에 있고, transport 세부사항은 없는가?
- 외부 의존 실패 허용 시 이유와 범위가 드러나는가?
- 트랜잭션 경계가 use-case 단위와 맞는가?

### Repository

- interface와 구현체의 책임이 분리되어 있는가?
- Repository가 정책 판단이나 응답 DTO 반환을 하지 않는가?
- query option shape와 반환 타입이 use-case 계층 계약을 지키는가?
- ORM 세부사항이 상위 계층으로 새지 않는가?

## Exception Process

- 체크리스트만으로 판단이 안 되면 해당 레이어 문서를 먼저 확인합니다.
- 질문이 반복해서 모호하면 체크리스트 문구를 수정하지 말고 상위 문서를 먼저 보강합니다.
- 세 번 이상 반복되는 리뷰 지적은 템플릿 또는 테스트 자동화 후보로 승격합니다.
