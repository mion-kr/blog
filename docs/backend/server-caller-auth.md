# 포스트 서버 호출자 인증

- 대상: `GET/POST /api/posts`, `GET/PUT/DELETE /api/posts/:slug`, `GET /api/admin/posts`, `GET /api/admin/posts/:slug`.
- 모든 대상에 `ServerCallerGuard`를 적용합니다. 공개 글 조회는 방문자 로그인 없이 신뢰하는 Next 서버를 통해 제공하며, 기존 발행 상태 필터와 `trackView` 동작을 유지합니다.
- 관리자 쓰기 및 관리자 조회는 호출자 인증 후 기존 `AdminGuard`와 NextAuth 사용자 검증을 추가로 통과해야 합니다. `Authorization: Bearer`는 사용자 인증 전용입니다.
- 요청·응답 본문 필드는 변경하지 않습니다. 호출자 인증 실패는 기존 공통 오류 처리 경로로 401을 반환합니다.

## 서버 간 계약

| 설정·헤더 | 의미 |
| --- | --- |
| `X-Mion-Caller-OIDC` | 웹의 서버 전용 코드가 요청 시점에 `@vercel/oidc`의 `getVercelOidcToken()`으로 얻은 토큰 |
| `BLOG_API_CALLER_ISSUER` | 실제 웹 프로젝트 issuer 모드에 해당하는 정확한 Vercel issuer |
| `BLOG_API_CALLER_AUDIENCE` | 실제 토큰의 정확한 audience |
| `BLOG_API_CALLER_SUBJECT` | 허용할 웹 프로젝트와 환경을 포함하는 정확한 subject 하나 |
| `BLOG_API_URL` | 웹 서버 전용 백엔드 URL. 웹 담당 작업에서 적용 |

API는 기존 `jose`로 RS256 서명, issuer/audience/subject 일치, 필수 만료(`exp`)와 발급 시각(`iat`)을 검사합니다. 만료·서명 오류·다른 프로젝트/환경·설정 누락·공개 키 조회 실패는 모두 거부합니다. JWKS 주소는 요청 토큰이 아닌 설정된 Vercel issuer에 `/.well-known/jwks`를 붙여 만듭니다. 팀 issuer의 경로를 보존하고 키 조회 결과는 `jose`가 캐시합니다.

실제 설정값은 이번 작업에서 확인하거나 생성하지 않았습니다. 예시 문자열을 운영 설정으로 사용하지 않습니다. Doppler를 기준으로 배포 환경별 정확한 값을 확인해 설정해야 합니다. Origin/Referer/CORS는 이 인증의 근거가 아닙니다.

## 로컬 개발

- 양쪽 서버 전용 `BLOG_API_LOCAL_SECRET`을 동일하게 설정하고 `X-Mion-Local-Caller`로 전달합니다. 공유 개발값은 이 작업에서 변경하지 않습니다.
- `NODE_ENV`가 `development` 또는 `test`이고 `VERCEL` 자체가 미설정인 경우만 허용합니다. `production`, 환경 미설정, `VERCEL` 존재(빈 값 포함), 비밀 미설정/불일치는 거부합니다.
- OIDC 헤더가 함께 있으면 OIDC를 검증하며, 실패해도 로컬 비밀로 대체하지 않습니다.
- 비밀과 토큰을 `NEXT_PUBLIC` 설정, 브라우저 응답·번들·로그에 넣지 않습니다.

## 통합·운영 적용 조건

- API와 웹 작업은 각각 부분 구현이므로 독립 운영 배포하지 않습니다. 병합·배포는 이번 작업 범위에 없습니다.
- 통합 후 방문자 미로그인 상태에서 글 목록/상세, 검색·필터·페이지 이동, 메타데이터·사이트맵 생성과 관리자 로그인/쓰기/초안 조회를 확인합니다.
- 실제 Vercel 실행 환경의 OIDC 활성화와 정확한 클레임, API에서 Vercel JWKS에 접근할 수 있는지, 잘못된 프로젝트/환경의 토큰 거부를 확인합니다.
- 웹 빌드 시 데이터 조회가 있다면 빌드 시점 OIDC 공급도 검증합니다. 실제 Vercel 토큰 검증과 웹 통합은 로컬 암호 검증 테스트로 대체되지 않습니다.
- API 호스트의 네트워크 비공개화를 구현한 것은 아닙니다.

## 범위 밖의 기존 노출

- categories/tags의 목록·상세 GET, site/settings GET에는 서버 호출자 인증이나 사용자 인증이 없습니다.
- categories/tags 쓰기, admin/settings GET/PATCH, uploads/pre-signed POST는 기존 관리자 인증을 사용하지만 서버 호출자 인증은 없습니다.
- 전역 접근 정책은 변경하지 않았습니다. API 자체 은닉을 목표로 한다면 별도 범위 합의가 필요합니다.

## 공식 근거

- [Vercel 자체 API 연결](https://vercel.com/docs/oidc/api): JWKS 및 issuer/audience/subject 검증.
- [Vercel OIDC 참조](https://vercel.com/docs/oidc/reference): 토큰 클레임과 요청 시점 토큰 취득, 팀/프로젝트 변경 영향.
