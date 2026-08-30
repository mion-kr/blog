# 글 구조화 데이터의 작성자 식별

## Change Context

- 불변 작업 식별자: `20260829_검색최적화개선`
- 기능 식별 키: `seo`
- 기준 명세: `docs/specs/seo/spec.md`
- 활성 변경: `docs/changes/20260829_검색최적화개선/`
- 기준 명세 조회 상태: 없음

## 목적

- 이 주제를 확인하는 이유: Google이 여러 글의 작성자 `미온`을 동일한 실체로 연결할 대표 URL을 정한다.
- 이 주제가 불명확하면 생기는 리스크: 리치 결과 자격은 유지되지만 작성자 식별 신호가 약하고 선택 경고가 계속 남는다.

## 코드·운영 근거로 자답한 내용

- 공통 `BlogPosting` 생성기는 `author.@type=Person`과 `author.name`만 제공한다.
- 공식 Rich Results Test에서 대표 글은 유효한 항목 1개로 통과했고 선택 필드 `author.url` 누락 경고 1개가 표시됐다.
- Google은 작성자를 고유하게 식별하는 내부 프로필, About, 소셜 URL을 사용할 수 있다.
- 현재 사이트에는 작성자 성격의 `/about` route가 있고 GitHub 외부 링크도 있다.

## Interview Log

1. **질문:** 구조화 데이터의 공식 작성자 URL을 무엇으로 지정할 것인가?
   - **답변:** 블로그의 `/about` 페이지를 사용한다.

## Score

- 현재 불명확성 점수: `0.10`
- 목표 임계값: `Deep 0.15`
- 점수 근거: `author.url`의 공식 식별 대상이 블로그 내부 `/about`으로 확정됐다.
- 다음에 낮춰야 할 불확실성: 없음. 구조화 데이터 반영과 리치 결과 재검증은 후속 단계에서 정한다.

## Confirmed

- `BlogPosting`은 현재도 리치 결과 자격이 있으며 치명적 오류는 없다.
- 작성자 식별 URL 보강은 개선 대상이다.
- 모든 게시물의 `BlogPosting.author.url`은 블로그의 `/about`을 사용한다.
- About에 있는 기존 GitHub 링크는 외부 프로필 연결로 유지한다.

## Open Questions

- 기준 명세 `docs/specs/seo/spec.md`가 없어 기존 SEO 제품 정책과의 대조는 미확인이다. Mion 2에서는 활성 변경 명세만 작성했으며 기준 반영은 구현 완료 후 Mion 6에서 결정한다.

## Terminology Impact

- 관련 개념 키: 없음
- 신규 후보·확정·변경·금지 별칭: 없음

## References

- [`apps/blog-web/app/(site)/posts/[slug]/page.tsx`](../../../../apps/blog-web/app/%28site%29/posts/%5Bslug%5D/page.tsx) - `BlogPosting` 생성기
- [`apps/blog-web/app/(site)/about/page.tsx`](../../../../apps/blog-web/app/%28site%29/about/page.tsx) - 내부 작성자 소개와 외부 프로필 링크
- [Google Article 구조화 데이터](https://developers.google.com/search/docs/appearance/structured-data/article) - 작성자 식별 권장사항
