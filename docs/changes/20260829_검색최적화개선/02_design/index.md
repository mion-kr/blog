# 검색 최적화 개선 설계

## 작업

- 작업 식별자: `20260829_검색최적화개선`
- 기능 식별 키: `seo`
- 기준 명세: `docs/specs/seo/spec.md`
- 변경 명세: `docs/changes/20260829_검색최적화개선/specs/seo/spec.md`

## 목적

인터뷰에서 확정한 10개 SEO 개선 주제를 현재 Next.js App Router 구조에 적용 가능한 프론트엔드 설계로 구체화한다. API·DB·인증 계약과 기존 게시물 데이터는 유지하며 코드 구현, 이미지 생성, 배포, 색인 요청은 이 단계에서 수행하지 않는다.

## 문서

| 문서 | 목적 |
| --- | --- |
| [metadata-and-indexing.md](metadata-and-indexing.md) | 로그인 노출 제외, 목록 범위 초과 404, 작성자 구조화 데이터 설계 |
| [social-image-assets.md](social-image-assets.md) | About 전용 이미지와 홈·목록 공통 공유 이미지 설계 |
| [rendering-navigation-accessibility.md](rendering-navigation-accessibility.md) | 한국 시간 표시, 링크 페이지네이션, 링크 이름과 WCAG 2.2 AA 접근성 설계 |
| [mobile-performance.md](mobile-performance.md) | 모바일 홈 LCP 2.5초 이하를 위한 측정·최적화 설계 |
| [변경 명세](../specs/seo/spec.md) | 기준 명세가 없는 SEO 기능의 관찰 가능한 변경 계약 |

## 확인 근거

| 출처 | 링크 | 관련 이유 |
| --- | --- | --- |
| 인터뷰 | [01_interview/index.md](../01_interview/index.md) | 10개 주제의 사용자 결정과 자답 결과 |
| 프론트엔드 기준 | [App Router Guardrails](../../../frontend/app-router-guardrails.md) | metadata·not-found·route 계층 책임 |
| 프론트엔드 기준 | [Testing And Change Management](../../../frontend/testing-and-change-management.md) | route·metadata·client 상호작용 검증 기준 |
| 코드 | [`apps/blog-web/app`](../../../../apps/blog-web/app) | 현재 route·metadata·페이지네이션·표시 구현 |
| 런타임 검증 | [`verify-seo-runtime.mjs`](../../../../apps/blog-web/scripts/verify-seo-runtime.mjs) | Node 기반 production HTTP·metadata·구조화 데이터 회귀 검증 |
| 공식 문서 | [Next.js generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) | metadata 상속과 shallow override |
| 공식 문서 | [Google 페이지 경험 기준](https://developers.google.com/search/docs/appearance/page-experience) | CWV의 검색 영향과 한계 |
| 공식 문서 | [W3C WCAG 2.2 변경 사항](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) | 2.2의 신규 A·AA 성공 기준과 2.1 대비 변경 범위 |

근거 기준은 `mion-kr/스킬활용한-리펙토링`, 커밋 `73d5dec01662af39c498ef0904db925710599536`, Next.js `16.3.3`이며 2026-08-29 16:33 +0900 재확인 결과 코드 기준은 인터뷰 시점과 동일하다. 관련 Linear 이슈, 실제 DB 레코드, 배포 커밋 일치 여부는 미확인이다.

## 남은 질문

- 사용자 제품 결정이 필요한 질문은 없다.
- 실제 CrUX 현장 데이터가 없어 운영 CWV 통과 여부는 미확인이다.
- 인증 후 관리자 화면과 외부 Google 인증 제공자 화면의 WCAG 2.2 AA 적합성은 이번 공개 SEO 활성 변경에서 미확인이다.
- 기준 명세 `docs/specs/seo/spec.md`는 없으며 이번 활성 변경에는 신규 기능 델타만 기록한다.

## 다음 작업

- WCAG 2.2 AA 후속 결정을 설계·활성 변경 명세·구현 계획에 반영했다.
- Mion 4의 설계 지지·반박·구현 가능성 검토에서 6개 route, 320px Reflow, 영향 기준 매트릭스, 실패 선택자만 수정하는 범위에 합의했다.
- Mion 5 로컬 수용 검증은 완료됐고 운영 SEO 검증 전에는 Mion 6 아카이브로 판단하지 않는다.
