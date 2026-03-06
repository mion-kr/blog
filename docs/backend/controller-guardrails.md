# Controller Guardrails

## 목적

- 이 문서는 Controller를 transport 계층 진입점으로 고정해 transport 로직만 남기기 위한 기준입니다.
- Controller가 얇을수록 use-case 변경과 테스트 비용을 줄일 수 있습니다.

## 책임과 경계

- Controller는 요청을 받고, Guard와 decorator를 적용하고, use-case 계층을 호출합니다.
- Controller는 상태코드, 응답 타입, Swagger 문서를 명시합니다.
- Controller는 비즈니스 규칙의 source of truth가 아닙니다.

## Must

- MUST `@Body`, `@Param`, `@Query`, 사용자 컨텍스트를 수집한 뒤 use-case 계층에 위임합니다.
- MUST 공개 API와 관리자 API에 필요한 Guard와 문서화를 명시합니다.
- MUST 클래스 선언에는 아래 preset 중 하나를 사용합니다.
- MUST 공개 전용 컨트롤러는 `ApiPublicController(tag, ...models)`를 사용합니다.
- MUST 공개/관리자 엔드포인트가 함께 있는 feature 컨트롤러는 `ApiFeatureController(tag, ...models)`를 사용합니다.
- MUST 관리자 전용 컨트롤러는 `ApiAdminController(tag, ...models)`를 사용합니다.
- MUST 메서드 문서화는 `ApiPublicList`, `ApiPublicDetail`, `ApiPublicSingle`, `ApiAdminCreate`, `ApiAdminAction`, `ApiAdminUpdate`, `ApiAdminPatch`, `ApiAdminDetail`, `ApiAdminDelete` 조합만 사용합니다.
- MUST 응답 상태코드가 기본값과 다르면 명시적으로 선언합니다.
- MUST Controller 메서드는 진입점별 사용 시나리오를 표현하는 이름과 시그니처를 유지합니다.
- SHOULD 쿼리 문자열 보정이 필요하면 간단한 transport parsing까지만 허용합니다.

## Must Not

- MUST NOT Repository를 직접 호출합니다.
- MUST NOT 트랜잭션 처리나 외부 I/O orchestration을 수행합니다.
- MUST NOT 복잡한 조건 분기나 도메인 정책을 구현합니다.
- MUST NOT 응답 변환 계층 없이 Response DTO 조립을 메서드 본문에서 반복합니다.
- MUST NOT 에러 메시지 정책을 Controller마다 따로 정의합니다.

## Review Questions

- 이 로직은 지금 레이어에 있어야 하는가?
- use-case 계층 호출 전후에 남은 코드가 transport concern만 다루고 있는가?
- 인증/인가/응답 문서화가 엔드포인트 계약과 정확히 맞는가?
- 컨트롤러 preset 선택이 엔드포인트 구성과 정확히 맞는가?
- 다른 진입점에서 재사용될 정책이 Controller 안에 숨어 있지 않은가?

## Exception Process

- 간단한 파싱이 Service로 넘어가면 HTTP 의도가 흐려질 때만 Controller에 남깁니다.
- Controller에서 분기가 필요하면 “상태코드/응답 헤더/쿼리 파싱”인지 먼저 확인합니다.
- 그 외 분기는 기본적으로 use-case 계층 또는 응답 변환 계층으로 이동합니다.
