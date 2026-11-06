# mion blog

[mion-space.dev](https://mion-space.dev) 블로그 저장소입니다. 개발 공부를 목적으로 다양한 기술을 실험하고, AI 도구를 적극 활용하여 서비스 형태로 구현해 보는 프로젝트입니다.

## 기술 스택

- 앱: `Astro 7`(서버 렌더링), 관리자 화면은 `React 19` island
- 런타임·배포: `Cloudflare Workers`(`@astrojs/cloudflare`, `wrangler`)
- DB: `Cloudflare D1`(SQLite) + `Drizzle ORM`
- 이미지 저장소: `Cloudflare R2`(공개 주소 `media.mion-space.dev`)
- 인증: Google OAuth(`oauth4webapi`) + 서명 쿠키 세션(`jose`)
- 글 렌더링: MDX(`unified`·`remark`·`rehype`), Mermaid
- 스타일: `Tailwind CSS 4`
- 테스트: `Vitest` + `@cloudflare/vitest-plugin`(workerd에서 실행)
- 비밀값: `Doppler`(프로젝트 `mion-blog`)
- 워크스페이스: `pnpm`, `Turborepo`

## 저장소 구조

- `apps/blog`: 블로그 앱(공개 화면, 관리자 화면, RSS·sitemap, 이미지 업로드)
  - `src/`: 화면·서버 처리·DB 스키마
  - `migrations/`: D1 마이그레이션 SQL
  - `test/`: 단위 테스트와 계약 테스트
  - `wrangler.jsonc`: Worker·D1·R2 바인딩과 로컬 기본 설정값
- `packages/eslint-config`, `packages/typescript-config`: 툴링 프리셋
- `docs/changes`: 변경 기록, `docs/content`: 블로그 글 원고

## 빠른 시작

1. 의존성을 설치합니다: `pnpm install`
2. Doppler `mion-blog` 프로젝트의 `local_blog` 설정 값으로 `apps/blog/.dev.vars`를 만듭니다. 이 파일은 커밋하지 않습니다.
3. 로컬 D1에 마이그레이션을 적용합니다: `pnpm --filter blog exec wrangler d1 migrations apply mion-blog --local`
4. 개발 서버를 띄웁니다: `pnpm --filter blog dev` (`http://localhost:4321`)

## 명령어

- 전체 빌드: `pnpm build`
- 타입 체크: `pnpm check-types`
- 테스트: `pnpm --filter blog test`
- 서식: `pnpm format`
- 마이그레이션 생성(스키마 변경 뒤): `pnpm --filter blog exec drizzle-kit generate`

## 배포와 환경 변수

- 운영 배포는 `pnpm --filter blog deploy:prod`로 합니다. 빌드 뒤 `wrangler deploy`가 운영 설정값(`SITE_URL`, `ROBOTS_INDEXABLE`, `MEDIA_BASE_URL` 등)을 `--var`로 넣습니다.
- 비밀값(`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAIL`, `SESSION_SECRET`)은 Doppler `prd_blog`가 원본이고, 운영 Worker에는 `wrangler secret`으로 등록합니다.
- 비밀이 아닌 로컬 기본값은 `apps/blog/wrangler.jsonc`의 `vars`에 있습니다.

## 라이선스 및 기여

- 개인 학습과 포트폴리오 목적의 리포지토리입니다.
- 개선 제안이나 아이디어는 이슈로 등록해 주시면 검토합니다.
