# Server Actions And Data Access Guardrails

## 목적

- 이 문서는 server action, server utility, API client를 각각 분리해 서버 실행 계층과 data access 계층을 안정적으로 유지하기 위한 기준입니다.
- mutation, redirect, revalidate, 인증, API 호출을 한 파일에 과도하게 섞지 않게 합니다.

## 책임과 경계

- Server action은 form/action 진입점입니다.
- Server utility는 server-only fetch orchestration과 route 보조 로직을 담당합니다.
- Data access 계층은 `lib/api`와 관련 유틸로 외부 API 호출 계약을 캡슐화합니다.

## Must

- MUST 서버 전용 `BLOG_API_URL`로 NestJS를 호출합니다. `NEXT_PUBLIC_API_URL` 및 광범위 `/api/:path*` rewrite는 사용하지 않습니다.
- MUST Vercel에서는 요청마다 공식 `@vercel/oidc`의 `getVercelOidcToken()`을 호출하여 `X-Mion-Caller-OIDC`에 담습니다. 관리자 JWE `Authorization: Bearer`는 별도로 유지합니다.
- MUST 개발 대체 인증은 `VERCEL`이 없고 `NODE_ENV`가 `development` 또는 `test`인 경우에만 `BLOG_API_LOCAL_SECRET`을 `X-Mion-Local-Caller`로 전달합니다. 미설정 시 요청을 거부합니다.
- MUST 클라이언트 입력 헤더를 서버 호출자 인증으로 전달하지 않습니다. 공통 요청은 인증 헤더를 서버에서 생성하고 절대 URL과 리다이렉트를 거부합니다.
- MUST 이미지 발급은 기존 인증된 Next Route Handler에서 NestJS를 호출하며, 바이너리 PUT은 발급받은 Supabase Storage URL로 직접 전송합니다.
- MUST 외부 API 호출은 data access 계층에 모읍니다.
- MUST server action은 인증 확인, payload 준비, redirect/revalidate orchestration을 담당합니다.
- MUST server action이 사용하는 form parsing은 별도 parser 또는 helper로 분리합니다.
- MUST API client는 endpoint URL, header, body, query string, 에러 해석을 일관되게 관리합니다.
- MUST 서버 전용 인증 토큰 처리와 redirect 정책은 server 실행 계층에서 관리합니다.
- SHOULD settings 조회, 목록 조회 같은 read orchestration은 feature별 server utility로 분리합니다.
- SHOULD route page의 읽기 데이터는 server utility에서 준비하고 client component에는 props로 전달합니다.
- SHOULD 브라우저 업로드는 client 예외 경로로 둘 수 있지만, pre-signed 요청 계약과 업로드 절차는 공용 helper에 모읍니다.

## Must Not

- MUST NOT client component가 API client를 통해 관리자 토큰을 직접 다룹니다.
- MUST NOT server action이 low-level fetch 세부사항을 매번 새로 정의합니다.
- MUST NOT data access 계층이 redirect, revalidate, UI 메시지 라우팅을 책임집니다.
- MUST NOT route handler와 server action이 같은 mutation 정책을 중복 구현합니다.
- MUST NOT client component가 목록/설정 조회를 위해 mount 시점 fetch 루프를 직접 구현합니다.
- MUST NOT 여러 form component가 같은 업로드 endpoint 계약을 각자 inline fetch로 복제합니다.

## Review Questions

- 이 fetch 로직은 data access 계층으로 이동해야 하지 않는가?
- redirect/revalidate/auth orchestration이 server 실행 계층에 모여 있는가?
- form parsing과 mutation orchestration이 분리되어 있는가?
- 같은 API 에러 해석이 여러 파일에 복제되지 않았는가?
- 읽기 흐름이 server-first이고, retry는 `router.refresh()` 같은 route 갱신으로 수렴하는가?
- 브라우저 업로드가 필요하다면 endpoint 계약이 공용 helper 뒤에 숨겨져 있는가?

## Exception Process

- 단발성 외부 호출이라도 두 번째 호출 가능성이 보이면 data access 계층으로 승격합니다.
- route 전용 read helper가 재사용되기 시작하면 feature별 server utility로 이동합니다.
- server action이 커지면 parser, auth helper, mutation helper로 쪼개고 action은 진입점으로만 남깁니다.
- 파일 바이너리 업로드처럼 browser API가 필요한 흐름은 client component에 남길 수 있습니다.
- 다만 이 경우에도 업로드 endpoint 경로, 요청 body, signed upload 절차는 공용 client helper로 승격합니다.

## 운영 적용 절차

- 웹과 API 인증 변경을 통합 검증한 뒤 함께 적용합니다. 부분 변경을 독립 배포하지 않습니다.
- Doppler 기준으로 웹의 `BLOG_API_URL`에 HTTPS 백엔드 원점을 설정합니다. 브라우저 공개 변수는 사용하지 않습니다.
- Vercel OIDC 활성화 및 실제 토큰의 발급자·대상·프로젝트/환경 주체를 확인하고 API의 `BLOG_API_CALLER_ISSUER`, `BLOG_API_CALLER_AUDIENCE`, `BLOG_API_CALLER_SUBJECT`에 정확히 일치시킵니다. 예시값을 운영값으로 사용하지 않습니다.
- 빌드 중 백엔드 조회에도 OIDC 토큰이 제공되는지 확인합니다. 토큰이 없으면 무인증 요청을 보내지 않습니다.
- 로컬에서는 양쪽 서버에 동일한 개발 전용 비밀을 공급하며 공유 Doppler 변경은 별도로 적용합니다. Vercel 배포나 production에서는 개발키로 대체할 수 없습니다.
- 서버 호출자 인증은 Nest 호스트의 네트워크 비공개화를 의미하지 않습니다.
- Turbo의 `globalEnv`에는 URL·배포 구분을 선언하고, 수명이 짧은 OIDC 토큰과 개발 비밀은 `globalPassThroughEnv`로 전달하여 토큰 갱신만으로 빌드 캐시 키를 바꾸지 않습니다. 인증 성공 여부 자체는 캐시 적중으로 검증되지 않으므로 통합 요청 검증이 별도로 필요합니다.
- 공식 근거: https://vercel.com/docs/oidc/api , https://vercel.com/docs/oidc/reference
