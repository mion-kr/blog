# 존재하지 않는 목록 페이지 처리

## Change Context

- 불변 작업 식별자: `20260829_검색최적화개선`
- 기능 식별 키: `seo`
- 기준 명세: `docs/specs/seo/spec.md`
- 활성 변경: `docs/changes/20260829_검색최적화개선/`
- 기준 명세 조회 상태: 없음

## 목적

- 이 주제를 확인하는 이유: 실제 목록 범위를 넘긴 URL의 HTTP·색인·사용자 경험 계약을 정한다.
- 이 주제가 불명확하면 생기는 리스크: 빈 페이지가 무한히 200·index·자기 canonical로 생성되어 크롤링과 검색 품질 신호를 낭비한다.

## 코드·운영 근거로 자답한 내용

- 필터가 없으면 `page` 값과 실제 전체 페이지 수를 비교하지 않고 색인 가능한 자기 canonical을 만든다.
- 운영 `/posts?page=999`가 200, `index, follow`, 자기 canonical로 응답했다.
- 기존 테스트는 유효한 `page=2`의 자기 canonical과 필터 URL의 `noindex`만 검증한다.
- `page`가 1보다 작거나 숫자가 아닌 경우의 정규화는 query parser 관례를 유지하되, 전체 페이지 수를 초과하는 경우의 제품 계약은 별도 결정이 필요하다.

## Interview Log

1. **질문:** 전체 페이지 수를 넘긴 `/posts?page=N` 요청을 사용자에게 어떻게 처리할 것인가?
   - **답변:** 존재하지 않는 페이지로 404 처리한다.

2. **질문:** 검색·카테고리·태그 필터 URL도 해당 결과의 실제 마지막 페이지를 초과하면 어떻게 처리할 것인가?
   - **답변:** 사용자가 “해당 결과 요청의 전체 페이지 수 초과?”라고 범위를 재확인한 뒤 “404”로 답했다. 따라서 404로 처리하되, 필터 결과가 0개인 첫 페이지는 정상적인 빈 결과 화면으로 유지한다.

## Score

- 현재 불명확성 점수: `0.10`
- 목표 임계값: `Deep 0.15`
- 점수 근거: 기본 목록과 필터 결과 모두에서 실제 마지막 페이지를 넘긴 요청의 상태코드가 404로 확정됐다.
- 다음에 낮춰야 할 불확실성: 없음. 구현 세부와 회귀 검증은 후속 단계에서 정한다.

## Confirmed

- 실제 범위를 넘긴 빈 목록 URL을 현재처럼 색인 대상으로 유지하는 것은 개선 대상이다.
- 기본 목록과 검색·카테고리·태그 필터 결과에서 실제 마지막 페이지를 넘긴 요청은 404로 처리한다.
- 필터 결과가 0개인 첫 페이지는 정상적인 빈 결과 화면으로 유지한다.
- 유효한 페이지와 검색·필터 URL의 기존 색인·canonical 계약은 유지한다.

## Open Questions

- 기준 명세 `docs/specs/seo/spec.md`가 없어 기존 SEO 제품 정책과의 대조는 미확인이다. Mion 2에서는 기준 명세를 임의 생성하지 않고 활성 변경 명세만 작성했으며 기준 반영은 구현 완료 후 Mion 6에서 결정한다.

## Terminology Impact

- 관련 개념 키: 없음
- 신규 후보·확정·변경·금지 별칭: 없음

## References

- [`apps/blog-web/app/(site)/posts/page.tsx`](../../../../apps/blog-web/app/%28site%29/posts/page.tsx) - 목록 metadata와 실제 목록 조회
- [`apps/blog-web/app/(site)/posts/query-utils.ts`](../../../../apps/blog-web/app/%28site%29/posts/query-utils.ts) - 검색 파라미터 정규화
- [`apps/blog-web/scripts/verify-seo-runtime.mjs`](../../../../apps/blog-web/scripts/verify-seo-runtime.mjs) - 목록 200·404·canonical·noindex production HTTP 검증
