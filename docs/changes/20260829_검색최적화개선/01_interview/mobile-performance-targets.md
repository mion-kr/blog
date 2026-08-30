# 모바일 성능 목표와 최적화 범위

## Change Context

- 불변 작업 식별자: `20260829_검색최적화개선`
- 기능 식별 키: `seo`
- 기준 명세: `docs/specs/seo/spec.md`
- 활성 변경: `docs/changes/20260829_검색최적화개선/`
- 기준 명세 조회 상태: 없음

## 목적

- 이 주제를 확인하는 이유: 실제 CWV 데이터가 없는 동안 사용할 모바일 성능 목표와 시각적 절충 범위를 정한다.
- 이 주제가 불명확하면 생기는 리스크: 단일 Lighthouse 점수를 실제 사용자 성능으로 오해하거나, 점수 개선을 위해 핵심 디자인·콘텐츠를 과도하게 제거할 수 있다.

## 코드·운영 근거로 자답한 내용

- Search Console과 PageSpeed Insights 모두 모바일·데스크톱 CWV 현장 데이터가 부족해 현재 통과 여부를 판정할 수 없다.
- 동일 시점 홈 Lighthouse는 모바일 성능 87, LCP 3.3초, TBT 50ms, CLS 0이었다.
- 데스크톱은 성능 100, LCP 0.7초, TBT 10ms, CLS 0이었다.
- 모바일 진단에는 렌더 차단 약 310ms, 미사용 CSS 약 26KiB, 미사용 JavaScript 약 50KiB, legacy JavaScript 약 12KiB, 긴 main-thread task 2개, 비합성 애니메이션 1개가 포함됐다.
- 실제 CWV가 생기기 전에는 반복 가능한 Lighthouse 조건과 배포 후 회귀 검사를 보조 기준으로 사용해야 한다.

## Interview Log

1. **질문:** 모바일 성능 개선의 목표와 시각 효과 변경 허용 범위를 어디까지 둘 것인가?
   - **답변:** 모바일 Lighthouse LCP 2.5초 이하를 1차 목표로 한다. 핵심 네온 디자인은 유지하고 비핵심 애니메이션과 지연 가능한 리소스는 조정할 수 있다. Lighthouse 종합 성능 점수 90 이상은 확정하지 않았다.

## Score

- 현재 불명확성 점수: `0.10`
- 목표 임계값: `Deep 0.15`
- 점수 근거: 모바일 LCP 목표와 핵심 디자인 보존 범위가 확정됐다. Lighthouse 종합 성능 점수 목표는 확정하지 않았다.
- 다음에 낮춰야 할 불확실성: 없음. 실제 CWV 현장 데이터가 생기면 별도로 재평가한다.

## Confirmed

- 데스크톱보다 모바일 최적화를 우선한다.
- CWV 현장 데이터가 생길 때까지 Lighthouse는 임시 회귀 기준이며 실제 CWV 판정이 아니다.
- 모바일 Lighthouse LCP 2.5초 이하를 1차 수용 기준으로 사용한다.
- 핵심 네온 디자인은 유지하고 비핵심 애니메이션·지연 가능한 리소스는 목표 달성을 위해 조정할 수 있다.
- 좋은 CWV는 Google 검색 성공에 기여하지만 관련성 높은 콘텐츠와 색인 가능성을 대신하지 않으며 상위 노출을 보장하지 않는다.

## Open Questions

- 실제 CrUX 현장 데이터가 생긴 뒤 LCP·INP·CLS의 75번째 백분위수를 다시 평가한다.
- 현재 수치는 운영 홈의 Lighthouse 결과이므로 Mion 2는 홈을 1차 구현·검증 대상으로 정했다. 이는 다른 공개 route의 향후 성능 목표를 제외하거나 통과로 간주하는 제품 결정이 아니다.
- 기준 명세 `docs/specs/seo/spec.md`가 없어 기존 SEO 제품 정책과의 대조는 미확인이다. Mion 2에서는 활성 변경 명세만 작성했으며 기준 반영은 구현 완료 후 Mion 6에서 결정한다.

## Terminology Impact

- 관련 개념 키: 없음
- 신규 후보·확정·변경·금지 별칭: 없음

## References

- [`apps/blog-web/app/layout.tsx`](../../../../apps/blog-web/app/layout.tsx) - 전역 폰트·provider·metadata 구성
- [`apps/blog-web/app/(site)/page.tsx`](../../../../apps/blog-web/app/%28site%29/page.tsx) - 홈 초기 콘텐츠 구조
- [`apps/blog-web/app/(site)/home-neon-grid.module.css`](../../../../apps/blog-web/app/%28site%29/home-neon-grid.module.css) - 네온 시각 효과와 애니메이션
- [Core Web Vitals](https://web.dev/articles/vitals) - LCP·INP·CLS 권장 기준
- [Google 페이지 경험 기준](https://developers.google.com/search/docs/appearance/page-experience) - CWV의 검색 영향과 한계
