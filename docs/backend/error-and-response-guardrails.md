# Error And Response Guardrails

## 목적

- 이 문서는 입력 검증, 예외 응답, 성공 응답 포맷을 일관되게 유지하기 위한 기준입니다.
- 사용자 메시지, 에러 코드, 내부 원인, 로깅 책임을 분리해 관리합니다.

## 책임과 경계

- `ValidationPipe`는 입력 계약 위반을 잡습니다.
- `GlobalExceptionFilter`는 예외를 공통 에러 응답으로 변환합니다.
- `ResponseInterceptor`는 성공 응답 shape를 통일합니다.
- 레이어별 책임은 “검증은 transport 입력 경계”, “예외 판단은 use-case 계층과 Common”, “최종 응답 shape는 Common”으로 나뉩니다.

## Must

- MUST 전역 `ValidationPipe` 정책을 기준으로 DTO 검증을 설계합니다.
- MUST validation payload shape와 사용자 메시지는 공통 포맷을 유지합니다.
- MUST use-case 계층은 의미 있는 Nest 예외를 던지고, 최종 응답 조립은 filter/interceptor에 맡깁니다.
- MUST 에러 코드, 상태코드, 사용자 메시지의 매핑은 공통 계층에서 관리합니다.
- MUST 컨트롤러 문서화는 `ApiPublic*` / `ApiAdmin*` 공통 데코레이터 조합으로만 표현합니다.
- MUST 로깅 책임은 예외 필터 또는 전용 로거에 둡니다.
- SHOULD 개발 환경에서만 내부 상세를 노출하고, 운영에서는 사용자 친화 메시지로 제한합니다.

## Must Not

- MUST NOT transport 계층이나 use-case 계층이 성공 응답 envelope를 직접 조립합니다.
- MUST NOT feature별로 validation payload shape를 바꿉니다.
- MUST NOT 내부 에러 원문을 운영 응답에 그대로 노출합니다.
- MUST NOT 예외 로깅을 여러 레이어에서 중복 수행합니다.
- MUST NOT 성공 응답 메시지 정책을 각 엔드포인트에서 임의로 다르게 만듭니다.

## Review Questions

- 이 예외는 입력 위반인가, 정책 위반인가, 시스템 오류인가?
- 사용자 메시지와 내부 진단 정보가 분리되어 있는가?
- 성공 응답과 에러 응답이 공통 shape를 유지하는가?
- 검증 실패와 비즈니스 실패가 같은 형태로 섞여 있지 않은가?

## Exception Process

- 공통 에러 포맷으로 표현되지 않는 예외가 필요하면 먼저 에러 코드 체계 확장 여부를 검토합니다.
- 외부 라이브러리 예외는 parser나 common utility에서 해석하고 feature별 use-case 계층으로 퍼뜨리지 않습니다.
- 파일 다운로드나 스트리밍처럼 envelope 예외가 필요하면 엔드포인트 수준에서 이유를 명시합니다.
