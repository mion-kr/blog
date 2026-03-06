# App Router Guardrails

## 목적

- 이 문서는 `app/` 아래 route 계층을 App Router 진입점으로 유지하기 위한 기준입니다.
- page, layout, metadata, sitemap, route handler의 책임이 뒤섞이지 않게 합니다.

## 책임과 경계

- page는 화면 단위 route 진입점입니다.
- layout은 route segment 공통 골격입니다.
- `generateMetadata`, `sitemap`, `robots`, feed route는 SEO/배포 계약을 담당합니다.
- route 계층은 server 실행 계층과 presentation 계층을 조합합니다.

## Must

- MUST page는 route 수준 파라미터 해석과 조합만 담당합니다.
- MUST layout은 공통 크롬, provider 조합, route segment 공통 구조만 담당합니다.
- MUST metadata 생성 로직은 route와 가까운 곳에 두되, 중복 데이터 조회는 server utility로 분리합니다.
- MUST not-found, loading, error 시나리오는 route 단위 UX 의도로 유지합니다.
- MUST route segment에서 반복되는 server fetch는 별도 server utility로 추출합니다.
- SHOULD 검색 파라미터 해석은 page 또는 server utility 한 곳에서만 관리합니다.

## Must Not

- MUST NOT page 본문에 브라우저 전용 hook을 섞어 넣습니다.
- MUST NOT layout이 feature별 business rule을 직접 소유합니다.
- MUST NOT route 계층이 low-level fetch 옵션과 에러 파싱을 반복 정의합니다.
- MUST NOT metadata 함수와 본문 함수가 같은 fetch를 각자 제각각 구현합니다.

## Review Questions

- 이 로직은 route 계층의 조합 책임인가, server 실행 계층으로 내려가야 하는가?
- metadata와 page가 같은 데이터를 다른 방식으로 가져오고 있지 않은가?
- searchParams/params 해석 위치가 한 군데로 모여 있는가?
- layout이 route 공통 골격만 담당하고 있는가?

## Exception Process

- page 파일이 커지더라도 route 계층 고유 책임이면 유지할 수 있습니다.
- 같은 route 파일에서 SEO와 본문이 서로 다른 fetch 정책을 요구하면 server utility를 분리합니다.
- Next 제약으로 route 계층에 남겨야 하는 로직은 이유를 주석으로 남깁니다.
