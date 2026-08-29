# 업그레이드 완료 검증 범위

## Change Context

- 불변 작업 식별자: `20260829_넥스트16업그레이드`
- 기능 식별 키: `nextjs-platform`
- 기준 명세: 없음
- 활성 변경: `docs/changes/20260829_넥스트16업그레이드/`
- 기준 명세 조회 상태: 없음

## 목적

- Next.js 업그레이드 완료를 판단할 필수 E2E와 실제 인증 검증 범위를 정한다.

## Interview Log

1. **질문:** 실제 Google 계정 로그인을 인증 검증에 포함할 것인가?
   - **답변:** 실제 Google 계정 로그인 1회를 포함한다.

2. **질문:** 기존 Playwright E2E 전체와 업그레이드 영향 경로 중 어느 범위를 필수 완료 조건으로 할 것인가?
   - **답변:** 서버 렌더링·라우팅·NextAuth 인증 경로만 필수 완료 조건으로 한다.

3. **요청:** `next-mdx-remote 6.0.0` 적용 후 실제 저장된 MDX 콘텐츠 호환성을 어떻게 확인할 것인가?
   - **답변:** 업그레이드 작업 후 외부 Chrome 개인 프로필로 실제 저장 게시글을 열고, 특히 Mermaid 다이어그램과 표가 정상 표시되는지 확인한다.

4. **요청:** 업그레이드의 최종 완료 기준과 main 배포 후 문제 발생 시 검증 절차는 무엇인가?
   - **답변:** PR을 main 브랜치에 병합하고 배포한 뒤 기존 게시물 렌더링, 관리자 로그인, 포스트 생성과 삭제가 모두 정상이어야 완료다. 문제가 발견되면 수정하고 다시 PR을 main에 병합·배포한 뒤 같은 검증을 반복한다.

## Confirmed

- 필수 E2E 범위는 서버 렌더링·라우팅·NextAuth 인증 경로다.
- 실제 Google 계정 로그인 1회를 인증 검증에 포함한다.
- 업그레이드 작업 후 외부 Chrome 개인 프로필에서 실제 저장 게시글의 MDX 렌더링을 확인한다.
- 실제 게시글의 Mermaid 다이어그램과 표가 정상 표시되는 것을 필수 확인한다.
- PR을 main 브랜치에 병합하고 배포한 뒤 검증한다.
- 배포된 서비스에서 기존 게시물이 정상적으로 열리고 렌더링되어야 한다.
- 배포된 서비스에서 관리자 로그인이 정상 동작해야 한다.
- 배포된 서비스에서 포스트 생성과 삭제가 정상 동작해야 한다.
- 삭제 검증은 검증 과정에서 생성한 포스트를 대상으로 한다.

## Main 배포 검증 루프

1. 승인된 변경을 PR로 main 브랜치에 병합한다.
2. Railway의 Next.js·NestJS 서비스가 main 기준으로 자동 배포를 완료했는지 확인한다.
3. 외부 Chrome 개인 프로필에서 기존 게시물, MDX의 Mermaid·표, 관리자 로그인, 검증용 포스트 생성·삭제를 확인한다.
4. 하나라도 실패하면 원인을 수정하고 PR 병합과 배포를 다시 진행한다.
5. 같은 검증을 반복하며 모든 완료 조건을 통과한 경우에만 업그레이드를 완료로 판정한다.

## 배포 환경

- 도메인은 Cloudflare에서 구매·관리하며 Railway에 연결되어 있다. 이 내용은 사용자 설명을 기준으로 한다.
- Railway에는 Next.js 웹, NestJS API, MinIO 오브젝트 스토리지 서비스가 있다. 이 내용은 사용자 설명을 기준으로 한다.
- Railway의 Next.js·NestJS 서비스는 main 브랜치에서 자동 배포된다. 이 내용은 사용자 확인을 기준으로 한다.
- 데이터베이스는 Neon이다. 사용자 설명과 `@neondatabase/serverless` 기반 연결 코드가 일치한다.
- 시크릿과 환경 변수는 Doppler 프로젝트 `mion-blog`에서 관리한다.
- 운영 검증 URL은 `https://blog.mion-space.dev`이다. 사용자 확인과 소스 기본값이 일치하며 Doppler의 `NEXT_PUBLIC_SITE_URL`이 우선한다.

## Open Questions

- 없음.

## Risks And Unverified

- 실제 Railway 서비스 상태와 Neon 연결 상태는 확인하지 않았다.

## References

- [`apps/blog-web/package.json`](../../../../apps/blog-web/package.json) - 프론트엔드 검증 명령
- [`apps/blog-web/playwright.config.ts`](../../../../apps/blog-web/playwright.config.ts) - Playwright 실행 설정
- [`apps/blog-web/tests/auth-callback.playwright.spec.ts`](../../../../apps/blog-web/tests/auth-callback.playwright.spec.ts) - 현재 callback URL 검증 범위
- [`apps/blog-web/components/mdx-renderer.tsx`](../../../../apps/blog-web/components/mdx-renderer.tsx) - 실제 MDX·표 렌더링 경로
- [`apps/blog-web/components/mdx-client-components.tsx`](../../../../apps/blog-web/components/mdx-client-components.tsx) - Mermaid 클라이언트 렌더링 경로
- [`README.md`](../../../../README.md) - 현재 저장소의 Railway 배포 목표 문구
- [`apps/blog-web/lib/site.ts`](../../../../apps/blog-web/lib/site.ts) - Doppler 우선 사이트 URL과 기본 운영 URL
- [`packages/database/src/connection.ts`](../../../../packages/database/src/connection.ts) - Neon 서버리스 DB 연결
- [`apps/blog-web/next.config.js`](../../../../apps/blog-web/next.config.js) - Railway MinIO 이미지 엔드포인트
