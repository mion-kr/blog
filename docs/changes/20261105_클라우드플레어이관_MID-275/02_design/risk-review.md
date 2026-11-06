# Cloudflare 이관 고위험 검토

## 검토 범위

- 작업 식별자: `20261105_클라우드플레어이관_MID-275`
- 검토 문서: [design.md](design.md), [index.md](index.md), [변경 명세](../specs/blog-platform/spec.md)
- 관련 Linear: MID-275 (https://linear.app/mion-space/issue/MID-275)
- 확인한 코드·DB·앱: 커밋 `427b9a2`의 `apps/blog-web`, `apps/blog-api`, `packages/*`. 운영 DB는 다시 조회하지 않았다(설계 단계 읽기 전용 조회 결과 사용). 운영 사이트는 `dig`·HTTP 헤더만 확인했다.
- 방식: 설계에 참여하지 않은 검토자 셋이 지지·반박·구현 관점으로 따로 검토했다. 반박 결과는 지지·구현 결과와 대조해 근거 없는 지적을 걸렀다. 검토자가 미확인으로 남긴 7건은 공식 문서·npm으로 다시 확인했다(design.md "외부 근거").
- 검토일: 2026-11-05

## 결론

- 실행 가능한 범위: 2단계 설계 증분 작성과, 그 뒤 작업 순서 1~8의 로컬 구현. 원격 D1 적재·R2 복사·미리보기 배포·DNS 전환은 각각 승인 후.
- 구현 전 필수 수정: 12건 + 로그인 보안 9건. 모두 원천 문서에 반영했다(아래 "문서 수정").
- 선택적 개선: 9건. 반영하지 않았다(아래 "잔여 위험"의 선택 개선 목록).
- 사용자 결정 필요: 3건. 2026-11-05 모두 추천안으로 결정했다.
  1. 로그인 OAuth 흐름은 `oauth4webapi`, 세션 쿠키만 `jose`로 직접 구현.
  2. 롤백: 전환 후 7일 관찰 기간 동안 관리자 편집 동결, 롤백 시 그 기간 조회수 유실 수용, D1 → Postgres 역방향 쓰기 없음.
  3. 테스트: `@cloudflare/vitest-pool-workers` + Vitest 4.x, Google 토큰 엔드포인트는 주입한 `fetch`로 대체.
- 미확인 사항: `acorn-jsx`·`hangul-romanize`·`oauth4webapi`의 workerd 동작, `__Host-` 쿠키 로컬 동작, 지금 세션의 만료 연장 여부, 렌더 CPU·시작 시간, Vercel 빌드 설정, Google 콘솔 등록 URI.

## 설계 지지 검토

- 요구사항과 관례에 맞는 근거:
  - D1: 지금도 서버 세션이 없다(`apps/blog-web/lib/auth-config.ts`의 `session.strategy: "jwt"`). 사용자 행을 `findByGoogleId`로 찾는다(`apps/blog-api/src/auth/strategies/jwt.strategy.ts:212-252`). 쿠키 세션 + `google_id` upsert가 기존 동작과 맞다.
  - D2: Workers는 `eval`·`new Function`을 금지한다(Cloudflare web-standards 문서). 지금 컴포넌트 맵(`apps/blog-web/components/mdx-renderer.tsx:10-264`)을 노드 처리기로 옮기는 범위가 확인됐다.
  - D3: `@repo/ui` import 0건. slug 재생성 코드(`apps/blog-api/src/posts/posts.service.ts:318-319`)가 사용자 결정 3의 전제와 맞다.
  - D4: `production` 버킷이면 키 접두사가 빈다(`apps/blog-api/src/uploads/storage/object-storage.service.ts:205-206`). 접두사 치환이 성립하고, 업로드 상한 10MB가 요청 본문 한도 100MB 안이다.
- 선택한 설계의 장점: 서버 저장소 없이 지금과 같은 세션 구조를 유지하고, 스키마 변경 없이 MDX를 Workers에서 그린다. 옛 앱을 전환 확인 전까지 건드리지 않아 롤백 경로가 남는다.
- 대안보다 적합한 이유: better-auth는 테이블이 겹치고, Access는 로그인 화면이 바뀌고, 저장 시 사전 렌더는 컬럼·재생성 스크립트가 늘어난다(design.md "대안").
- 비목표(kkaebi-gg 등 제외, Vercel·Supabase 삭제, 승인 없는 DNS·원격 D1)를 침범하는 곳은 없다.

## 반박 검토

| 문제 | 발생 조건 | 영향 | 근거 | 대응 |
| --- | --- | --- | --- | --- |
| 회귀 자료 확보가 운영 DB에 씀 | 운영 `/posts/{slug}` GET, 운영 주소로 200 확인 | 운영 `view_count` 증가(Supabase 쓰기 금지 위반), 조회수 비교 기준 깨짐 | `post-server-data.ts:29-34`, `posts.service.ts:152-159` | 덤프 본문을 기존 `compileMDX`로 로컬 렌더. 21편 200 확인은 새 앱에서만 |
| 적재 재실행 실패 | 두 번째 적재, 부모부터 DELETE, 파일에 `BEGIN/COMMIT` | UNIQUE·FK 오류로 중단 | D1 외래 키·import 문서, `packages/database/migrations/0000_peaceful_baron_zemo.sql:77-101` | 원격 D1 새로 만들기 또는 자식부터 비우기, 부모부터 INSERT, 트랜잭션 구문 없음 |
| 값 변환 사고 | `'t'/'f'` boolean, 초·밀리초 혼동, `google_id` 불일치 | 21편 비공개, 날짜 1000배, 관리자 로그인 불가 | `packages/database/src/schemas/users.ts` unique 제약 | 명시 변환 덤프, 스키마 mode 고정, 전 컬럼 비교 |
| 쓰기 부분 반영 | 글·태그 쓰기를 트랜잭션 없이 이식 | 글에서 태그 유실 | `drizzle-posts.repository.ts:342,381,416`, D1 batch 문서 | `db.batch()` |
| 관리자 보호 누락 | 쓰기 라우트를 목록으로 보호 | 인증 없이 R2 업로드 | design.md D1 "관리자 확인"(수정 전) | `/admin`·`/api/admin` 접두사 기본 거부, 라우트 전체 순회 테스트 |
| 관리자 API 응답 오인 | 만료 뒤 island `fetch`가 302를 따라감 | 저장 성공으로 오인, 본문 유실 | 같은 위치 | `/api/admin/*`은 `401` JSON |
| JSON 쓰기 출처 검사 공백 | Astro `checkOrigin`은 form 계열만 검사 | 다른 출처의 JSON 쓰기 통과 | Astro 설정 문서 | 관리자 쓰기 메서드 전체에 직접 Origin 검사 |
| 직접 구현 OAuth 세부 미정 | 쿠키 속성·state 일회성·난수·키 유도·쿠키 이름·오류 처리·로그 미정 | 로그인 불가, 재사용 공격, 약한 키, 쿠키 덮어쓰기, 원문 노출, 비밀값 로그 | 반박 검토 대조표 | `oauth4webapi` 채택(사용자 결정 1) + design.md D1 보안 세부 표 |
| 롤백 시 데이터 유실 | 전환 뒤 D1에 쓴 내용 | Supabase에 없음 | 루트 A 레코드 DNS-only TTL 300 | 7일 편집 동결(사용자 결정 2), A 레코드 기록·복원 순서 |
| 공개 계약 누락 | 목록 쿼리 별칭·RSS guid·사이트 주소 미명시 | 필터 무시(200이라 안 잡힘), RSS 중복, canonical이 `blog.mion-space.dev`(404) | `query-utils.ts`, `feed.xml/route.ts`, `lib/site.ts` | 변경 명세 "유지"에 목록·RSS·sitemap·사이트 주소 계약 추가 |

## 구현 검토

- 요구사항과 작업 연결: 작업 순서가 업로드보다 관리자 글을 앞에 두고 관리자 화면 전체를 한 단계로 묶었다(Mion 규칙 위반). 업로드 → 글 생성·수정·삭제 → 카테고리 → 태그 → 설정 순으로 나눴다.
- 회귀·계약 테스트 누락: 기존 blog-api 테스트(검색·필터·초안 경계·집계·설정 기본값·프로필 갱신 등)를 회귀 표에 지정했다. `verify-seo-runtime.mjs`는 실행 틀이 Next·blog-api mock에 묶여 그대로 실행할 수 없어, assertion은 유지하고 틀을 다시 쓰기로 했다. 인증 3종과 관리자 쓰기의 계약 테스트를 2단계 필수 대상으로 예고했다. 일반 Vitest로는 D1·R2를 쓸 수 없어 pool-workers로 정했다(사용자 결정 3).
- 마이그레이션·롤백: design.md "데이터 이관", "배포·롤백·관측"을 새로 두었다.
- 병렬 작업의 겹치는 쓰기 범위: 해당 없음(단일 작업자, 엔드포인트 순차).
- 공통 계약 확정 순서: 스키마·덤프 → 공개 계약 → 인증 → 업로드 → 관리자 쓰기. 2단계 설계 증분 첫머리에 기존 항목 → 새 라우트 대응표를 둔다.

## 대안 검토

| 대안 | 장점 | 단점 | 채택 여부와 이유 |
| --- | --- | --- | --- |
| `oauth4webapi` + `jose` 쿠키 | state·PKCE·코드 교환·ID 토큰 검증을 유지 중인 라이브러리가 맡음 | 의존성 1개 추가, workerd 동작 미확인 | 채택(사용자 결정 1) |
| OAuth 전부 직접 구현 | 의존성 `jose` 1개 | 직접 짜는 보안 코드가 큼 | 미채택 |
| 롤백 시 D1 → Postgres 역방향 덤프 | 롤백해도 데이터 유지 | Supabase 쓰기 발생, 절차 추가 | 미채택(사용자 결정 2) |
| 순수 함수만 Vitest + `astro preview` HTTP 검증 | 도구 추가 적음 | workerd 제약을 테스트에서 못 잡음 | 미채택(사용자 결정 3) |
| 미리보기 Cloudflare Access "Previews only" | 코드 0줄, 미리보기 비공개 | 설정 추가 | 선택 개선으로 남김 |

## 문서 수정

- 인터뷰 문서: 없음.
- 설계 문서(design.md):
  - 결정 표 D1을 `oauth4webapi` + `jose` 쿠키로 바꾸고, 사용자 결정 6~8을 기록했다.
  - D1에 보안 세부 표(①~⑨), 관리자 접두사 기본 거부·API 401, 출처 검사 범위, 비밀값·`vars` 목록, 로그아웃 처리를 넣었다.
  - "데이터 이관", "배포·롤백·관측" 절을 새로 두었다.
  - 외부 근거 표에 D1 외래 키·batch·파일 적재·한도, Astro `checkOrigin`, Google ID 토큰, `oauth4webapi`, pool-workers를 추가했다.
  - 리스크·테스트 계획·작업 순서를 다시 썼고, 2단계에서 대응표를 만들 기존 항목 목록을 넣었다.
  - 사실 정정: Vercel 빌드 대상의 출처를 미확인으로, Vercel IP를 실측 범위로 고쳤다.
- 변경 명세(spec.md): 목록 쿼리·RSS·sitemap·사이트 주소 계약을 "유지"에, 관리자 API 401·전환 후 편집 동결을 "변경"에 추가했다. 수용 기준을 전 컬럼 비교, 운영 쓰기 없음, 관리자 접두사 거부·출처 검사, RSS guid·sitemap 목록, 필터 결과, 글 작성·수정·업로드 확인으로 넓혔다.
- 인덱스(index.md): 이 문서 링크, 근거 기준표, 미확인 목록을 갱신했다.

## 잔여 위험

- workerd 동작 미확인 3건(`acorn-jsx`·`hangul-romanize`·`oauth4webapi`). 구현 첫 작업에서 확인하고, MDX는 `remark-parse`+`remark-gfm` 대체안이 있다. `oauth4webapi`가 안 되면 사용자에게 다시 묻는다.
- 지금 next-auth 세션이 이용 중에 만료가 밀리는지 미확인이다. 새 설계는 고정 7일이다. 다르면 구현 첫 작업에서 보고한다.
- Astro `checkOrigin` 검사 범위는 문서 요약 기준이다. 직접 Origin 검사를 모든 쓰기 메서드에 두므로 결론은 같다.
- 선택 개선 9건은 반영하지 않았다:
  1. 미리보기 Access "Previews only" 보호
  2. R2 복사 수용 기준을 `image/webp` 확인까지
  3. 공개 페이지 캐시 금지 명시
  4. Astro prefetch 끄기
  5. Workers 시작 시간 1초 측정
  6. 새 앱 `engines` `node >=22.23.4`
  7. 변경 명세에 이미지 리사이즈 제거 추가
  8. Supabase 삭제 전 참조 안 하는 png 21개 확인
  9. "4개 결정" 표기 정리(이번 수정에서 "표 전체"로 고쳐 일부 해소)
- 7일 관찰 기간 중 롤백하면 그 기간의 조회수는 잃는다(사용자 결정 2로 수용).

## 2단계 정정(2026-11-05)

- 반박 표의 "회귀·계약 테스트 누락" 항목이 회귀 근거로 든 기존 blog-api 테스트 중 `posts.integration.spec.ts`, `categories.integration.spec.ts`, `tags.integration.spec.ts`는 `describe.skip`이라 실행된 적이 없다. 2단계 설계 증분([design-implementation.md](design-implementation.md))에서 케이스 목록으로만 쓰고, 실제 기준선은 구현 작업 0의 실행 결과로 정한다.
