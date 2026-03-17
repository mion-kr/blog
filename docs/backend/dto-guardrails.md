# DTO Guardrails

## 목적

- 이 문서는 요청 DTO와 응답 DTO의 책임을 좁게 유지하기 위한 기준입니다.
- DTO를 입력 검증과 문서화 계층으로 고정해 비즈니스 규칙 누수를 막습니다.

## 책임과 경계

- Request DTO는 transport input shape와 입력 검증을 담당합니다.
- Response DTO는 API 출력 shape와 Swagger 문서화를 담당합니다.
- Query DTO는 paging, sort, filter 입력 계약을 담당합니다.
- DTO는 도메인 규칙의 source of truth가 아닙니다.

## Must

- MUST 요청 DTO와 응답 DTO를 분리합니다.
- MUST 요청 DTO에는 `class-validator`를 사용해 입력 검증 규칙을 명시합니다.
- MUST 필요한 형 변환이 있으면 `class-transformer`를 사용하고, 변환 이유가 transport concern임을 유지합니다.
- MUST Swagger 데코레이터로 외부 계약을 명시합니다.
- MUST Query DTO에 page, limit, sort, order, filter의 허용 범위와 기본 정책을 드러냅니다.
- MUST nullable과 optional을 구분해 표현합니다.
- SHOULD 응답 DTO는 응답 변환 계층을 통해 조립되고, DTO 내부 메서드는 두지 않습니다.

## Must Not

- MUST NOT DTO에서 DB 조회를 수행합니다.
- MUST NOT DTO에서 권한 판단, 정책 판단, 파생 상태 계산을 수행합니다.
- MUST NOT transport 계층이나 use-case 계층의 편의를 위해 DTO에 비즈니스 메서드를 추가합니다.
- MUST NOT ORM entity나 repository result를 응답 DTO 대용으로 노출합니다.
- MUST NOT Query DTO의 기본값을 Controller와 DTO 양쪽에서 따로 관리합니다.

## Review Questions

- 이 필드는 transport 계약인가, 도메인 정책인가?
- 검증 메시지와 Swagger 설명이 같은 계약을 말하고 있는가?
- optional, nullable, default가 서로 충돌하지 않는가?
- 응답 DTO가 persistence shape를 그대로 노출하고 있지 않은가?

## Exception Process

- DTO에 변환 로직이 필요하면 먼저 전역 pipe, parser, 응답 변환 계층으로 이동 가능한지 확인합니다.
- DTO에서 허용하는 변환은 문자열을 숫자/불리언/배열로 바꾸는 수준의 transport concern으로 제한합니다.
- 응답 DTO가 복잡해지면 DTO에 로직을 넣지 말고 응답 변환 계층을 추가하거나 확장합니다.
