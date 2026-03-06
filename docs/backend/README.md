# Backend Guardrails

## 목적

- 이 디렉터리는 NestJS 백엔드의 source of truth 문서입니다.
- `AGENTS.md`는 목차만 제공하고, 실제 규칙은 이 문서와 하위 문서에서 관리합니다.
- 독자는 에이전트이며, 구현과 문서 판단이 같은 기준을 따르도록 유지합니다.
- 핵심 용어는 `transport 계층`, `use-case 계층`, `persistence 계층`, `응답 변환 계층`으로 통일합니다.

## 책임과 경계

| 질문 | 읽을 문서 |
| --- | --- |
| 이 로직이 어느 레이어에 있어야 하는가? | `boundary-and-dependency-rules.md` |
| DTO에 어디까지 허용되는가? | `dto-guardrails.md` |
| Controller가 어디까지 해야 하는가? | `controller-guardrails.md` |
| Service가 어떤 규칙의 source of truth인가? | `service-guardrails.md` |
| Repository interface와 구현체를 어떻게 나누는가? | `repository-guardrails.md` |
| 에러와 응답 구조를 어떻게 유지하는가? | `error-and-response-guardrails.md` |
| 테스트와 문서 변경을 어떻게 운영하는가? | `testing-and-change-management.md` |
| 구현 점검 시 무엇을 체크하는가? | `review-checklist.md` |
| 새 모듈은 어떤 구조로 시작하는가? | `module-template.md` |
| Controller preset과 응답 데코레이터를 어떻게 고정하는가? | `controller-guardrails.md` |

| 계층 | 역할 | 출력 | 금지 |
| --- | --- | --- | --- |
| DTO | transport 입력 검증, 응답 문서화, transport shape 정의 | 검증된 입력 값, 응답 스키마 | 정책 판단, DB 조회, 권한 판단 |
| Controller | transport 계층 진입점, Guard 적용, 상태코드/Swagger 선언 | Service 호출 결과 | Repository 직접 호출, 트랜잭션 처리 |
| Service | use-case 계층 orchestration, 정합성 확인, 예외 변환 | 도메인 결과, 응답용 DTO 전 단계 데이터 | transport 세부사항 유지 |
| Application Mapper | domain/persistence 결과를 API 응답 shape로 변환 | Response DTO shape | DB 접근, 정책 판단 |
| Repository | persistence 계층 adapter, query contract 구현 | aggregate/entity/raw persistence result | 응답 DTO 반환, 정책 판단 |
| Domain | aggregate/entity 의미 단위 표현 | 레이어 간 공통 의미 모델 | transport/ORM 세부사항 누수 |
| Common | cross-cutting concern | 예외/응답/로깅/데코레이터/preset | feature 정책 보유 |

## Must

- MUST 세부 규칙을 레이어 문서에만 기록하고, `AGENTS.md`에는 요약만 남깁니다.
- MUST 중복 규칙이 생기면 `boundary-and-dependency-rules.md`를 기준 문서로 승격합니다.
- MUST 문서가 코드 현실과 다르면 문서보다 코드를 먼저 확인하고, 둘 중 무엇을 바꿀지 명시적으로 결정합니다.
- MUST 새 모듈, 새 패턴, 새 예외가 생기면 관련 문서와 체크리스트를 같이 갱신합니다.

## Must Not

- MUST NOT 세부 규칙을 `AGENTS.md`, PR 코멘트, 위키에 제각각 복제합니다.
- MUST NOT 이상적인 아키텍처를 이유로 현재 레포에 없는 계층을 강제 도입합니다.
- MUST NOT 문서를 장문 설명 중심으로 작성합니다. 규칙, 예외, 체크리스트 우선으로 씁니다.

## Review Questions

- 지금 바꾸는 규칙의 source of truth 문서는 어디인가?
- 이 규칙이 특정 레이어 문서에 있어야 하는가, 상위 경계 문서에 있어야 하는가?
- 에이전트가 5분 안에 읽고 같은 결론을 내릴 수 있는가?

## Exception Process

- 기존 규칙과 충돌하는 구현이 필요하면 먼저 `boundary-and-dependency-rules.md`에서 충돌 지점을 확인합니다.
- 일회성 예외는 PR 설명과 코드 주석으로만 끝내지 말고, 반복 가능성이 있으면 관련 문서에 예외 기준을 추가합니다.
- 레이어 경계를 의도적으로 넘는 예외는 이유, 허용 범위, 종료 조건을 함께 기록합니다.
