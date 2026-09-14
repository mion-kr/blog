# 콘텐츠 반영 준비 도구

이 디렉터리는 운영 반영 전 검토용입니다. 생성 도구는 네트워크 쓰기를 하지 않습니다. 운영 갱신은 코디네이터의 검토와 후속 작업 범위에서 수행합니다. 이 PR을 배포해도 CMS 본문은 자동으로 바뀌지 않습니다.

## 확인한 저장·관리 경로

- 본문 저장: `packages/database/src/schemas/posts.ts`의 `public.posts.content`(text). 태그는 `post_tags` 관계입니다. 원본 날짜·제목·slug·excerpt·coverImage·작성자·발행 상태·카테고리·태그를 보존합니다. `updated_at`은 실제 저장 시각으로 갱신합니다.
- 공식 조회: API `GET /api/posts/:slug?trackView=false`; 관리자 조회 `GET /api/admin/posts/:slug`. 관리자 웹은 `/admin/posts/:slug/edit`에서 `getAdminPostBySlug`를 호출합니다. 관리자 상세 조회는 현재 기본 조회수 증가 경로를 사용하므로 순수 백업은 공개 API의 `trackView=false` 또는 읽기 전용 DB 조회가 적합합니다.
- 공식 수정: 관리자 웹 Server Action `updateAdminPost` → API `PUT /api/posts/:slug` → `PostsService.update` → repository. 서버 호출자 OIDC 헤더와 관리자 Bearer 사용자 인증이 서로 별도로 필요합니다. `ServerCallerGuard`, `AdminGuard`와 NextAuth 세션을 우회하지 않습니다. 컨트롤러 주석의 CSRF 문구만으로 별도 CSRF 헤더 계약을 만들면 안 됩니다. 실제 웹 저장 동작을 사용합니다.
- 주의: 현재 서비스는 excerpt/coverImage를 생략하면 null로 만들고 기존 커버를 삭제할 수 있습니다. API 요청을 준비할 때 최소 `content`, 기존 `excerpt`, 기존 `coverImage`를 포함합니다. 제목을 바꾸면 slug도 바뀌므로 제목을 수정하지 않습니다. 신규 업로드나 제거된 본문 이미지는 별도 후속 처리가 있으므로 이 도구의 직접 SQL 대상으로 삼지 않습니다.
- 검색: repository가 제목·본문에 `ILIKE`를 사용합니다. 별도 검색 벡터 갱신은 코드에 없습니다. 2026-09-14 운영 세션 시간대 UTC, `posts` 확인에서 사용자 트리거 0, 규칙 0, 생성열 0, id/slug 고유 인덱스만 확인했습니다. 적용 시점에도 다시 대조합니다.

## 권장 방식과 제한

이번처럼 본문만 수정하고 기존 미디어와 나머지 필드를 보존하는 경우 조건부 DB 갱신이 API의 커버 정리·집계 부작용과 사전 조회 후 덮어쓰기 위험을 줄입니다. 생성 SQL은 id·slug·본문·수정 시각·제목·요약·커버·발행 상태·생성/발행일·카테고리·작성자·태그 ID 배열까지 원본과 대조합니다. 조회수는 방문에 따라 바뀌므로 비교하지 않고 저장값도 건드리지 않습니다.

문서 목록(manifest)은 `original`, `revised` **절대 파일 경로**를 가진 객체의 JSON 배열입니다. 글별 SQL을 별도 디렉터리에 생성하며, 여러 글을 한꺼번에 자동 실행하지 않습니다. `contentSql.py --manifest 파일 --out 새디렉터리`는 경험 글 그룹에도 동일하게 사용할 수 있습니다. 중간 생성 실패 시 이미 생성된 파일은 검토용으로 남지만 운영 변경은 없습니다.

`review-only.sql`은 UTC 세션과 UTC 시각 저장을 명시한 직렬화 가능한 트랜잭션, 3초 잠금 제한, 15초 문장 제한 안에서 조건부 UPDATE 후 영향 행이 정확히 1개인지 검사하고 같은 트랜잭션 안에서 본문·수정시각·조회수 이외 행 전체 값의 변경이 없는지 확인합니다. 기본 종료는 `ROLLBACK`입니다. 이 파일은 실행만 해도 UPDATE를 시도하므로 현재 준비 단계에서는 **실행하지 않습니다**. 승인된 후속 작업에서만 최종 `COMMIT` 전환과 실행을 검토합니다. 충돌·직렬화 실패가 나면 재조회와 재검토 없이 자동 재시도하지 않습니다.

`explainContent.py`는 `BEGIN READ ONLY` 및 세션의 `default_transaction_read_only=on`으로 조건 일치 건수와 `EXPLAIN` 계획을 확인합니다. **ANALYZE를 쓰지 않아 UPDATE는 실행하지 않습니다.** DO 블록 실행·영향 행 검사·실제 저장 성공을 검증한 것으로 해석하면 안 됩니다. [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html)

## 재현 가능한 준비 절차

환경값은 저장소의 실제 Doppler 프로젝트 `mion-blog`, 운영 API 구성 `prd_api`에서 제공합니다. 접속문자열을 명령 인자나 로그로 출력하지 않습니다. 아래 도구는 `DATABASE_URL`을 프로세스 환경으로 읽고 psql 접속 필드로 분리합니다. 현재 URL의 SSL 설정을 따르며 설정이 없으면 TLS 연결을 요구하는 `require`를 사용합니다. 이는 인증서 호스트 검증(`verify-full`) 완료 증거와 다릅니다. 원본 파일과 계획 결과는 비밀 없는 공개 글 중심이지만 0600 권한으로 저장하고 Git에 넣지 않습니다.

```sh
doppler run --project mion-blog --config prd_api -- python3 docs/content/2026-09-14/tools/exportPublished.py --out /Users/mion/.codex/tmp/adsense-fix-20260914/pre-apply-originals
```

`exportPublished.py`는 공개 글 11개를 읽기 전용 트랜잭션에서 백업했던 조회와 동일한 경로입니다. 재실행할 때 새 출력 디렉터리를 지정해야 하며 기존 백업을 덮어쓰지 않습니다. 도구 생성·검증은 글별로 다음처럼 수행합니다.

```sh
python3 docs/content/2026-09-14/tools/contentRevision.py prepare \
  --original /Users/mion/.codex/tmp/adsense-fix-20260914/originals/jwtwa-jweui-chaijeom.json \
  --current /Users/mion/.codex/tmp/adsense-fix-20260914/pre-apply-originals/jwtwa-jweui-chaijeom.json \
  --revised docs/content/2026-09-14/technical/jwtwa-jweui-chaijeom.mdx \
  --out /Users/mion/.codex/tmp/adsense-fix-20260914/pre-apply-jwt-review

python3 docs/content/2026-09-14/tools/contentSql.py \
  --original /Users/mion/.codex/tmp/adsense-fix-20260914/originals/jwtwa-jweui-chaijeom.json \
  --revised docs/content/2026-09-14/technical/jwtwa-jweui-chaijeom.mdx \
  --out /Users/mion/.codex/tmp/adsense-fix-20260914/pre-apply-jwt-sql

doppler run --project mion-blog --config prd_api -- python3 docs/content/2026-09-14/tools/explainContent.py \
  --original /Users/mion/.codex/tmp/adsense-fix-20260914/originals/jwtwa-jweui-chaijeom.json \
  --revised docs/content/2026-09-14/technical/jwtwa-jweui-chaijeom.mdx \
  --out /Users/mion/.codex/tmp/adsense-fix-20260914/pre-apply-jwt-plan.json
```

사전 검토의 `review.json`에서 제거·추가 URL을 읽습니다. 이미지·미디어 URL 제거 및 `/draft/` 미디어를 도구가 거부하지만 모든 MDX 표현을 완전히 이해하는 검사는 아니므로 원문 diff와 MDX 미리보기 검토도 필요합니다. API 응답에서 누락된 null 필드를 임의 추정하지 말고 정확한 DB 백업을 사용합니다.

## 적용 후 검증과 캐시

1. 승인된 글 하나를 적용한 후 즉시 같은 읽기 전용 경로로 별도 `after` 백업을 만듭니다. `contentRevision.py verify --original 이전.json --after 이후.json --revised 개정.mdx`로 본문 완전 일치와 안정 필드 보존을 확인합니다.
2. 공개 canonical URL을 새 HTTP 요청과 새 브라우저 진입으로 엽니다. 응답 200, 새 본문의 고유 문장, canonical·색인 정책·발행일·커버·태그, 표·코드·Mermaid 렌더링과 기존 미디어를 확인합니다. DB 일치만으로 배포 확인을 끝내지 않습니다.
3. 코드상 API fetch는 `cache: no-store`, React `cache`는 요청 내 중복 제거입니다. 공개 상세에 `revalidate=60` 선언이 있고 관리자 Action은 관리자 경로만 `revalidatePath`합니다. DB 쓰기가 공개 캐시를 능동 무효화한다고 보장하지 않습니다.
4. 새 HTTP 응답이 이전 본문이면 응답 캐시 헤더를 기록하고 재검증 주기가 지난 뒤 재요청합니다. 계속 이전 본문이면 완료 처리를 중단합니다. 코디네이터가 기존 배포 경로로 재배포하거나 승인된 서버 코드의 `revalidatePath('/posts/정확한-slug')`, `/posts`, `/` 재검증을 수행하는 방법을 선택해야 합니다. 현재 저장소에 외부에서 호출할 재검증 API가 있다고 가정하지 않습니다. 브라우저의 기존 화면은 새로고침합니다.
5. 복구가 필요하면 최신 after를 기대 원본으로 삼고 백업 content를 개정 파일로 제공해 조건부 SQL을 다시 생성합니다. 이후 다른 편집이 있으면 중단합니다. 발행일·slug·커버·태그를 되돌려 덮어쓰지 않으며 updated_at은 복구가 실제 수행된 시각입니다.

실제 CMS 갱신, 브라우저 렌더링과 운영 캐시 확인은 후속 적용 단계에 남아 있습니다.
