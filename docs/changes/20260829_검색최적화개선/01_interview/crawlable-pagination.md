# 크롤링 가능한 페이지네이션

## Change Context

- 불변 작업 식별자: `20260829_검색최적화개선`
- 기능 식별 키: `seo`
- 기준 명세: `docs/specs/seo/spec.md`
- 활성 변경: `docs/changes/20260829_검색최적화개선/`
- 기준 명세 조회 상태: 없음

## 목적

- 이 주제를 확인하는 이유: 사용자와 검색 크롤러가 동일한 페이지 URL을 안정적으로 탐색하도록 한다.
- 이 주제가 불명확하면 생기는 리스크: JavaScript 상호작용에 의존해 후속 목록 URL의 발견 가능성과 새 탭·링크 복사 같은 기본 브라우저 동작이 약해진다.

## 코드·운영 근거로 자답한 내용

- 페이지 번호·이전·다음 요소는 모두 `button`이고 click handler가 router 상태를 바꾼다.
- 서버 route는 `/posts?page=N`을 처리하고 유효한 페이지에 자기 canonical을 제공한다.
- 따라서 링크로 바꾸어도 기존 URL 계약을 재사용할 수 있다.
- 검색·카테고리·태그·정렬 상태를 URL에 유지하는 현재 query 생성 규칙은 보존해야 한다.

## Interview Log

1. **질문:** 페이지네이션 링크 전환에 별도 제품 정책 결정이 필요한가?
   - **답변:** 코드·테스트로 자답했다. 유효한 페이지의 색인과 query 계약, 현재 client 전환 경험을 유지하면서 실제 `href` 링크를 제공한다.

## Score

- 현재 불명확성 점수: `0.15`
- 목표 임계값: `Deep 0.15`
- 점수 근거: 기존 URL·색인·query·client 전환 계약을 유지하는 최소 변경으로 자답할 수 있다.
- 다음에 낮춰야 할 불확실성: 없음. 구현 단계에서 링크 존재와 query 보존을 검증한다.

## Confirmed

- 페이지 URL과 query 상태는 유지해야 한다.
- 검색 크롤러가 따라갈 수 있는 실제 링크가 필요하다.
- Next.js `Link`를 사용하고 기존 client 전환 경험을 유지한다.

## Open Questions

- 기준 명세 `docs/specs/seo/spec.md`가 없어 기존 SEO 제품 정책과의 대조는 미확인이다. Mion 2에서는 활성 변경 명세만 작성했으며 기준 반영은 구현 완료 후 Mion 6에서 결정한다.

## Terminology Impact

- 관련 개념 키: 없음
- 신규 후보·확정·변경·금지 별칭: 없음

## References

- [`apps/blog-web/app/(site)/posts/posts-pagination.tsx`](../../../../apps/blog-web/app/%28site%29/posts/posts-pagination.tsx) - 현재 버튼 기반 페이지네이션
- [`apps/blog-web/app/(site)/posts/posts-content.tsx`](../../../../apps/blog-web/app/%28site%29/posts/posts-content.tsx) - page 변경과 query 상태 처리
- [`apps/blog-web/app/(site)/posts/page.tsx`](../../../../apps/blog-web/app/%28site%29/posts/page.tsx) - 서버 route와 canonical
