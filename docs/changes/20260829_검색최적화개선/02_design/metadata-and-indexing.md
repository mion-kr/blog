# Metadata와 색인 계약 설계

## Change Context

- 불변 작업 식별자: `20260829_검색최적화개선`
- 기능 식별 키: `seo`
- 기준 명세: `docs/specs/seo/spec.md`
- 활성 변경 명세 델타: `docs/changes/20260829_검색최적화개선/specs/seo/spec.md`
- 기준 명세 조회 상태: 없음
- 변경 유형: 수정
- 기준 상태 → 제안 변경 → 수용 기준: 상속 metadata와 무제한 목록 URL → route별 검색 계약 → 운영 HTML·상태코드·구조화 데이터 검증

## 결론

- 관리자 로그인은 route-level metadata로 `noindex`를 적용하고 홈 canonical·Open Graph·Twitter metadata 상속을 제거한다. `nofollow`는 사용자 제품 결정이 아니라 기존 관리자 layout과 맞추는 구현 관례로 적용한다.
- 목록 route는 기존 API 응답을 한 번만 사용해 기본·검색·카테고리·태그 결과의 실제 마지막 페이지 초과 요청에 `notFound()`를 호출한다.
- 상세 글 `BlogPosting.author.url`은 `${SITE_URL}/about`으로 고정한다.
- API·DTO·DB 스키마와 인증 callback 동작은 변경하지 않는다.

## 배경

- `/auth/signin`은 자체 metadata가 없어 루트의 `index, follow`, 홈 canonical, 홈 소셜 metadata를 상속한다.
- `/posts?page=999`는 현재 API가 빈 목록과 pagination meta를 반환해도 200·자기 canonical로 렌더링한다.
- 글 구조화 데이터는 리치 결과 자격이 있지만 작성자 URL 선택 필드가 없다.
- 관련 코드: [`app/layout.tsx`](../../../../apps/blog-web/app/layout.tsx), [`auth/signin/page.tsx`](<../../../../apps/blog-web/app/(site)/auth/signin/page.tsx>), [`posts/page.tsx`](<../../../../apps/blog-web/app/(site)/posts/page.tsx>), [`posts/[slug]/page.tsx`](<../../../../apps/blog-web/app/(site)/posts/%5Bslug%5D/page.tsx>)

## 목표와 비목표

### 목표

- 로그인 화면이 검색 결과와 의도된 소셜 미리보기 대상에서 제외된다.
- 유효하지 않은 목록 페이지가 색인 가능한 200 URL로 남지 않는다.
- 필터 결과 0건의 첫 페이지는 정상 빈 상태로 유지된다.
- Google이 모든 글의 작성자를 내부 About 페이지로 연결할 수 있다.

### 비목표

- 로그인 URL 접근 차단, 인증 방식, callback URL 계약 변경
- API가 범위 초과를 오류로 반환하도록 변경
- 게시물·작성자 DB 구조 변경
- 소셜 플랫폼이 자체 생성하는 fallback 미리보기까지 네트워크 수준에서 차단

## Route And State Design

### 관리자 로그인

- `apps/blog-web/app/(site)/auth/signin/page.tsx`에 정적 `Metadata`를 추가한다.
- `robots.index`는 false로 둔다. `robots.follow`도 기존 관리자 레이아웃 관례와 맞춰 false로 두되 제품 노출 정책의 별도 수용 기준으로 확대하지 않는다.
- `alternates`, `openGraph`, `twitter`는 child metadata에서 명시적으로 비워 루트 nested metadata를 상속하지 않게 한다.
- 페이지 제목과 관리자 로그인 UI는 유지한다.
- 수용 기준은 구현 문법이 아니라 비인증 세션의 최종 HTML에 홈 canonical, `og:*`, `twitter:*`가 없고 `noindex`가 존재하는지로 판정한다. 인증 세션의 기존 redirect는 유지한다.

### 목록 범위 초과

- `PostsPage`의 기존 `postsApi.getPosts(initialQuery)` 결과가 성공했을 때만 범위를 판정한다.
- 요청 page가 1이면 `totalPages === 0`이어도 정상 빈 상태다.
- 요청 page가 1보다 크고 `page > totalPages`이면 `notFound()`를 호출한다.
- 검색·카테고리·태그 query에도 같은 규칙을 적용한다.
- API 오류는 존재하지 않는 페이지로 오인하지 않고 현재 오류 상태를 유지한다.
- `generateMetadata`에서는 API를 다시 호출하지 않는다. 유효 route metadata의 현재 색인·canonical 계약을 유지하고, 404의 `noindex`는 Next.js not-found 계약으로 처리한다.

### 작성자 구조화 데이터

- `buildPostJsonLd()`의 `author` 객체에 절대 URL `${siteUrl}/about`을 추가한다.
- 작성자 이름, 타입, 게시물 URL·날짜·cover image와 About의 GitHub 링크는 유지한다.

## Validation

- 로그인: 비인증 세션에서 200, `noindex`, 홈 canonical 없음, `og:*`·`twitter:*` 없음, 인증 세션 redirect와 기존 callback helper 테스트 통과
- 기본 목록: 유효 page 2는 200·self-canonical, 범위 초과는 production build 서버의 실제 HTTP status 404·noindex
- 필터 목록: 0건 page 1은 200 빈 상태·기존 noindex, 범위 초과 page는 404
- API 실패: 404가 아니라 기존 오류 화면
- 상세 글 JSON-LD: `author.url === ${SITE_URL}/about`

## Risks

- Next.js metadata nested field 상속을 완전히 비우는 문법은 현재 `Metadata` 타입과 빌드 결과로 확인해야 한다. 최종 HTML에 태그가 남으면 route group 재구성보다 먼저 leaf metadata override를 조정한다.
- 현재 목록 테스트 fixture는 `totalPages: 1`인데 page 2를 유효하다고 가정하므로 fixture를 page-aware하게 고치지 않으면 잘못된 회귀 결과가 발생한다.
- Next.js 스트리밍 경로에서는 not-found UI와 실제 HTTP status가 다를 수 있으므로 development 화면이나 `noindex`만으로 404 계약을 판정하지 않는다.

## Unresolved Questions

- 제품 질문은 없다.
- 현재 배포가 기준 커밋과 같은지는 미확인이다.

## References

- [로그인 인터뷰](../01_interview/admin-signin-indexing.md)
- [목록 범위 인터뷰](../01_interview/invalid-pagination.md)
- [작성자 식별 인터뷰](../01_interview/article-author-identity.md)
- [Next.js metadata 병합](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Next.js notFound](https://nextjs.org/docs/app/api-reference/functions/not-found)
