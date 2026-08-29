# 패키지 목표 버전

## Change Context

- 불변 작업 식별자: `20260829_넥스트16업그레이드`
- 기능 식별 키: `nextjs-platform`
- 기준 명세: 없음
- 활성 변경: `docs/changes/20260829_넥스트16업그레이드/`
- 기준 명세 조회 상태: 없음

## 목적

- Next.js 16.3.3 업그레이드에 포함할 패키지와 목표 버전을 고정한다.

## Interview Log

1. **질문:** Next.js 16.3.3 호환성과 현재 보안 패치를 반영할 패키지별 목표 버전은 무엇인가?
   - **답변:** 아래 확정 매트릭스대로 변경하고, 유지 대상으로 분류한 패키지는 현재 버전을 유지한다.

## Confirmed

### 변경

| 위치 | 패키지 | 목표 버전 |
| --- | --- | --- |
| `apps/blog-web` | `next` | `^16.3.3` |
| `apps/blog-web` | `@next/mdx` | `^16.3.3` |
| `apps/blog-web` | `next-auth` | `^4.24.15` |
| `apps/blog-web` | `react` | `^19.2.8` |
| `apps/blog-web` | `react-dom` | `^19.2.8` |
| `apps/blog-web` | `@types/react` | `19.2.18` |
| `apps/blog-web` | `@types/react-dom` | `19.2.5` |
| `apps/blog-web` | `next-mdx-remote` | `^6.0.0` |
| `packages/eslint-config` | `@next/eslint-plugin-next` | `^16.3.3` |

### 유지

| 위치 | 패키지 | 유지 버전 |
| --- | --- | --- |
| `apps/blog-web` | `@mdx-js/loader` | `^3.1.1` |
| `apps/blog-web` | `@mdx-js/react` | `^3.1.1` |
| `apps/blog-web` | `@types/mdx` | `^2.0.13` |
| `apps/blog-web` | `@types/node` | `^22.15.3` |
| `apps/blog-web` | `eslint` | `^9.34.0` |
| `apps/blog-web` | `typescript` | `5.9.2` |
| `apps/blog-web` | `@playwright/test` | `^1.55.1` |

## 확인 근거

- Next.js `16.3.3`은 Node.js `>=20.9.0`, React·React DOM `^19.0.0`, Playwright `^1.51.1`을 허용한다.
- NextAuth `4.24.15`는 Next.js `^16`과 React·React DOM `^19`를 허용한다.
- `@next/mdx 16.3.3`은 현재 `@mdx-js/loader 3.1.1`, `@mdx-js/react 3.1.1`의 범위를 허용한다.
- React·React DOM은 `19.2.8`로 보안 패치를 반영하고 React 타입 패키지를 현재 최신 `19.2.x`로 정렬한다.
- `next-mdx-remote 5.0.0`은 고위험 보안 취약 범위에 포함되며 `6.0.0`에서 수정됐다.

## Open Questions

- 없음.

## Risks And Unverified

- `next-mdx-remote 6.0.0`은 MDX의 JavaScript 표현식을 기본 차단한다. 실제 저장된 MDX 콘텐츠는 현재 확인하지 않았으므로 기존 게시글 호환성은 미확인이다.
- 실제 저장 게시글 확인은 [`validation-acceptance.md`](validation-acceptance.md)의 Chrome 검증 조건을 따른다.
- `packages/ui`의 React 타입과 React peer 범위는 이번 매트릭스의 변경 대상이 아니다. 업그레이드 후 workspace 타입 검사에서 충돌이 확인되면 별도로 판단한다.
- 패키지를 실제로 설치하지 않았고 목표 조합의 타입 검사·빌드·런타임도 실행하지 않았다.

## References

- [`apps/blog-web/package.json`](../../../../apps/blog-web/package.json) - 현재 프론트엔드 패키지 버전
- [`packages/eslint-config/package.json`](../../../../packages/eslint-config/package.json) - 현재 Next.js ESLint 플러그인 버전
- [`apps/blog-web/components/mdx-renderer.tsx`](../../../../apps/blog-web/components/mdx-renderer.tsx) - `next-mdx-remote/rsc` 사용 경로
- [Next.js 16 업그레이드 가이드](https://nextjs.org/docs/app/guides/upgrading/version-16) - Next.js 16 런타임·React 요구사항
- [React RSC 보안 공지](https://react.dev/blog/2025/12/11/denial-of-service-and-source-code-exposure-in-react-server-components) - React 19.2 보안 수정 범위
- [next-mdx-remote 보안 권고](https://github.com/advisories/GHSA-g4xw-jxrg-5f6m) - 취약 버전과 수정 버전
- [next-mdx-remote 6.0.0 릴리스](https://github.com/hashicorp/next-mdx-remote/releases/tag/v6.0.0) - JavaScript 표현식 기본 차단 변경
