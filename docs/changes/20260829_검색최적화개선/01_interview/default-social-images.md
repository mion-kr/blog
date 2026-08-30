# 홈·목록 기본 OG/Twitter 이미지

## Change Context

- 불변 작업 식별자: `20260829_검색최적화개선`
- 기능 식별 키: `seo`
- 기준 명세: `docs/specs/seo/spec.md`
- 활성 변경: `docs/changes/20260829_검색최적화개선/`
- 기준 명세 조회 상태: 없음

## 목적

- 이 주제를 확인하는 이유: 홈과 목록 URL을 공유할 때 일관된 브랜드 미리보기를 제공한다.
- 이 주제가 불명확하면 생기는 리스크: `summary_large_image`를 선언하고도 이미지가 없어 플랫폼별로 빈 미리보기나 임의 이미지를 만들 수 있다.

## 코드·운영 근거로 자답한 내용

- 루트 metadata는 Open Graph와 Twitter 제목·설명을 제공하지만 이미지가 없다.
- 홈과 글 목록에도 별도 OG/Twitter 이미지가 없다.
- 상세 글은 cover image가 있을 때 metadata와 `BlogPosting.image`에 사용한다.
- 운영 `/posts`에는 현재 사이트맵의 게시물 9개와 대응하는 서로 다른 원격 표지 이미지 URL 9개가 노출된다.
- 따라서 현재 확인 범위에서 게시물 표지 이미지가 없다는 문제는 없으며, 미확인 fallback 게시물까지 이번 결정에 포함하지 않는다.
- 정확한 미결정 범위는 홈(`/`)과 목록(`/posts`) URL 자체의 공유 이미지다.

## Interview Log

1. **질문:** 기존 게시물 표지는 유지하면서 홈과 글 목록 URL 자체의 공유 이미지에 무엇을 사용할 것인가?
   - **답변:** 홈·목록용 공통 브랜드 이미지 한 장을 별도로 제작해 사용한다. 기존 게시물 표지는 그대로 유지한다.

## Score

- 현재 불명확성 점수: `0.10`
- 목표 임계값: `Deep 0.15`
- 점수 근거: 기존 게시물 표지의 보존과 홈·목록 공통 브랜드 이미지 적용 범위가 확정됐다.
- 다음에 낮춰야 할 불확실성: 없음. 구체적인 이미지 디자인은 후속 디자인 단계에서 정한다.

## Confirmed

- 홈·목록에 유효한 소셜 공유 이미지가 필요하다.
- 현재 운영 게시물 9개의 기존 표지 이미지는 유지한다.
- 홈과 글 목록 URL은 별도로 제작한 공통 브랜드 이미지 한 장을 공유한다.

## Open Questions

- 실제 이미지 제작과 저장소 반영은 인터뷰 범위 밖이며 후속 단계에서 진행한다.
- 기준 명세 `docs/specs/seo/spec.md`가 없어 기존 SEO 제품 정책과의 대조는 미확인이다. Mion 2에서는 활성 변경 명세만 작성했으며 기준 반영은 구현 완료 후 Mion 6에서 결정한다.

## Terminology Impact

- 관련 개념 키: 없음
- 신규 후보·확정·변경·금지 별칭: 없음

## References

- [`apps/blog-web/app/layout.tsx`](../../../../apps/blog-web/app/layout.tsx) - 루트 Open Graph·Twitter metadata
- [`apps/blog-web/app/(site)/page.tsx`](../../../../apps/blog-web/app/%28site%29/page.tsx) - 홈 metadata
- [`apps/blog-web/app/(site)/posts/page.tsx`](../../../../apps/blog-web/app/%28site%29/posts/page.tsx) - 목록 metadata
- [`apps/blog-web/app/(site)/posts/[slug]/page.tsx`](../../../../apps/blog-web/app/%28site%29/posts/%5Bslug%5D/page.tsx) - 상세 글의 기존 cover image 사용 근거
