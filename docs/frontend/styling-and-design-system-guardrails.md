# Styling And Design System Guardrails

## 목적

- 이 문서는 전역 스타일, theme, 디자인 시스템, feature 스타일의 경계를 유지하기 위한 기준입니다.
- 스타일 정책이 화면별 로직과 섞이지 않게 합니다.

## 책임과 경계

- `app/globals.css`는 전역 토큰과 공통 베이스 스타일을 담당합니다.
- provider/theme 설정은 Shared UI/Theme 계층에서 관리합니다.
- feature/route 전용 스타일은 route 가까운 CSS module 또는 component 수준 스타일에서 관리합니다.
- 공개 화면의 Editorial 테마(MID-238)는 `components/layout/editorial.module.css`가 토큰·기본 요소·헤더·푸터·제목 영역(`.page-head`)을, `app/(site)/home.module.css`·`posts/posts.module.css`·`posts/[slug]/post.module.css`·`about/about.module.css`·`auth/signin/signin.module.css`·`components/legal-document.module.css`가 화면별 규칙을 담당합니다. `SiteChrome`이 `(site)` 전체를 공용 `.root`로 감싸고, 루트 404(`GlobalNotFound`)는 같은 헤더·푸터를 직접 렌더링합니다. 각 페이지가 `<main id="main">`을 렌더링합니다.
- 공용 규칙은 `:where(.root)`로 감싸 화면 module 규칙이 항상 이기게 합니다. 화면 module의 MDX 본문 컨테이너는 전역 `.prose`와 겹치지 않도록 지역 클래스(`styles.prose`)를 씁니다.
- 글꼴은 루트 layout의 `next/font` 변수(`--font-paperlogy`, `--font-plex-mono`)를 토큰에서 참조합니다. 페이퍼로지 원본과 라이선스는 `app/fonts/paperlogy/`에 있습니다.

## Must

- MUST 전역 theme와 provider 설정은 Shared UI/Theme 계층에 둡니다.
- MUST route 전용 비주얼 실험은 route 가까운 CSS module 또는 전용 component에 둡니다.
- MUST 공통 UI 패턴은 `components/` 또는 `@repo/ui` 재사용 가능 형태로 유지합니다.
- MUST 스타일 선택은 재사용 범위에 따라 전역, shared, route-local 중 하나로 명확히 고릅니다.
- SHOULD 토큰, spacing, color, typography 규칙은 theme 또는 전역 스타일에서 일관되게 관리합니다.

## Must Not

- MUST NOT feature별 business rule을 theme/provider에 숨깁니다.
- MUST NOT 전역 스타일에 route 전용 예외를 과도하게 누적합니다.
- MUST NOT 같은 UI 패턴을 화면마다 조금씩 다른 클래스로 복제합니다.
- MUST NOT styling 결정을 data access 계층 파일에 넣습니다.

## Review Questions

- 이 스타일은 전역 규칙인가, shared UI 규칙인가, route-local 규칙인가?
- provider/theme 계층이 feature 정책을 들고 있지 않은가?
- 같은 패턴이 여러 화면에서 반복되는데 shared UI로 올려야 하지 않는가?
- route-local 비주얼 실험이 전역 스타일을 오염시키지 않는가?

## Exception Process

- 빠른 실험용 스타일은 route-local로 시작할 수 있습니다.
- 두 화면 이상에서 반복되면 shared UI 또는 theme 계층으로 승격합니다.
- 전역 스타일 수정이 필요하면 영향 범위를 먼저 기록합니다.
