# mion blog – 학습 중심 블로그 Monorepo

개발 공부를 목적으로 다양한 기술을 실험하고, AI 도구를 적극 활용하여 서비스 형태로 구현해 보는 프로젝트입니다. 제품 완성도보다 학습과 경험 축적을 우선시합니다.

**요약**

- 모노레포 기반으로 프론트엔드(Next.js 15)와 백엔드(NestJS 11)를 구성합니다.
- 데이터 계층은 Drizzle ORM을 사용하며, 환경 변수와 시크릿은 Doppler로 관리합니다.
- 인프라는 Railway를 사용해 간단한 배포 경험을 목표로 합니다.
- 프로젝트 초반에는 Claude Code를, API 구성 이후에는 Codex를 주요 AI 도구로 사용합니다.

**목차**

- 프로젝트 목적
- 성공 기준(학습 목표)
- 기술 스택
- 모노레포 구조
- 빠른 시작
- 개발/빌드/테스트 명령어
- 배포와 환경 변수
- AI 활용 방식
- 라이선스 및 기여

**프로젝트 목적**

- 디자인과 퍼블리싱 장벽으로 인한 과거의 시행착오를 AI로 극복하고, 다시 한 번 서비스 구축 흐름 전반을 경험합니다.
- ‘제품’보다 ‘개발 공부’를 우선하여 Turborepo, Next.js, NestJS, Drizzle ORM, Doppler, Railway 등 다양한 도구를 채택하고 비교 평가합니다.
- 실제 블로그 기능은 후순위이며, 학습과 실험의 컨테이너 역할을 수행합니다.

**성공 기준(학습 목표)**

- 디자인: Playwright MCP + shadcn 조합으로 벤치마킹 컴포넌트를 제작합니다.
- SNS 로그인: Next.js에서의 소셜 로그인 플로우를 직접 구성해 봅니다.
- AI 컨텍스트: AI와의 질의응답을 통해 요구사항을 구체화하고 정확히 구현합니다.
- Drizzle ORM: Prisma 사용 경험 대비 Drizzle의 장단점을 체감합니다.
- Railway: ‘간단한 배포’가 무엇인지 실제로 경험합니다.
- Doppler: Git worktree 사용 시 복잡해지는 환경 변수 관리를 일원화합니다.
- 블로그 운영: Markdown + Mermaid 포스팅, SEO, Google Ads 적용 과정을 경험합니다.

**기술 스택**

- 프레임워크: `Next.js 15`, `NestJS 11`
- 언어/런타임: `TypeScript`, `Node.js`
- ORM/DB: `Drizzle ORM`
- 인증: `NextAuth`(소셜 로그인 실험)
- 환경/시크릿: `Doppler`
- 인프라: `Railway`
- 오브젝트 스토리지: `MinIO`
- 패키징/워크스페이스: `pnpm`, `Turborepo`
- 테스트: `Playwright`(웹), `Jest`(API)
- UI: `@repo/ui`(shadcn 기반 구성)

**모노레포 구조**

- 앱
  - `apps/blog-web`: Next.js 15 프론트엔드 앱입니다.
  - `apps/blog-api`: NestJS 11 백엔드 앱입니다.
- 패키지
  - `packages/database`: Drizzle ORM 래퍼입니다.
  - `packages/shared`: 유틸과 타입을 제공합니다.
  - `packages/ui`: 디자인 시스템 컴포넌트입니다.
  - `packages/eslint-config`, `packages/typescript-config`: 툴링 프리셋입니다.

**빠른 시작**

- 의존성 설치: `pnpm install`을 실행합니다.
- 환경 변수 템플릿: `pnpm doppler-setup`으로 로컬 프로필을 설정합니다.
- 프론트엔드 개발 서버: `pnpm --filter blog-web dev`로 실행합니다.
- 백엔드 개발 서버: `pnpm --filter blog-api dev`로 실행합니다.

**개발/빌드/테스트 명령어**

- 전체 빌드: `pnpm build`를 실행합니다.
- 형상 점검: `pnpm lint`, `pnpm check-types`, `pnpm format`을 사용합니다.
- 데이터베이스 작업(Drizzle):
  - `pnpm --filter @repo/database generate`
  - `pnpm --filter @repo/database push`
  - `pnpm --filter @repo/database migrate`
- 웹 테스트(Playwright):
  - E2E: `pnpm --filter blog-web test:e2e`
  - UI: `pnpm --filter blog-web test:ui`
- API 테스트(Jest):
  - `pnpm --filter blog-api test`

**배포와 환경 변수**

- 모든 시크릿과 환경 변수는 Doppler 프로젝트(`mion-blog`)에서 관리합니다.
- 로컬 실행 시 `.env` 파일을 커밋하지 않으며, Doppler 변수를 우선합니다.
- 인프라는 Railway를 사용하여 배포 자동화를 단순화하는 것을 목표로 합니다.

**AI 활용 방식**

- 프로젝트 초반 설계와 골격 구성에는 Claude Code를 사용했습니다.
- API 구성 이후부터는 Codex를 활용하여 요구사항 정제와 구현 정확도 향상을 목표로 합니다.
- AI 질의응답 기록을 문서화하여 의사결정 근거를 남깁니다.

**컨벤션 요약**

- TypeScript/TSX는 Prettier 기본값(2-space, 세미콜론 유지, 100열)을 따릅니다.
- React 컴포넌트와 Nest 서비스/프로바이더는 `PascalCase`를, 유틸/파일은 `camelCase`를 사용합니다.
- Next `app` 라우트는 소문자-kebab-case, Nest 모듈은 `*.module.ts` 패턴을 유지합니다.

**라이선스 및 기여**

- 개인 학습과 포트폴리오 목적의 리포지토리입니다.
- 개선 제안이나 아이디어는 이슈로 등록해 주시면 검토합니다.
