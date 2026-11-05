# Cloudflare 이관 설계

## 작업

- 작업 식별자: `20261105_클라우드플레어이관_MID-275`
- 기능 식별 키: `blog-platform`
- 기준 명세: `docs/specs/blog-platform/spec.md`(없음)
- 변경 명세: `docs/changes/20261105_클라우드플레어이관_MID-275/specs/blog-platform/spec.md`

## 목적

블로그를 Vercel·Supabase에서 Cloudflare Workers(Astro SSR + D1 + R2)로 옮기기 전에 이슈의 "설계 때 정할 것" 4개(로그인·세션, MDX 렌더링, 패키지 구조, 이미지 저장소)를 근거와 함께 정한다. 엔드포인트별 계약과 세부 작업 순서는 이 결정 승인 뒤 같은 디렉터리의 설계 증분에서 쓴다.

## 문서

| 문서 | 목적 |
| --- | --- |
| [design.md](design.md) | 4개 결정, 선택지 비교, 결정 범위 테스트 계획, 작업 순서 개요 |
| [risk-review.md](risk-review.md) | 고위험 검토 결과와 남은 위험 |
| [변경 명세](../specs/blog-platform/spec.md) | 이관 전후 관찰 가능한 계약과 수용 기준 |

## 확인 근거

| 출처 | 기준 | 관련 이유 |
| --- | --- | --- |
| Linear MID-275 | 2026-11-05 조회, 댓글 0 | 목표·범위·금지 사항 |
| 코드 | 브랜치 `improve/mid-275-blog-cloudflare-migration`, 커밋 `427b9a2` | 인증·MDX·업로드·패키지 사용처 |
| 운영 DB | Supabase(`prd_api` DATABASE_URL), 2026-11-05 `begin read only` 트랜잭션 조회 | 개수, 본문 MDX 문법, 커버 URL, Storage 객체 |
| Doppler | `mion-blog` `local_api`·`prd_api` | `S3_*` 저장소 종류(값 미출력) |
| Cloudflare API | 계정 `7a3a31f4…`, 2026-11-05 읽기 조회 | `mion-space.dev` 영역 소유·요금제, R2 버킷 목록 |
| DNS | 2026-11-05 `dig` | NS Cloudflare, A 레코드 Vercel |
| 외부 문서·npm | 2026-11-05, design.md "외부 근거" 표 | 버전, Workers 제약, 라이브러리 유지 상태 |
| 독립 검토 | 2026-11-05 `mion-reviewer` 1회 | 누락 동작·보안·테스트 지적 25건 중 근거 확인된 것 반영 |
| 고위험 검토 | 2026-11-05 지지·반박·구현 3관점 + 공식 문서 재확인 | 필수 수정 12건·로그인 보안 9건 반영, 사용자 결정 3건 |

첫 조사 쿼리 1회는 연결 옵션의 읽기 전용 설정이 적용되지 않은 채(`default_transaction_read_only=off`) SELECT만 실행했다. 이후 조회는 모두 `begin read only` 트랜잭션에서 했다. Supabase에 쓴 내용은 없다.

## 남은 질문

- 사용자 결정 대기 없음(2026-11-05 설계 승인, design.md "사용자 결정 기록").
- 미확인: `acorn-jsx`·`hangul-romanize`·`oauth4webapi`의 workerd 동작, `__Host-` 쿠키 로컬 동작, 지금 세션의 만료 연장 여부, Workers 렌더 CPU 실측, mermaid 번들 크기, Google OAuth 클라이언트 위치, Google 콘솔 등록 URI, Vercel 빌드 설정.

## 다음 작업

- 2단계 설계 증분(엔드포인트별 계약·테스트, 기존 항목 대응표) → `mion-4-executor`.
