# 업그레이드 범위와 번들러

## Change Context

- 불변 작업 식별자: `20260829_넥스트16업그레이드`
- 기능 식별 키: `nextjs-platform`
- 기준 명세: 없음
- 활성 변경: `docs/changes/20260829_넥스트16업그레이드/`
- 기준 명세 조회 상태: 없음

## 목적

- 이 주제를 확인하는 이유: Next.js·NextAuth·번들러 변경 범위를 고정한다.
- 이 주제가 불명확하면 생기는 리스크: 프레임워크와 인증 계약, 프로덕션 번들러를 한 번에 바꿔 실패 원인을 분리하기 어렵다.

## Interview Log

1. **질문:** Next.js 16 업그레이드에서 사용할 인증 라이브러리 기준은 무엇인가?
   - **답변:** 안정판 NextAuth `4.24.15`를 사용하고 현재 인증 계약을 유지한다.

2. **질문:** 개발 서버와 프로덕션 빌드의 번들러를 어떻게 운영할 것인가?
   - **답변:** 현재 구성을 유지한다. 개발 서버는 Turbopack을 사용하고 프로덕션 빌드는 Webpack을 사용한다.

3. **질문:** Next.js 16.3.3 업그레이드와 NextAuth 4.24.15 갱신·인증 호환성 검증을 어떻게 나눌 것인가?
   - **답변:** 분리하지 않고 하나의 작업으로 진행한다.

## Confirmed

- Next.js `16.3.3`을 목표로 한다.
- NextAuth `4.24.15`와 기존 Google 로그인·JWT 세션·NestJS Bearer 인증 계약을 유지한다.
- Next.js 업그레이드와 NextAuth 갱신·인증 호환성 검증은 하나의 작업으로 진행한다.
- Node.js `>=22`를 유지한다.
- 개발은 `next dev --turbopack`, 프로덕션 빌드는 `next build --webpack`을 사용한다.

## Open Questions

- 없음. 검증 범위는 [`validation-acceptance.md`](validation-acceptance.md)에 기록했다.

## References

- [`apps/blog-web/package.json`](../../../../apps/blog-web/package.json) - 현재 개발·빌드 명령과 프론트엔드 의존성
- [`package.json`](../../../../package.json) - 루트 Node.js 지원 범위
- [`apps/blog-web/lib/auth-config.ts`](../../../../apps/blog-web/lib/auth-config.ts) - 현재 로그인·세션 계약
- [`apps/blog-web/lib/auth.ts`](../../../../apps/blog-web/lib/auth.ts) - 세션 토큰 전달 계약
- [`apps/blog-api/src/auth/strategies/jwt.strategy.ts`](../../../../apps/blog-api/src/auth/strategies/jwt.strategy.ts) - NestJS 토큰 복호화 계약
- [Next.js 16 업그레이드 가이드](https://nextjs.org/docs/app/guides/upgrading/version-16) - 프레임워크 변경점
- [NextAuth 4.24.15 릴리스](https://github.com/nextauthjs/next-auth/releases) - 인증 라이브러리 호환·보안 수정 근거
