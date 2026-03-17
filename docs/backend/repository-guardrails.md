# Repository Guardrails

## 목적

- 이 문서는 Repository interface와 구현체를 persistence 계층 adapter로 유지하기 위한 기준입니다.
- DB/ORM 세부사항이 상위 계층으로 새는 것을 막습니다.

## 책임과 경계

- Repository interface는 use-case 계층이 요구하는 persistence 계약을 정의합니다.
- Repository implementation은 ORM/SQL/DB 세부사항을 숨기고 계약을 구현합니다.
- Repository는 정책 판단 계층이 아닙니다.

## Must

- MUST interface는 도메인 언어로 메서드를 정의합니다.
- MUST 구현체는 DB 질의, 정렬, 페이지네이션, aggregate 조립 책임을 캡슐화합니다.
- MUST 반환 타입은 aggregate/entity/raw persistence result 중 하나로 명확히 고정합니다.
- MUST 페이지네이션, 정렬, 검색 옵션 shape는 interface에서 persistence 계약으로 드러냅니다.
- MUST 존재 여부 확인, 중복 확인, 관계 조회처럼 persistence concern은 Repository에서 처리합니다.
- SHOULD 구현체는 ORM 라이브러리 세부사항을 interface 바깥으로 노출하지 않습니다.

## Must Not

- MUST NOT Repository가 Response DTO를 반환합니다.
- MUST NOT Repository가 권한 판단이나 정책 메시지 조립을 수행합니다.
- MUST NOT Controller나 Swagger 타입에 의존합니다.
- MUST NOT feature별 use-case 분기를 Repository에 숨깁니다.
- MUST NOT interface 없이 구현체 타입을 직접 주입하는 패턴을 기본값으로 삼습니다.

## Review Questions

- 이 메서드 이름이 persistence 세부사항이 아니라 도메인 의도를 말하고 있는가?
- 반환 타입이 상위 계층에 필요한 정보만 담고 있는가?
- 정책 판단을 위해 Repository 결과를 과하게 가공하고 있지 않은가?
- query option shape가 use-case 계층 계약에 맞게 안정적으로 유지되는가?

## Exception Process

- 단일 구현체만 있더라도 테스트 대체 가능성과 ORM 격리를 위해 interface 유지가 기본입니다.
- 성능 최적화로 raw query가 필요하면 interface 계약은 유지하고 구현체 내부에서만 최적화합니다.
- aggregate 조립 비용이 과하면 read model 전용 메서드를 추가하되, 응답 DTO 반환으로 넘어가지는 않습니다.
