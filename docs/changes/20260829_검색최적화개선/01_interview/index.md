# 검색 최적화 개선 인터뷰

## Change Context

- 불변 작업 식별자: `20260829_검색최적화개선`
- 기능 식별 키: `seo`
- 기준 명세: `docs/specs/seo/spec.md`
- 활성 변경: `docs/changes/20260829_검색최적화개선/`
- 기준 명세 조회 상태: 없음

## 문서

1. [`admin-signin-indexing.md`](admin-signin-indexing.md): 관리자 로그인 검색 노출 정책
2. [`invalid-pagination.md`](invalid-pagination.md): 존재하지 않는 목록 페이지 처리
3. [`date-timezone-hydration.md`](date-timezone-hydration.md): 게시일 시간대와 hydration 일관성
4. [`about-og-image.md`](about-og-image.md): About 소셜 공유 이미지
5. [`default-social-images.md`](default-social-images.md): 홈·목록 기본 OG/Twitter 이미지
6. [`article-author-identity.md`](article-author-identity.md): 글 구조화 데이터의 작성자 식별
7. [`crawlable-pagination.md`](crawlable-pagination.md): 크롤링 가능한 페이지네이션
8. [`descriptive-link-labels.md`](descriptive-link-labels.md): 설명적인 링크 문구
9. [`accessibility-visual-rules.md`](accessibility-visual-rules.md): 터치 영역과 링크 시각 구분
10. [`mobile-performance-targets.md`](mobile-performance-targets.md): 모바일 성능 목표와 최적화 범위

## 확인한 근거

| 대상 | 기준 | 확인 시각 | 확인 결과 |
| --- | --- | --- | --- |
| 저장소 | `mion-kr/스킬활용한-리펙토링`, `73d5dec01662af39c498ef0904db925710599536` | 2026-08-29 +0900 | 조사 기준 브랜치·커밋 확인, 조사 시작 시 기존 변경 없음 |
| 프론트엔드 패키지 | `apps/blog-web/package.json` | 2026-08-29 +0900 | Next.js `16.3.3`, React `19.2.8`, NextAuth `4.24.15` |
| 프론트엔드 기준 | `docs/frontend/README.md`, `app-router-guardrails.md`, `testing-and-change-management.md` | 2026-08-29 +0900 | metadata·sitemap·robots는 route 계층의 SEO 계약이며 route 변경 시 metadata와 테스트 영향을 기록해야 함 |
| SEO 기준 명세·활성 변경 | `docs/specs/`, `docs/changes/` | 2026-08-29 +0900 | `docs/specs/seo/spec.md`와 기존 SEO 활성 변경은 없음. Next.js 16 업그레이드는 별도 활성 변경으로 보존 |
| SEO 구현 | `apps/blog-web/app`, `components`, 당시 Playwright 테스트 | 2026-08-29 +0900 | 아래 10개 주제의 당시 구현과 테스트 범위 확인. Playwright E2E는 2026-08-30 사용자 지시에 따라 제거 |
| 과거 요구사항 | `documents/context.md` | 2026-08-29 +0900 | WCAG 2.1 AA, 4.5:1 대비, 키보드 탐색, 스크린 리더 지원 요구 확인 |
| 접근성 후속 결정 | 사용자 인터뷰 | 2026-08-30 +0900 | 접근성 목표를 WCAG 2.2 AA로 상향하고, WCAG 2.1 AAA의 44×44 일괄 적용은 채택하지 않음 |
| 운영 페이지 | `https://blog.mion-space.dev` 핵심 route와 모바일 렌더링 | 2026-08-29 14시대 +0900 | 로그인 색인, 비정상 페이지네이션, hydration 오류, About OG 404, 링크·접근성 문제 확인 |
| 운영 게시물 이미지 | `/posts`, `/sitemap.xml` | 2026-08-29 +0900 재확인 | 사이트맵 게시물 9개와 대응하는 원격 표지 이미지 URL 9개 확인. 홈·목록 page-level `og:image`는 없음 |
| Google Search Console | `sc-domain:blog.mion-space.dev` | 2026-08-29 14시대 +0900 | 사이트맵 성공·12 URL 발견, 색인 0, 실적 0, 수동 조치·보안 문제 없음. 실시간 URL 검사는 홈·대표 글 모두 색인 가능 |
| PageSpeed Insights | 운영 홈 모바일·데스크톱 | 2026-08-29 14:31 +0900 | 현장 데이터 없음. 모바일 성능 87/LCP 3.3초, 데스크톱 성능 100/LCP 0.7초, SEO 92, 접근성 91 |
| 구조화 데이터 | Google Rich Results Test, Schema.org Validator | 2026-08-29 14:33~14:36 +0900 | 대표 글 `BlogPosting` 유효, 선택 경고 `author.url` 1개. 홈 `WebSite`는 Schema.org 오류·경고 없음 |

운영 보고서의 색인 데이터는 2026-08-21, CWV 보고서는 2026-08-22 기준으로 사이트맵 제출일인 2026-08-28보다 오래됐다. 운영 결과와 저장소 코드는 인터뷰 시작 시점의 기준이며 후속 설계 전에 최신성을 다시 확인한다.

## 확정된 사용자 결정

- 아래 10개 SEO 개선 주제를 인터뷰 문서 초안에 기록한다.
- 각 주제는 한 번에 하나씩 인터뷰한다.
- 인터뷰 문서 작성은 코드 구현·배포·색인 요청 승인이 아니다.
- 관리자 로그인 `/auth/signin`은 검색 결과와 소셜 공유 미리보기에서 모두 제외하고 직접 접근·로그인·callback 동작은 유지한다.
- 기본 목록과 검색·카테고리·태그 필터 결과에서 실제 마지막 페이지를 넘긴 요청은 404로 처리한다. 필터 결과가 0개인 첫 페이지는 정상적인 빈 결과 화면으로 유지한다.
- 홈·목록·상세의 게시일 표시는 한국 시간(`Asia/Seoul`)으로 통일하고 저장된 원본 시각은 변경하지 않는다.
- About에는 2D 애니메이션 스타일의 귀여운 남자 개발자 일러스트를 사용한 1200×630 전용 공유 이미지를 제작한다.
- 기존 게시물 표지는 유지하고, 홈과 글 목록 URL에는 별도로 제작한 공통 브랜드 이미지 한 장을 사용한다.
- 모든 게시물의 구조화 데이터 작성자 URL은 블로그의 `/about`을 사용하고 기존 GitHub 링크는 About에서 유지한다.
- 접근성 목표는 WCAG 2.2 AA로 상향한다. 네온 테마를 유지하되 터치 대상은 크기·간격·예외를 요소별로 판단하고 44×44를 일괄 적용하지 않는다.
- 모바일 Lighthouse LCP 2.5초 이하를 1차 목표로 하고, 핵심 네온 디자인은 유지하되 비핵심 애니메이션·지연 가능한 리소스는 조정할 수 있다. Lighthouse 종합 성능 점수 90 이상은 확정하지 않았다.

## 코드·문서로 자답한 내용

- 관리자 로그인 route는 별도 metadata가 없어 루트의 `index, follow`와 홈 canonical을 상속한다.
- 목록 metadata는 필터 여부만 색인 조건으로 사용하여 실제 범위를 벗어난 `page`도 자기 canonical로 색인 가능하다.
- 목록 카드 날짜는 실행 환경의 로컬 시간대를 사용하므로 서버와 브라우저 결과가 달라질 수 있다.
- About가 선언한 `/og/about.png` 파일은 현재 저장소와 운영에 없다.
- 루트와 목록 metadata에는 기본 OG/Twitter 이미지가 없다.
- 운영 게시물 9개에는 각자 원격 표지 이미지가 있으며 상세 metadata는 `coverImage`가 있으면 이를 사용한다. 이미지 미지정 문제는 홈·목록 page-level metadata로 한정한다.
- 글의 `BlogPosting.author`에는 타입과 이름만 있고 작성자 URL이 없다.
- 페이지네이션은 URL을 가진 링크가 아니라 client 이벤트 버튼이다.
- 홈의 `전체 보기`와 반복되는 `읽기` 링크가 Lighthouse의 설명적 링크 검사에서 지적됐다.
- 홈 푸터 링크는 색상 중심으로 구분되며 일부 터치 대상이 권장 크기에 미달한다.
- 실제 CWV는 데이터 부족으로 판정할 수 없고, 모바일 Lighthouse LCP 3.3초만 현재 최적화 기준으로 사용할 수 있다.

## 근거 충돌과 미확인 사항

- 기존 테스트는 유효한 `page=2`의 자기 canonical을 보장하지만, 전체 페이지 수를 넘긴 요청의 계약은 정의하거나 검증하지 않는다.
- 대표 글 구조화 데이터는 리치 결과 자격이 있지만 `author.url` 선택 경고가 남아 있다.
- 홈 `WebSite` 스키마는 유효하지만 Google 리치 결과 유형은 감지되지 않았다. 이는 스키마 오류와 같은 의미가 아니다.
- Search Console 색인 보고서는 최신 사이트맵 제출보다 오래됐으므로 현재 12개 URL의 최종 색인 결과는 미확인이다.
- CWV 현장 데이터가 없어 Lighthouse 단일 실행 결과를 실제 사용자 통과 판정으로 확대할 수 없다.
- 모든 게시물에 대해 개별 Rich Results Test를 실행하지 않았으며 공통 글 템플릿의 대표 게시물 1건을 검증했다.
- 별도 Next.js 16 업그레이드 인터뷰에는 현재 저장소와 다른 과거 버전·경로가 남아 있고 About 본문도 Next.js 15로 표시된다. 이 불일치는 SEO 10개 주제의 제품 결정을 대신하지 않으며 별도 변경에서 정리해야 한다.
- 관련 Linear 이슈, 실제 DB 레코드, 현재 배포 커밋과 HEAD의 일치 여부는 확인하지 않았다. 다만 운영 목록 렌더링에서 게시물 9개의 표지 URL은 확인했다.
- 현재 `node_modules`가 없어 로컬 빌드·타입 검사·E2E는 실행하지 않았다.

## 주제별 인터뷰 결과

1. 완료: 관리자 로그인 route는 검색·소셜 노출에서 모두 제외한다.
2. 완료: 기본 목록과 필터 결과에서 실제 마지막 페이지를 넘긴 요청은 404로 처리하고, 결과가 0개인 첫 페이지는 정상 화면으로 유지한다.
3. 완료: 게시일 표시는 한국 시간(`Asia/Seoul`)으로 통일한다.
4. 완료: About에는 2D 애니메이션 스타일의 귀여운 남자 개발자 전용 공유 이미지를 제작한다.
5. 완료: 기존 게시물 표지는 유지하고 홈·목록에는 별도의 공통 브랜드 이미지 한 장을 사용한다.
6. 완료: 구조화 데이터 작성자 URL은 블로그의 `/about`을 사용한다.
7. 완료(자답): 기존 유효 페이지 색인·query 계약을 유지하면서 페이지네이션을 실제 링크로 전환한다.
8. 완료(자답): 섹션 링크는 화면 문구를 명확히 하고 카드 링크는 제목을 포함한 접근성 이름을 제공한다.
9. 완료: WCAG 2.2 AA를 목표로 상향하고, 네온 테마를 유지하면서 터치 대상의 크기·간격·예외를 요소별로 판단한다. 44×44 일괄 적용은 하지 않는다.
10. 완료: 모바일 LCP 2.5초 이하를 목표로 하고 핵심 네온 디자인을 유지한다. 종합 성능 점수 목표는 확정하지 않았다.

## 남은 질문

- 사용자 제품 결정이 필요한 질문은 없다.
- 기준 명세 `docs/specs/seo/spec.md`가 없어 기존 SEO 제품 정책과의 대조는 미확인이다. Mion 2에서는 기준 명세를 임의 생성하지 않고 활성 변경 명세만 작성했으며 기준 반영은 구현 완료 후 Mion 6에서 결정한다.

## 다음 작업

- 10개 주제의 인터뷰가 완료됐다.
- WCAG 2.2 AA 후속 결정은 인터뷰·설계·변경 명세·구현 계획과 확인된 실패의 최소 코드 보정에 반영했다.
- Mion 2 설계, Mion 3 구현 계획, Mion 4 합의 검토, Mion 5의 승인된 코드 반영·WCAG 변경 영향 수용 검증·로컬 SEO 검증까지 진행했다. 운영 SEO 검증이 남아 있어 Mion 6 아카이브 조건은 충족하지 않았다.
- 인터뷰 완료는 배포·색인 요청 승인이 아니며, 이번 Mion 5에서도 Git·PR·배포·Search Console 작업은 수행하지 않았다.
