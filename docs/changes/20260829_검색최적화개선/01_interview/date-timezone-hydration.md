# 게시일 시간대와 Hydration 일관성

## Change Context

- 불변 작업 식별자: `20260829_검색최적화개선`
- 기능 식별 키: `seo`
- 기준 명세: `docs/specs/seo/spec.md`
- 활성 변경: `docs/changes/20260829_검색최적화개선/`
- 기준 명세 조회 상태: 없음

## 목적

- 이 주제를 확인하는 이유: 서버 HTML과 브라우저 화면이 동일한 게시일을 표시하도록 기준 시간대를 정한다.
- 이 주제가 불명확하면 생기는 리스크: 자정 전후 게시물이 환경별로 다른 날짜로 표시되고 React hydration 오류가 발생한다.

## 코드·운영 근거로 자답한 내용

- 목록 client component는 `Date.getFullYear/getMonth/getDate`로 실행 환경의 로컬 시간대를 사용한다.
- 운영 `/posts`에서 서버 HTML은 `2026.08.23`, 한국 시간대 브라우저는 `2026.08.24`로 달라 React hydration 오류가 재현됐다.
- 표시 함수가 서버와 브라우저에서 동일한 명시적 시간대를 사용하면 hydration 문제를 해결할 수 있다.
- 날짜 형식 `YYYY.MM.DD` 자체를 바꿀 기술적 필요는 없다.

## Interview Log

1. **질문:** 게시일을 독자에게 어느 시간대 기준으로 표시할 것인가?
   - **답변:** 한국 시간(`Asia/Seoul`)으로 통일한다.

## Score

- 현재 불명확성 점수: `0.10`
- 목표 임계값: `Deep 0.15`
- 점수 근거: 홈·목록·상세의 게시일 표시 시간대가 한국 시간으로 확정됐다.
- 다음에 낮춰야 할 불확실성: 없음. 공통 포맷 함수와 회귀 검증은 후속 단계에서 정한다.

## Confirmed

- 서버와 브라우저는 동일한 시간대와 포맷을 사용해야 한다.
- 현재 날짜 hydration 오류는 수정 대상이다.
- 홈·목록·상세의 게시일 표시를 `Asia/Seoul` 기준으로 통일한다.
- 저장된 원본 시각은 변경하지 않는다.

## Open Questions

- 기준 명세 `docs/specs/seo/spec.md`가 없어 기존 SEO 제품 정책과의 대조는 미확인이다. Mion 2에서는 활성 변경 명세만 작성했으며 기준 반영은 구현 완료 후 Mion 6에서 결정한다.

## Terminology Impact

- 관련 개념 키: 없음
- 신규 후보·확정·변경·금지 별칭: 없음

## References

- [`apps/blog-web/app/(site)/page.tsx`](../../../../apps/blog-web/app/%28site%29/page.tsx) - 홈 게시일 날짜 포맷
- [`apps/blog-web/app/(site)/posts/posts-content.tsx`](../../../../apps/blog-web/app/%28site%29/posts/posts-content.tsx) - 목록 카드 날짜 포맷
- [`apps/blog-web/app/(site)/posts/[slug]/page.tsx`](../../../../apps/blog-web/app/%28site%29/posts/%5Bslug%5D/page.tsx) - 상세 날짜와 구조화 데이터 날짜
