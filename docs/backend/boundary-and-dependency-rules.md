# Boundary And Dependency Rules

## 목적

- 이 문서는 레이어 경계와 의존 방향의 최상위 기준입니다.
- 세부 레이어 문서가 충돌하면 이 문서의 의존 방향과 경계 원칙을 우선합니다.

## 책임과 경계

- Controller는 transport 계층 진입점입니다.
- Service는 use-case 계층 orchestrator 입니다.
- Repository는 persistence 계층 adapter 입니다.
- Application Mapper는 응답 변환 계층입니다.
- Domain은 persistence shape와 API shape 사이의 의미 단위입니다.
- Common은 cross-cutting concern만 담당합니다.

| From | May Depend On | Must Not Depend On |
| --- | --- | --- |
| DTO | class-validator, class-transformer, Swagger | Repository, Service 정책, 외부 I/O |
| Controller | DTO, Guard, Decorator, Service | Repository, ORM, 응답 변환 계층 없는 임의 응답 조립 |
| Service | Repository interface, Domain, Mapper, 다른 Service | Express/Nest transport 세부사항, Swagger |
| Repository implementation | Repository interface, ORM/DB, Domain | Controller, Response DTO |
| Mapper | Domain, Response DTO | Repository, Guard, 외부 I/O |
| Common | 공통 예외/응답/로깅 | 특정 feature 정책 |

## Must

- MUST 데이터 흐름을 `DTO -> Controller -> Service -> Repository -> DB` 순서로 유지합니다.
- MUST 응답 변환 책임을 Controller가 아니라 응답 변환 계층에 둡니다.
- MUST Repository는 interface와 implementation의 책임을 분리합니다.
- MUST Domain 모델은 적어도 aggregate/entity 의미를 드러내는 이름과 타입을 유지합니다.
- MUST feature별 예외가 아닌 공통 응답/에러/로깅은 `common`에서 관리합니다.
- MUST object storage, health check 같은 인프라 지원 모듈은 repository 없이 adapter 중심으로 구성할 수 있습니다.
- SHOULD 레이어 간 계약은 타입 이름만 봐도 역할이 드러나게 유지합니다.

## Must Not

- MUST NOT Controller가 Repository를 직접 호출합니다.
- MUST NOT Service가 Swagger 데코레이터나 HTTP 응답 shape에 결합됩니다.
- MUST NOT Repository가 정책 판단, 권한 판단, 응답 메시지 조립을 담당합니다.
- MUST NOT DTO가 도메인 규칙의 source of truth가 됩니다.
- MUST NOT Common 모듈이 feature별 use-case를 흡수합니다.

## Review Questions

- 이 로직은 지금 레이어에 있어야 하는가?
- 이 의존성은 비즈니스 경계를 좁히는가, 흐리게 만드는가?
- 같은 정책이 다른 진입점에서도 재사용되어야 한다면 use-case 계층 또는 Domain으로 올라가야 하지 않는가?
- 응답 shape 변환이 HTTP 계층과 비즈니스 계층 사이에 명확히 고정되어 있는가?

## Exception Process

- 경계를 넘는 직접 의존이 필요하면 먼저 기존 interface 또는 mapper로 해결 가능한지 검토합니다.
- 그래도 예외가 필요하면 이유를 “성능”, “호환성”, “임시 전환”, “외부 라이브러리 제약” 중 하나로 명시합니다.
- 예외를 허용할 때는 허용 범위와 제거 시점을 문서에 함께 남깁니다.
