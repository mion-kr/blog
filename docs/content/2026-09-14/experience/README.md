# 경험·설계 글 8개 개정안

운영 반영 대기 자료입니다. 앱 코드는 변경하지 않았으며 PR 병합만으로 CMS 본문이 바뀌지 않습니다. 정확한 URL·발행일·원문/개정문 SHA-256은 [manifest.json](manifest.json), 원문 대비 변경은 [diffs](diffs), 링크·도표 보존 결과는 [preservation.json](preservation.json)에 있습니다.

## 원문과 보존 범위

- 코디네이터 지시에 따라 technical 담당자가 Doppler `mion-blog/prd_api` 설정으로 운영 DB에서 `BEGIN READ ONLY`와 `default_transaction_read_only=on`을 사용해 공개 글을 조회했습니다. 원문 JSON은 `/Users/mion/.codex/tmp/adsense-fix-20260914/originals/{slug}.json`에 보관됐으며 이 작업은 그 `content`를 직접 읽어 개정했습니다. HTML 추출문을 MDX 원문으로 대체하지 않았습니다.
- 별도로 8개 공개 URL을 다시 요청해 HTTP 200과 제목을 확인했습니다. 결과는 영구 보관 폴더의 `experience-evidence/publicBefore.json`에 있습니다. 이는 수정 전 조회이며 배포 확인이 아닙니다.
- 기존 제목·slug·발행일·카테고리·태그·작성자·요약·커버 이미지는 변경 대상이 아닙니다. 본문에 실제 편집일과 보완 내용을 명시했습니다. `publishedAt`은 조회된 문자열을 그대로 기록했고 날짜를 임의 변환하지 않았습니다.
- 기존 본문 링크 제거 0건, X 임베드 3개 보존, Mermaid 15개 보존입니다. gRPC의 두 번째 도표만 잘못된 연결·분산 주체를 정정했고 나머지 14개는 줄바꿈 정규화 외 원문과 같습니다. 개정 MDX는 frontmatter 없는 전체 본문이며 LF 줄바꿈을 사용합니다.

## 글별 변경 이유와 확인 근거

| 글 | 변경 이유와 추가 가치 | 근거·검증 범위 |
| --- | --- | --- |
| Astra 세 사람의 결과물 | 제작자 사례·영상·기존 수치를 유지하고, 수정 가능한 자산을 평가하는 기준과 의자 실습 설계를 구체화 | [모델 공식 문서](https://developers.openai.com/api/docs/models/gpt-6-astra/), 제작자 원문 링크 및 공식 X oEmbed 응답 확인. 의자 실습은 미실행이라고 명시 |
| OpenAI PostgreSQL | 원문 링크 부재 해소, 발표 시점과 수치의 적용 범위 구분, HOT 46%의 표본과 VACUUM·TOAST·자동 VACUUM 설명 정정, 예약 기능별 적용 기준 추가 | [OpenAI 원문](https://openai.com/index/scaling-postgresql/), [CMU 원문](https://www.cs.cmu.edu/~pavlo/blog/2023/04/the-part-of-postgresql-we-hate-the-most.html), [HOT](https://www.postgresql.org/docs/current/storage-hot.html), [TOAST](https://www.postgresql.org/docs/current/storage-toast.html), [VACUUM](https://www.postgresql.org/docs/current/routine-vacuuming.html), [자동 VACUUM 설정](https://www.postgresql.org/docs/current/runtime-config-vacuum.html), [PgBouncer](https://www.pgbouncer.org/features.html). OpenAI 규모 재현 없음 |
| 해외 예약 시간대 | 기본 변환 성공이 입력 유효성을 보장하지 않는다는 점을 SQL 출력으로 설명 | [모호한 시각 처리](https://www.postgresql.org/docs/current/datetime-invalid-input.html), [실행 SQL](examples/timezone.sql). PostgreSQL 18.4/tzdata 2026b에서 직접 실행. 미래 규칙 변경·알림 통합 검증 없음 |
| AWS PR 테스트 환경 | 웹 배포와 DB 격리 성공을 구분하는 진단 기준, 미적용 마이그레이션과 운영 배포 조건 정정 | [Supabase GitHub 연동](https://supabase.com/docs/guides/deployment/branching/github-integration), [Vercel 연동](https://supabase.com/docs/guides/deployment/branching/integrations), [Vercel 환경](https://vercel.com/docs/deployments/environments). 이 블로그에서 해당 조합을 구축했다는 주장 없음 |
| Next.js Server Action/API | 기존 제목 입력의 강제 문자열 변환을 자료형 검사로 보완, JSON 파싱 실패 처리, 실제 입력 검증 예제와 전체 Action 검증의 경계 표시 | [Next.js 변경 작업](https://nextjs.org/docs/app/getting-started/mutating-data), [보안](https://nextjs.org/docs/app/guides/data-security), [실행 예제](examples/titleValidation.mjs). Node.js v24.9.0의 실제 FormData·File 사용. 실제 Action/로그인/DB/캐시 통합 검증 없음 |
| AI와 비관적 잠금 | 조건부 UPDATE도 잠금을 사용함을 명확히 하고 두 세션의 대기·커밋 후 수량 확인을 추가 | [행 잠금](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS), [재현 스크립트](examples/rowLock.py). PostgreSQL 18.4에서 실제 실행. 연결 풀 고갈·처리량 시험 없음 |
| 설계의 은탄환 | 기존 메모 관계 문제를 유지하고 연결 개수·대상 존재·삭제 규칙과 재검토 조건을 구체화 | [PostgreSQL 제약](https://www.postgresql.org/docs/current/ddl-constraints.html). 운영 스키마나 실제 성능 결과로 표현하지 않음 |
| gRPC 트래픽 편향 | 클라이언트의 준비된 연결 선택과 keepalive를 구분하고 L4 뒤 주소 해석 조건, 스트리밍·처리 비용의 한계 추가 | [로드밸런싱](https://grpc.io/docs/guides/custom-load-balancing/), [서비스 설정](https://grpc.io/docs/guides/service-config/), [keepalive](https://grpc.io/docs/guides/keepalive/), [성능](https://grpc.io/docs/guides/performance/). 기존 2025-10-10·10회 이상·5:5·CPU 20%는 당시 기록으로 보존. 원시 로그 재확보·새 부하 측정 없음 |

Astra 제작자 X 페이지는 웹 조회 도구에서 오류가 났으나 `publish.twitter.com/oembed`가 게시자·본문을 반환했습니다. Pietro의 15분은 응답에 포함됐고 Tom·Matt의 긴 글은 생략 표시가 있어 모든 문장·영상·수치를 이번에 독립 재확인했다고 주장하지 않습니다. 기존 사례 소개를 삭제하거나 직접 제작한 것처럼 바꾸지 않았습니다.

## 검증 결과와 재현

의존성 설치는 저장소 잠금 파일을 유지한 `pnpm install --frozen-lockfile`로 수행했습니다. 앱 소스·설정·잠금 파일 변경은 없습니다.

```sh
node docs/content/2026-09-14/experience/examples/validateMdx.mjs
node docs/content/2026-09-14/experience/examples/titleValidation.mjs
python3 /Users/mion/.codex/skills/create-mermaid-diagrams/scripts/validate_mermaid.py --profile explanatory --warnings-as-errors docs/content/2026-09-14/experience/isyu-grpcro-guseongdoen-maikeuroseobiseuui-teuraepik-pyeonhyang-balsaeng.mdx
```

- 기본 `git diff --check`는 기존 MDX의 Markdown 강제 줄바꿈(줄 끝 공백 2개)과 저장한 unified diff의 빈 문맥 행을 공백 오류로 보고했습니다. 원문 표현과 diff 형식을 보존했으며 README·예제·JSON 파일의 별도 공백 검사는 통과했습니다.
- 실제 앱이 사용하는 `next-mdx-remote/rsc`와 `remark-gfm`으로 MDX 8개 컴파일 통과. 도표 15개 블록과 X 임베드 3개 보존 확인.
- gRPC 도표 2개 정적 검사 통과: 오류 0, 경고 0. Mermaid를 Node.js에서 직접 파싱하는 초기 시도는 `DOMPurify.addHook is not a function`으로 실패했습니다. 이후 technical 담당자가 준비한 jsdom 환경에서 Mermaid 11.12.0을 동적으로 불러와 `mermaid.parse`로 두 도표 모두 통과했습니다. 실행 스크립트는 `/Users/mion/.codex/tmp/adsense-fix-20260914/technical-validation/validateMermaid.mjs`, 출력은 `experience-evidence/mermaidParser.txt`입니다. SVG 렌더링은 수행하지 않았으며 실제 브라우저 렌더링 완료로 보고하지 않습니다.
- 제목 검증: 문자열 정상화, 누락·숫자·File·공백 거절. `String(File)`은 `[object File]`로 변환되는 것을 확인했습니다.
- 별도 네트워크 없는 PostgreSQL 컨테이너에서 SQL 및 두 세션 실험 통과. 데이터와 수치는 재현용이며 운영 데이터가 아닙니다.

같은 PostgreSQL 환경을 만들려면 다음 명령을 사용합니다. 포트는 공개하지 않으며 다른 DB에는 연결하지 않습니다. 컨테이너 이름이 이미 사용 중이면 기존 것을 삭제하지 말고 실행 스크립트의 이름까지 함께 바꿉니다.

```sh
docker run -d --rm --name adsense-experience-pg-20260914 --network none -e POSTGRES_HOST_AUTH_METHOD=trust postgres@sha256:1a5b3e745bbd82d6deb146505e504da3c2f248cac15e431951b148fbe4f8613a
docker exec adsense-experience-pg-20260914 pg_isready -U postgres
docker exec -i adsense-experience-pg-20260914 psql -X -U postgres -f - < docs/content/2026-09-14/experience/examples/timezone.sql
python3 docs/content/2026-09-14/experience/examples/rowLock.py
docker stop adsense-experience-pg-20260914
```

`pg_isready`가 준비됨을 반환한 다음 예제를 실행합니다. PostgreSQL 18.4, aarch64 Debian, tzdata `2026b-0+deb13u1`에서 확인했습니다. 실행 원출력은 `/Users/mion/.codex/tmp/adsense-fix-20260914/experience-evidence/`의 `timezone.txt`, `rowLock.txt`, `titleValidation.txt`, `mdx.txt`에 보관합니다.

## 운영 적용 인계

1. 코디네이터 검토와 PR 병합 후 technical 담당자의 보존·동시 변경 검사 절차를 사용합니다. 이 PR은 운영 쓰기를 수행하지 않습니다.
2. 각 slug의 적용 직전 원문을 다시 조회하여 초기 백업의 본문·수정 시각·보존 필드와 비교합니다. 달라졌다면 이번 개정문을 그대로 덮어쓰지 않고 변경을 합칩니다.
3. 운영 본문에 넣을 값은 manifest의 `revisedFile` 전체입니다. diff나 README, manifest를 본문으로 넣지 않습니다. 원래 작성일·발행일은 유지하고 수정 시각만 실제 저장 시각으로 처리합니다.
4. 기존 API의 content 단독 PUT은 요약·커버 손실을 일으킬 수 있다는 technical 담당자 확인이 있습니다. 승인된 조건부 SQL 절차를 우선 인계하며, 공식 관리자 API를 사용한다면 해당 담당자의 `contentRevision.py`가 보존 필드를 포함하는 요청을 준비하도록 합니다. 임의의 content 단독 요청은 보내지 않습니다.
5. 적용 뒤 본문 SHA-256과 제목·slug·요약·커버·발행일·작성자·카테고리·태그·공개 상태를 대조합니다. 공개 페이지 8개에서 새 문단, 기존 X 임베드·링크, gRPC 도표와 표를 확인합니다. 캐시가 있다면 실제 앱의 갱신 경로로 반영을 확인합니다.
6. 운영 확인 및 원격 브랜치·워크트리 정리는 코디네이터 담당입니다. 이번 작업에서는 병합, CMS/DB 쓰기, 재검토 요청, 워크트리 삭제를 하지 않습니다.
