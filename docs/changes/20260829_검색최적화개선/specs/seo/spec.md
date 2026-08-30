# 검색 최적화 개선 변경 명세

## Change Identity

- 불변 작업 식별자: `20260829_검색최적화개선`
- 기능 식별 키: `seo`
- 기준 명세: `docs/specs/seo/spec.md`
- 기준 명세 조회 상태: 없음
- 변경 유형: 추가·수정

## Baseline State

- 기준 명세의 현재 동작: 기준 명세 없음
- 기준 명세 경로와 확인 근거: `docs/specs/seo/spec.md`가 존재하지 않음을 2026-08-29 확인
- 기준 명세가 없거나 불완전한 경우의 미확인 사항: 과거 SEO 제품 정책과의 문서 대조는 불가능하며, 아래 현재 상태는 운영 감사와 코드 관찰 근거이지 기준 명세가 아니다.

## Proposed Delta

### 추가

- About는 1200×630의 2D 애니메이션 스타일 귀여운 남자 개발자 전용 공유 이미지를 제공한다.
- 홈과 글 목록은 기존 게시물 cover와 별개인 1200×630 공통 브랜드 공유 이미지를 제공한다.
- 모든 게시물의 `BlogPosting.author.url`은 블로그 `/about`을 가리킨다.
- 공개 게시일 표시는 `Asia/Seoul` 기준으로 일관되게 제공한다.

### 수정

- 관리자 로그인은 검색 색인과 의도된 소셜 미리보기에서 제외하고 직접 접근·로그인·callback은 유지한다.
- 기본 목록과 검색·카테고리·태그 결과에서 실제 마지막 페이지를 넘긴 요청은 404로 응답한다. 결과가 0개인 첫 페이지는 정상 빈 화면이다.
- 페이지네이션은 JavaScript button 전용 탐색에서 query를 보존하는 실제 URL link 탐색으로 변경한다.
- 섹션 링크와 카드 보조 링크는 목적지를 구분할 수 있는 보이는 문구 또는 접근성 이름을 제공한다.
- 네온 테마를 유지하면서 공개 홈·글 목록·About·글 상세·공개 404와 `/auth/signin`의 로컬 UI를 WCAG 2.2 AA 목표로 부분 감사하고, 확인된 실패만 최소 범위로 보정한다. 이 범위를 블로그 전체 적합성 선언으로 확대하지 않는다.
- 운영 홈의 모바일 Lighthouse LCP는 동일 조건에서 2.5초 이하를 1차 목표로 한다.

### 제거

- `/og/about.png`의 404 상태
- 관리자 로그인에 상속되는 홈 canonical·Open Graph·Twitter metadata
- 범위를 초과한 목록 URL의 색인 가능한 200 응답

### 명시적 무변경

- 현재 로그인 UI, Google 인증, 안전한 callback URL 처리
- API·DTO·DB 스키마와 게시물 pagination 응답 계약
- 저장된 게시·수정 시각과 HTML `dateTime`의 원본 ISO 값
- 운영 게시물의 기존 cover image와 상세 글 cover 우선 정책
- 유효한 목록 page의 self-canonical, 검색·필터 URL의 기존 noindex
- 핵심 네온 레이아웃과 콘텐츠
- 인증 후 관리자 화면과 외부 Google 인증 제공자 화면

## Terminology Delta

- 기준 용어 참조: 기준 명세 없음
- 변경 용어 레지스트리: 없음
- 추가·수정·금지 별칭 영향: 새로운 API 필드·DB 컬럼·상태값이 없어 용어 변경 없음

## Acceptance And Validation

- `/auth/signin`은 비인증 세션에서 200으로 직접 접근 가능하고 `noindex`이며 홈 canonical·`og:*`·`twitter:*`를 노출하지 않는다. 인증 세션의 기존 redirect는 유지한다.
- 기본·필터 목록의 page 1 빈 결과는 200이고 실제 마지막 page 초과는 production build 서버에서 실제 HTTP 404·noindex다.
- 홈·목록·상세·공개 카드의 게시일은 동일 입력에 같은 한국 날짜를 표시하며 hydration 오류가 없다.
- `/og/about.png`, `/og/blog.png`는 200·PNG·1200×630이며 대응 route metadata에 연결된다.
- 상세 글의 기존 cover image는 유지되고 `BlogPosting.author.url`은 `/about`이다.
- 페이지네이션 anchor href는 현재 query를 보존하며 유효 page canonical과 필터 noindex가 유지된다.
- 링크 이름, focus, 대비와 포인터 대상은 WCAG 2.2 A·AA의 해당 성공 기준을 충족한다. 포인터 대상은 24×24 CSS px, 대상 간 간격 또는 명시된 예외 중 요소별 근거를 기록하며 44×44를 일괄 요구하지 않는다.
- 키보드 초점 요소는 sticky UI에 완전히 가려지지 않고, 공개 route와 로컬 로그인 화면에는 drag-only 상호작용·반복 입력·인지 기능 검사가 없어야 한다. 반복 도움말 수단이 추가되는 경우 route 간 상대적 순서를 유지한다.
- 320 CSS px 폭에서 정보·기능 손실 없이 세로로 reflow되고, 1.4.3 대비·1.4.11 비텍스트 대비·2.4.3 초점 순서·2.4.7 초점 표시·4.1.2 이름/역할/값을 포함한 변경 영향 기준을 route별 통과·실패·해당 없음·미확인으로 기록한다.
- 동일한 모바일 Lighthouse 조건의 유효 실행 3회 중앙값에서 운영 홈 LCP가 2.5초 이하이며 핵심 네온 콘텐츠가 유지된다. CLS·TBT는 보조 회귀 지표로 기록한다.
- 자동 검증은 타입 검사, 린트, production build와 Node 기반 production HTTP 검증을 포함한다. Playwright E2E 구성은 2026-08-30 사용자 지시에 따라 제거한다.
- 수동 검증은 모바일·데스크톱 브라우저, 키보드 초점, 포인터 대상 크기·간격·예외, 대비, metadata HTML, 리치 결과, PageSpeed를 포함한다. 자동 접근성 진단만으로 WCAG 2.2 AA 전체 적합성을 선언하지 않는다.
- DB migration은 없고 코드·자산 rollback만으로 이전 상태로 복귀할 수 있다.

## Open Items

- 관련 Linear 이슈, 실제 DB 레코드, 배포 커밋 일치 여부는 미확인이다.
- 실제 CrUX 현장 데이터가 없어 CWV 통과 여부는 미확인이다.
- 홈은 현재 기준값이 있어 1차 구현·검증 대상으로 정했으며 다른 공개 route의 성능 상태와 향후 목표는 미확인이다.
- 인증 후 관리자 화면과 외부 Google 인증 제공자 화면의 WCAG 2.2 AA 적합성은 이번 변경에서 미확인이다.
- 최종 OG 이미지 시안의 세부 구도·문구는 이미지 생성과 시각 QA에서 확정한다.
- 기준 명세 반영은 구현 완료 후 Mion 6의 책임이다.
