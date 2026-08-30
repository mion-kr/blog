# 소셜 공유 이미지 자산 설계

## Change Context

- 불변 작업 식별자: `20260829_검색최적화개선`
- 기능 식별 키: `seo`
- 기준 명세: `docs/specs/seo/spec.md`
- 활성 변경 명세 델타: `docs/changes/20260829_검색최적화개선/specs/seo/spec.md`
- 기준 명세 조회 상태: 없음
- 변경 유형: 추가·수정
- 기준 상태 → 제안 변경 → 수용 기준: 누락·404 공유 이미지 → 두 개의 정적 자산과 route metadata → 이미지 응답·dimensions·metadata 검증

## 결론

- `apps/blog-web/public/og/about.png`를 About 전용 1200×630 PNG로 제작한다.
- `apps/blog-web/public/og/blog.png`를 홈·글 목록 공통 1200×630 PNG로 제작한다.
- 기존 운영 게시물 9개의 원격 cover image와 상세 글 metadata는 유지한다.
- 파일 convention과 동적 `ImageResponse`를 함께 도입하지 않고 현재 metadata URL 방식을 유지한다.

## 배경

- About metadata는 `/og/about.png`를 선언하지만 파일과 운영 응답은 404다.
- 홈과 목록 route에는 page-level `og:image`와 `twitter:image`가 없다.
- 상세 글은 `coverImage`가 있을 때 Open Graph, Twitter, `BlogPosting.image`에 사용한다.
- 운영 목록과 사이트맵 대조에서 게시물 9개의 서로 다른 cover URL을 확인했다.

## 목표와 비목표

### 목표

- About 공유 시 2D 애니메이션 스타일의 귀여운 남자 개발자 일러스트가 표시된다.
- 홈과 목록 공유 시 동일한 블로그 브랜드 이미지가 표시된다.
- About·홈·목록의 Open Graph와 Twitter 제목·설명·이미지가 각 route 의미와 일치한다.

### 비목표

- 실제 인물 얼굴 재현
- 게시물 cover 재생성·교체
- 게시물 제목 기반 동적 OG 이미지
- sitemap 이미지 확장 또는 이미지 저장소 이전

## Asset And Metadata Design

| 자산 | 용도 | 시각 계약 | 연결 route |
| --- | --- | --- | --- |
| `public/og/about.png` | About 전용 공유 이미지 | 1200×630, 2D 애니메이션, 귀여운 남자 개발자, 기존 다크·네온 테마와 조화 | `/about` |
| `public/og/blog.png` | 홈·목록 공통 브랜드 이미지 | 1200×630, Mion 기술 블로그를 식별하는 다크·네온 브랜드 비주얼 | `/`, `/posts` |

- 구체적인 구도와 문구는 이미지 생성 결과를 브라우저 미리보기에서 검증해 선택한다. 사용자가 확정하지 않은 실제 얼굴·경력·로고를 추가하지 않는다.
- 홈 metadata의 Open Graph·Twitter에 `/og/blog.png`를 명시한다.
- 목록 `generateMetadata`는 현재 title·description·canonical·robots를 유지하면서 Open Graph와 Twitter에 `/og/blog.png`를 명시한다.
- About는 기존 Open Graph 이미지 URL을 유지하고 동일한 route title·description·이미지의 Twitter metadata를 명시해 루트 Twitter 문구 상속을 제거한다.
- 상세 글은 현재 cover image 우선 정책을 유지한다.

## Validation

- `/og/about.png`, `/og/blog.png`가 200과 `image/png`로 응답하고 natural size가 1200×630이다.
- 홈·목록 HTML에 `/og/blog.png`의 `og:image`, `twitter:image`가 존재한다.
- About HTML에 `/og/about.png`와 About 전용 Open Graph·Twitter title·description이 존재한다.
- 대표 상세 글은 기존 cover image를 계속 Open Graph·Twitter·JSON-LD에 사용한다.
- 카카오톡·Slack 등 실제 외부 캐시 갱신은 배포 후 별도 수동 검증으로 두며 로컬 metadata 통과와 혼동하지 않는다.

## Risks

- metadata를 이미지 파일보다 먼저 배포하면 404가 재발한다. 자산과 metadata는 같은 변경으로 배포한다.
- 소셜 플랫폼은 이전 미리보기를 캐시할 수 있어 배포 직후 새 이미지가 보이지 않을 수 있다.
- 루트 file convention을 추가하면 상세 route와 우선순위가 얽힐 수 있으므로 이번 변경에서는 `public/og`와 명시적 metadata만 사용한다.

## Unresolved Questions

- 제품 질문은 없다.
- 최종 이미지 시안의 세부 구도·색상·문구는 후속 이미지 생성 및 시각 QA에서 확정한다.

## References

- [About 이미지 인터뷰](../01_interview/about-og-image.md)
- [홈·목록 이미지 인터뷰](../01_interview/default-social-images.md)
- [Next.js Open Graph 이미지](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)
