# 터치 영역과 링크 시각 구분

## Change Context

- 불변 작업 식별자: `20260829_검색최적화개선`
- 기능 식별 키: `seo`
- 기준 명세: `docs/specs/seo/spec.md`
- 활성 변경: `docs/changes/20260829_검색최적화개선/`
- 기준 명세 조회 상태: 없음

## 목적

- 이 주제를 확인하는 이유: 네온 디자인을 유지하면서 모바일 조작성과 링크 인지 가능성을 높인다.
- 이 주제가 불명확하면 생기는 리스크: 작은 터치 대상과 색상만으로 구분되는 링크가 키보드·저시력·모바일 사용자에게 불리하다.

## 코드·운영 근거로 자답한 내용

- 과거 요구사항은 WCAG 2.1 AA, 4.5:1 이상의 색상 대비, 키보드 탐색, 스크린 리더 지원을 명시한다.
- 사용자는 2026-08-30 후속 결정에서 접근성 목표를 WCAG 2.2 AA로 상향했다.
- 모바일 Lighthouse 접근성 점수는 91이며 터치 대상 크기·간격 문제가 감지됐다.
- 홈 푸터 본문은 muted 색상이고 링크는 cyan 색상만으로 구분되며 기본 밑줄이 없다.
- hover에는 광택 효과만 있어 키보드 focus와 상시 링크 구분을 대신하지 못한다.
- 네온 색상 체계 자체를 폐기할 필요는 없고, 밑줄·focus 표시·최소 터치 영역을 route-local 스타일에서 보강할 수 있다.

## Interview Log

1. **질문:** 접근성 수용 기준에 별도 제품 정책 결정이 필요한가?
   - **기존 자답:** 과거 요구사항의 WCAG 2.1 AA를 유지한다.

2. **질문:** 현재 UI의 접근성 목표를 WCAG 2.1 AA로 유지할 것인가, WCAG 2.2 AA로 상향할 것인가?
   - **답변:** WCAG 2.2 AA를 목표로 한다.

## Score

- 현재 불명확성 점수: `0.05`
- 목표 임계값: `Deep 0.15`
- 점수 근거: WCAG 2.2 AA 상향 목표가 사용자 결정으로 확정됐다.
- 다음에 낮춰야 할 불확실성: 없음. 2.2 AA의 세부 수용 기준과 현재 UI 차이는 후속 설계·검증에서 정리한다.

## Confirmed

- 네온 그리드와 다크 테마는 유지 대상이다.
- 터치 대상과 링크 구분 문제는 개선 대상이다.
- 접근성 목표는 WCAG 2.2 AA로 상향한다.
- 네온 테마와 콘텐츠는 WCAG 2.2 AA를 충족하는 범위에서 유지한다.
- WCAG 2.2 AA의 터치 대상 기준은 크기·간격·예외를 요소별로 판단하며, WCAG 2.1 AAA의 44×44를 일괄 적용하지 않는다.

## Open Questions

- WCAG 2.2 AA 반영을 위한 설계·변경 명세·구현 계획 갱신과 실제 수용 검증은 후속 단계 범위다.
- 기준 명세 `docs/specs/seo/spec.md`가 없어 기존 SEO 제품 정책과의 대조는 미확인이다. Mion 2에서는 활성 변경 명세만 작성했으며 기준 반영은 구현 완료 후 Mion 6에서 결정한다.

## Terminology Impact

- 관련 개념 키: 없음
- 신규 후보·확정·변경·금지 별칭: 없음

## References

- [`apps/blog-web/app/(site)/page.tsx`](../../../../apps/blog-web/app/%28site%29/page.tsx) - 홈 푸터와 링크 구조
- [`apps/blog-web/app/(site)/home-neon-grid.module.css`](../../../../apps/blog-web/app/%28site%29/home-neon-grid.module.css) - 푸터 링크 시각 스타일
- [`apps/blog-web/app/globals.css`](../../../../apps/blog-web/app/globals.css) - 공통 터치·링크 스타일 후보
- [`documents/context.md`](../../../../documents/context.md) - 기존 WCAG 2.1 AA·대비·키보드·스크린 리더 요구사항
