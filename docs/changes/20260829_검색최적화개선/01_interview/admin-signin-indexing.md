# 관리자 로그인 검색 노출 정책

## Change Context

- 불변 작업 식별자: `20260829_검색최적화개선`
- 기능 식별 키: `seo`
- 기준 명세: `docs/specs/seo/spec.md`
- 활성 변경: `docs/changes/20260829_검색최적화개선/`
- 기준 명세 조회 상태: 없음

## 목적

- 이 주제를 확인하는 이유: 관리자 인증 진입점의 검색·소셜 노출 정책을 확정한다.
- 이 주제가 불명확하면 생기는 리스크: 관리 전용 페이지가 검색 결과에 노출되거나 홈의 canonical 신호와 섞일 수 있다.

## 코드·운영 근거로 자답한 내용

- `/auth/signin`은 블로그 콘텐츠 관리를 위한 관리자 로그인 화면이다.
- route 전용 metadata가 없어 루트 metadata의 `index, follow`, 홈 canonical, 홈 소셜 메타데이터를 상속한다.
- 운영 응답에서도 `index, follow`와 홈 canonical이 확인됐다.
- 최소 변경 대안은 로그인 route에 전용 metadata를 두고 검색 색인을 제외하는 것이다. 인증 동작과 callback 계약은 변경할 필요가 없다.
- 검색 제외를 위해 로그인 route에 `noindex`를 적용하고, 소셜 공유 제외를 위해 루트에서 상속되는 Open Graph·Twitter 미리보기 metadata를 로그인 route에서 노출하지 않아야 한다.
- 직접 접근 가능한 URL인 이상 소셜 크롤러의 요청 자체를 차단하는 결정은 아니며, 플랫폼이 자체 fallback 미리보기를 만드는 것까지 완전히 보장할 수는 없다.

## Interview Log

1. **질문:** 관리자 로그인 route를 검색 결과와 소셜 공유 미리보기에서 어느 수준까지 제외할 것인가?
   - **답변:** 검색 결과와 소셜 공유 노출에서 모두 제외한다. 직접 URL 접근과 로그인 기능은 유지한다.

## Score

- 현재 불명확성 점수: `0.10`
- 목표 임계값: `Deep 0.15`
- 점수 근거: 검색·소셜 노출 제외 범위와 유지할 인증 동작이 확정됐다.
- 다음에 낮춰야 할 불확실성: 없음. 구현 세부와 검증은 후속 단계에서 정한다.

## Confirmed

- `/auth/signin`은 검색 결과와 소셜 공유 미리보기에서 모두 제외한다.
- 직접 URL 접근, Google 로그인, callback 동작은 유지한다.

## Open Questions

- 기준 명세 `docs/specs/seo/spec.md`가 없어 기존 SEO 제품 정책과의 대조는 미확인이다. Mion 2에서는 활성 변경 명세만 작성했으며 기준 반영은 구현 완료 후 Mion 6에서 결정한다.

## Terminology Impact

- 관련 개념 키: 없음
- 신규 후보·확정·변경·금지 별칭: 없음

## References

- [`apps/blog-web/app/(site)/auth/signin/page.tsx`](../../../../apps/blog-web/app/%28site%29/auth/signin/page.tsx) - 관리자 로그인 화면 목적과 callback 처리
- [`apps/blog-web/app/layout.tsx`](../../../../apps/blog-web/app/layout.tsx) - 현재 상속되는 루트 metadata와 robots 정책
- [`apps/blog-web/lib/auth-config.ts`](../../../../apps/blog-web/lib/auth-config.ts) - 로그인 route 계약
