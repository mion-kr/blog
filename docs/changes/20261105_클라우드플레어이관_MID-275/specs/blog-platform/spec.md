# 블로그 플랫폼 변경 명세 — Cloudflare 이관

기준 명세 `docs/specs/blog-platform/spec.md`는 없다. 이 문서는 이관 전후로 밖에서 관찰되는 계약만 적는다. 구현 방법은 `../../02_design/design.md`에 둔다. 설계는 2026-11-05 승인됐다.

## 유지(바뀌지 않음)

| 계약 | 근거 |
| --- | --- |
| 글 주소 `/posts/{slug}`와 RSS `/feed.xml`이 이관 전과 같은 주소로 응답한다 | 사용자 결정(MID-275) |
| 그 밖의 공개 URL `/`, `/posts`, `/about`, `/privacy-policy`, `/terms`, `/sitemap.xml`, `/robots.txt`, `/auth/signin`, `/admin/*`가 같은 주소로 응답한다 | 확인된 사실(현재 라우트), 사용자 결정(2026-11-05 설계 승인) |
| 정적 파일 `/ads.txt`, `/og/blog.png`, `/og/about.png`, `/icon.svg`, `/apple-icon.png`, `/favicon.ico`가 같은 주소로 응답한다 | 확인된 사실(`apps/blog-web/public`, `app/`), 사용자 결정(2026-11-05 설계 승인) |
| 글 본문이 GFM 표, 코드 블록(언어 라벨·복사 버튼), mermaid 다이어그램, X 게시물 임베드, 이미지 캡션을 이관 전과 같은 내용으로 보여 준다 | 사용자 결정(MID-275), 확인된 사실(운영 본문 조사, `mdx-renderer.tsx`) |
| 로그인 화면이 `/auth/signin`의 Google 버튼이다 | 사용자 결정(2026-11-05) |
| Google 계정 중 `ADMIN_EMAIL` 한 명만 관리자 화면에 들어간다. 로그인은 7일 유지되고, 로그인 화면의 `callbackUrl`은 바깥 주소를 막는다 | 사용자 결정(MID-275), 확인된 사실(`auth-config.ts`, `callback-url.ts`) |
| 로그인 화면은 `error=AccessDenied`면 권한 없음 문구, 그 밖의 `error` 값은 일반 오류 문구를 보여 준다 | 확인된 사실(`auth/signin/page.tsx:56-61`) |
| 관리자 화면이 Editorial 디자인을 유지한다 | 사용자 결정(MID-275) |
| 글 상세를 볼 때 조회수가 오른다 | 확인된 사실(`post-server-data.ts`) |
| 공개 목록 `/posts` 쿼리: `page`, `limit`(기본 12), `search`, `category`·`categorySlug`, `tag`·`tagSlug`, `sort`(기본 `publishedAt`), `order`(기본 `desc`). 필터·정렬이 붙은 변형은 noindex·canonical `/posts`, `page>1`은 canonical `/posts?page=N`, 페이지 범위를 넘으면 404 | 확인된 사실(`app/(site)/posts/query-utils.ts`, `page.tsx`), 사용자 결정(2026-11-05 설계 승인) |
| RSS `/feed.xml`: `application/rss+xml; charset=utf-8`, 발행 글 최대 `RSS_ITEMS_LIMIT`(기본 50)개, `guid`는 글 주소(`isPermaLink="true"`), 날짜는 `publishedAt ?? createdAt`, 조회 실패 시 빈 피드 | 확인된 사실(`app/feed.xml/route.ts`), 사용자 결정(2026-11-05 설계 승인) |
| sitemap `/sitemap.xml`: 발행 글만, slug 중복 제거, `lastModified = updatedAt ?? publishedAt ?? createdAt`, 고정 경로 포함, 조회 실패 시 부분 결과 대신 오류 | 확인된 사실(`app/sitemap.ts`), 사용자 결정(2026-11-05 설계 승인) |
| canonical·sitemap·RSS의 사이트 주소는 `https://mion-space.dev`다 | 확인된 사실(운영 응답 실측), 사용자 결정(2026-11-05 설계 승인) |

## 변경

| 계약 | 이관 전 | 이관 후 | 근거 |
| --- | --- | --- | --- |
| 커버 이미지 주소 | Supabase Storage 공개 URL | `https://media.mion-space.dev/posts/{id}/thumbnail/…`(경로 유지) | 사용자 결정(MID-275 이미지 R2, 2026-11-05 도메인) |
| 관리자가 아닌 Google 계정 로그인 | `USER` 세션 발급, 관리자 화면만 막힘 | 세션 없이 거부 안내 | 사용자 결정(2026-11-05) |
| 발행된 글 제목 수정 | slug가 새 제목 기준으로 바뀌고 예전 주소 404 | slug 유지, 예전 주소 그대로 200 | 사용자 결정(2026-11-05) |
| 관리자 쓰기 미인증 응답 | server action이 로그인 화면으로 이동(`/api/admin/*` Route Handler는 이미 `401`) | 쓰기를 포함한 `/api/admin/*` 전체가 `401` JSON, 화면이 받아 로그인 화면으로 이동. 관리자 페이지는 지금처럼 `307` 리다이렉트 | 사용자 결정(2026-11-05 고위험 검토 반영 승인) |
| 로그인이 필요한 관리자 주소에 들어갔을 때 로그인 뒤 돌아가는 주소 | `/admin` 고정(`app/admin/layout.tsx:68-70`) | 원래 보던 관리자 주소(쿼리 포함) | 사용자 결정(2026-11-05 설계 승인) |
| 관리자 편집 화면을 열 때 조회수 | 1 증가(초안 포함) | 그대로 | 사용자 결정(2026-11-05 2단계) |
| 설정 폼 검증 실패 | 운영은 일반 오류 문구만 | 칸별 오류 문구 | 사용자 결정(2026-11-05 2단계) |
| 전환 직후 | 관리자 편집 가능 | 관리자 편집 가능(전환 직후 7일 편집 동결은 2026-11-06 사용자 결정으로 폐지. 이후 Vercel로 롤백하면 새 앱에서 쓴 글이 옛 사이트에 없다) | 사용자 결정(2026-11-05 롤백 정책 → 2026-11-06 폐지) |

## 수용 기준

- 운영 공개 글 21편 각각에서 이관 후 본문의 제목 수, 코드 블록 수, mermaid 다이어그램 수, 표 수, 링크 목록이 이관 전과 같다.
- 이관 전후 글 21, 카테고리 2, 태그 5, 글-태그 연결 28, 사용자 1 개수가 같고, 모든 테이블의 모든 컬럼 값이 같다. 시간 값은 UTC epoch ms로 정규화해 비교하고, 커버 URL은 치환 규칙 적용 후 비교하며, 글-태그 연결은 `(post_id, tag_id)` 쌍 집합으로 비교한다.
- 이관을 위해 운영 Supabase에 쓰기가 일어나지 않는다(조회수 포함).
- 커버 이미지 21개가 새 주소에서 200으로 응답한다.
- 공개 글 21편 주소가 모두 200으로 응답한다.
- 발행된 글의 제목을 바꿔 저장해도 주소가 바뀌지 않는다.
- `ADMIN_EMAIL`이 아닌 Google 계정으로 로그인하면 관리자 화면에 들어가지 못하고 세션 쿠키가 생기지 않는다.
- 쿠키 없이 `/admin`·`/api/admin` 아래 모든 주소를 호출하면 페이지는 로그인 화면으로, API는 `401`로 거부된다. 다른 출처에서 보낸(또는 `Origin`이 없는) GET·HEAD가 아닌 요청은 주소와 무관하게 거부된다(관리자 주소는 로그인 확인이 먼저라 세션이 없으면 `401`·로그인 화면, 세션이 있으면 `403`, 그 밖의 주소는 `403`).
- RSS 항목의 `guid`가 이관 전과 같고, sitemap의 글 주소 목록이 이관 전과 같다.
- 공개 목록에서 `category`·`categorySlug`·`tag`·`tagSlug`·`search` 필터가 이관 전과 같은 글을 돌려준다.
- 미리보기와 운영에서 글 작성·수정, 이미지 업로드 후 공개 주소 200을 직접 확인한다.
- 관리자 편집 화면을 열어도 조회수가 바뀌지 않는다.
- 설정 폼에 범위 밖 값을 넣으면 해당 칸 아래에 오류 문구가 보인다.
