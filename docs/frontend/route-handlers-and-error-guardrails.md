# Route Handlers And Error Guardrails

## 목적

- 이 문서는 `app/api` route handler와 프론트엔드 에러 처리 규칙을 일관되게 유지하기 위한 기준입니다.
- 인증, 프록시 응답, 에러 shape가 화면마다 달라지는 것을 막습니다.

## 책임과 경계

- Route handler는 HTTP 경계에서 request를 받고 response를 반환합니다.
- Route handler는 server 실행 계층과 data access 계층을 조합할 수 있습니다.
- 프론트엔드 에러 타입은 data access 계층에서 해석하고, route handler는 HTTP response shape를 맞춥니다.

## Must

- MUST route handler는 request parsing, auth 확인, server utility 호출, response 변환까지만 담당합니다.
- MUST 인증 누락, 재인증 필요, upstream API 실패를 구분된 response shape로 반환합니다.
- MUST route handler에서 사용하는 에러 코드는 data access 계층의 에러 타입과 일관되게 유지합니다.
- MUST 화면에서 재사용되는 에러 해석은 `lib/api-errors.ts` 같은 공통 위치에 둡니다.
- SHOULD route handler의 성공/실패 response shape는 같은 feature 안에서 일관되게 유지합니다.

## Must Not

- MUST NOT route handler가 feature별 business rule의 source of truth가 됩니다.
- MUST NOT route handler가 low-level 외부 API 호출을 직접 난립시킵니다.
- MUST NOT client component가 route handler error shape를 제각각 해석하도록 방치합니다.
- MUST NOT 에러 메시지와 상태코드 정책을 파일마다 새로 정의합니다.

## Review Questions

- 이 로직은 route handler에 있어야 하는가, server 실행 계층으로 내려가야 하는가?
- auth 확인, upstream 호출, response 변환이 한 눈에 구분되는가?
- 에러 shape가 같은 feature의 다른 진입점과 일관적인가?
- data access 계층의 에러 타입과 route handler의 response가 충돌하지 않는가?

## Exception Process

- 외부 서비스 제약으로 route handler에서 직접 fetch가 필요하면 이유와 종료 조건을 남깁니다.
- 간단한 프록시라도 두 군데 이상에서 반복되면 server utility 또는 data access 계층으로 승격합니다.
- 스트리밍/파일 응답 같은 특수 shape는 일반 JSON 규칙 예외로 문서화합니다.
