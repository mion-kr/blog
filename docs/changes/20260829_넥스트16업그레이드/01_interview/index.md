# Next.js 16 업그레이드 인터뷰

## Change Context

- 불변 작업 식별자: `20260829_넥스트16업그레이드`
- 기능 식별 키: `nextjs-platform`
- 기준 명세: 없음
- 활성 변경: `docs/changes/20260829_넥스트16업그레이드/`
- 기준 명세 조회 상태: 없음

## 문서

- [`upgrade-scope-and-bundler.md`](upgrade-scope-and-bundler.md): 업그레이드 범위와 개발·프로덕션 번들러 결정
- [`validation-acceptance.md`](validation-acceptance.md): 업그레이드 완료 검증 범위 결정
- [`package-version-matrix.md`](package-version-matrix.md): 업그레이드 대상 패키지와 목표 버전 결정

## 확인한 근거

| 대상 | 기준 | 확인 시각 | 확인 결과 |
| --- | --- | --- | --- |
| 저장소 | `GuideME-Trip/스킬설치`, `e1be5efdb651536441e2c96608687f435cb1920b` | 2026-08-29 11:27:02 +0900 | 조사 기준 커밋 확인 |
| 프론트엔드 패키지 | `apps/blog-web/package.json`, `pnpm-lock.yaml` | 2026-08-29 | 현재 Next.js `15.5.9`, React `19.2.1`, NextAuth `4.24.11` |
| 인증 계약 | `apps/blog-web/lib/auth-config.ts`, `apps/blog-web/lib/auth.ts`, `apps/blog-api/src/auth/strategies/jwt.strategy.ts` | 2026-08-29 | Google 로그인, 7일 JWT 세션, 원본 세션 토큰의 NestJS Bearer 인증 흐름 확인 |
| 외부 패키지 계약 | npm 공식 메타데이터 | 2026-08-29 | Next.js `16.3.3`과 NextAuth `4.24.15`의 호환 범위 확인 |
| 패키지 보안 | React 공식 보안 공지, GitHub Advisory, `pnpm audit --prod` | 2026-08-29 | React `19.2.1`과 `next-mdx-remote 5.0.0`의 보안 패치 필요성 확인 |
| 프레임워크 변경점 | Next.js 16 공식 업그레이드 문서 | 2026-08-29 | 프로덕션 빌드의 기본 번들러가 Turbopack으로 바뀌는 점 확인 |
| 배포 구조 | 사용자 설명, `README.md`, `packages/database`, `apps/blog-web/lib/site.ts` | 2026-08-29 | Cloudflare 도메인이 Railway에 연결되고 Railway의 Next.js·NestJS 서비스가 main에서 자동 배포되며 MinIO를 운영하고 DB는 Neon, 운영 URL은 `https://blog.mion-space.dev`임을 확인 |

배포 환경의 Node.js 버전과 업그레이드 후 빌드·런타임은 인터뷰 단계에서 확인하지 않았다.

## 확정된 결정

- 목표 프레임워크는 Next.js `16.3.3`이다.
- 인증 라이브러리는 안정판 NextAuth `4.24.15`를 사용하고 현재 인증 계약을 유지한다.
- Next.js `16.3.3` 업그레이드와 NextAuth `4.24.15` 갱신·인증 호환성 검증은 하나의 작업으로 진행한다.
- Node.js 지원 범위는 루트 `engines.node`의 `>=22`를 유지한다.
- 개발 서버는 현재처럼 Turbopack을 사용한다.
- 프로덕션 빌드는 Webpack을 유지한다.
- 필수 E2E 범위는 서버 렌더링·라우팅·NextAuth 인증 경로로 한정한다.
- 실제 Google 계정 로그인 1회를 인증 검증에 포함한다.
- 업그레이드 작업 후 외부 Chrome 개인 프로필에서 실제 저장 게시글의 MDX를 확인하고, Mermaid 다이어그램과 표가 정상 표시되는지 검증한다.
- 완료 판정은 PR을 main 브랜치에 병합하고 배포한 뒤, 기존 게시물 렌더링·관리자 로그인·포스트 생성·삭제가 모두 정상임을 확인한 시점으로 한다.
- main 배포 후 문제가 발견되면 수정·PR 병합·재배포·재검증을 반복하고, 모든 완료 조건을 통과할 때까지 종료하지 않는다.
- Railway의 Next.js·NestJS 서비스는 main 브랜치에서 자동 배포되며 운영 검증 URL은 `https://blog.mion-space.dev`이다.
- 패키지별 목표 버전은 [`package-version-matrix.md`](package-version-matrix.md)의 확정 매트릭스를 따른다.

## 코드·문서로 자답한 내용

- `docs/specs/nextjs-platform/spec.md`와 기존 활성 인터뷰는 없다.
- 현재 인증은 프론트 세션 토큰 형식과 NestJS 복호화 코드가 결합돼 있으므로 업그레이드 후 실제 인증 계약 검증이 필요하다.
- Next.js 16에서도 프로덕션 빌드에 Webpack을 사용하려면 빌드 명령에 `--webpack`을 명시해야 한다.

## 충돌과 미확인 사항

- Next.js 16부터 `next build`의 기본 번들러가 Turbopack으로 바뀌므로 Webpack 유지 결정은 스크립트에 명시해야 한다.
- 업그레이드 후 실행 검증은 아직 하지 않았다.
- 배포 환경이 Node.js 22 이상인지 확인하지 않았다.

## 남은 질문

- 없음.

## 다음 설계 작업

- 없음. 인터뷰 진행 중이다.
