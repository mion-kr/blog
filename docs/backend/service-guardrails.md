# Service Guardrails

## 목적

- 이 문서는 Service를 use-case 계층으로 유지하기 위한 기준입니다.
- 비즈니스 규칙의 source of truth를 Service에 모아 진입점이 달라도 같은 정책을 쓰게 합니다.

## 책임과 경계

- Service는 use-case orchestration, 정합성 검증, 예외 변환을 담당합니다.
- Service는 Repository interface를 통해 persistence 계층에 접근합니다.
- Service는 필요할 때 다른 Service를 조합할 수 있지만, 호출 방향은 명확해야 합니다.

## Must

- MUST 비즈니스 규칙, 정합성 체크, 상태 전이 판단을 Service에서 수행합니다.
- MUST Repository 결과를 검증하고, 필요한 예외를 Nest 예외 또는 공통 정책에 맞게 변환합니다.
- MUST 여러 dependency를 조합하는 orchestration은 use-case 계층에서 관리합니다.
- MUST 재사용 가능한 정책은 private 메서드 또는 별도 helper/use-case 단위로 추출합니다.
- MUST 외부 시스템 실패가 사용자 흐름을 막지 않아야 할 때는 의도를 주석과 테스트로 남깁니다.
- SHOULD 기본값 결정, fallback, slug 생성, 중복 검사 같은 도메인 규칙은 Service에 둡니다.
- SHOULD transaction 경계는 “한 use-case가 여러 persistence 변경을 하나의 성공/실패로 묶어야 하는가” 기준으로 판단합니다.

## Must Not

- MUST NOT Service가 HTTP transport 세부사항에 의존합니다.
- MUST NOT Swagger, Express request/response, decorator metadata를 직접 다룹니다.
- MUST NOT ORM 세부사항을 외부 계약으로 노출합니다.
- MUST NOT 단순 DTO passthrough만 있는 Service를 남발합니다.

## Review Questions

- 이 규칙은 다른 transport 진입점에서도 동일하게 적용되어야 하는가?
- 정합성 검증과 예외 변환이 Service에 모여 있는가?
- 외부 의존 실패를 허용한다면 그 허용 범위와 이유가 드러나는가?
- 트랜잭션 경계가 use-case 단위와 맞는가?

## Exception Process

- Service 간 호출이 늘어나면 호출 방향이 순환하지 않는지 먼저 검토합니다.
- 반복되는 orchestration이 커지면 별도 use-case/helper로 추출합니다.
- 성능 이유로 Service를 우회하고 싶다면 재사용성 손실과 테스트 비용을 먼저 문서화합니다.
