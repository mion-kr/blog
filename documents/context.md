# Mion 블로그 프로젝트 작업 현황

## 프로젝트 개요
- **이름**: Mion의 기술 블로그
- **기술**: Next.js 15 + Nest.js + Turbo Repo + pnpm
- **데이터베이스**: PostgreSQL (Neon) + Drizzle ORM  
- **인증**: Google OAuth (NextAuth.js)
- **스타일**: Tailwind CSS + shadcn/ui
- **콘텐츠**: MDX 지원
- **배포**: Next.js(Vercel) + Nest.js(Railway)

## 폴더 구조
```
mion-blog/
├── apps/
│   ├── blog-web/          # Next.js 15 프론트엔드 (포트 3000)
│   └── blog-api/          # Nest.js API 서버 (포트 3001)
├── packages/
│   ├── shared/            # 공통 타입과 유틸리티
│   ├── database/          # Drizzle ORM 데이터베이스 스키마
│   └── typescript-config/ # 타입스크립트 설정
└── documents/             # 요구사항과 문서들
```

## 완료된 작업들

### 1. 프로젝트 기본 설정 완료 ✅
- Turbo Repo 설정 (pnpm workspace)
- 앱 이름 변경: web→blog-web, docs→blog-api
- Nest.js로 API 서버 교체
- 포트 분리: 프론트(3000), API(3001)

### 2. packages/shared 패키지 완료 ✅
**만든 파일들:**
```
packages/shared/src/
├── types/
│   ├── index.ts           # 모든 타입 내보내기
│   ├── user.ts            # 사용자, 권한 타입
│   ├── blog.ts            # 포스트, 카테고리, 태그 타입
│   └── api.ts             # API 응답 타입들
├── utils/
│   ├── index.ts           # 유틸리티 내보내기
│   └── slug.ts            # 슬러그 생성/검증 함수들
└── index.ts               # 메인 내보내기
```

**주요 기능:**
- UUIDv7 사용 (시간순 정렬 가능한 고유 ID)
- 슬러그 시스템 (한글→영문 변환, 중복 방지, SEO 최적화)
- 완전한 타입 안전성

### 3. packages/database 패키지 완료 ✅
**기술:**
- Drizzle ORM + Neon Database (PostgreSQL)
- UUIDv7로 Primary Key 생성

**데이터베이스 테이블:**
- `users`: Google OAuth 사용자, ADMIN/USER 권한
- `categories`: 블로그 카테고리, 슬러그 지원
- `tags`: 포스트 태그, 슬러그 지원
- `posts`: 블로그 포스트, MDX 내용
- `post_tags`: 포스트-태그 관계 테이블

**추가 기능:**
- 시드 데이터 생성 스크립트
- 관계형 데이터베이스 설계

### 4. blog-web (Next.js 15) 완료 ✅

#### 4.1 Tailwind CSS + shadcn/ui 설정
- 요구사항 문서 기반 색상 시스템
- CSS Custom Properties로 동적 테마 변경 가능
- 다크모드: 시스템 설정에 따라 자동 전환 (토글 버튼 없음)
- 반응형: 모바일(1열) → 태블릿(2열) → 데스크톱(3열)
- Aura 블로그 디자인 컨셉 적용

#### 4.2 NextAuth.js + Google OAuth 설정
- Google OAuth 2.0만 지원
- JWT 토큰 (7일간 유효)
- CSRF 공격 방지 기능 내장
- 환경변수로 Mion 계정 자동 ADMIN 권한 부여

#### 4.3 MDX 완벽 지원
- 커스텀 MDX 컴포넌트 (`mdx-components.tsx`)
- 코드 하이라이팅 준비
- 이미지 최적화 지원

### 5. blog-api (Nest.js) 완료 ✅

#### 5.1 필수 패키지 설치
- Swagger API 문서화
- JWT 토큰 처리 
- 보안 설정 (Helmet, CORS)
- 데이터 검증 (class-validator)

#### 5.2 보안 설정
- CORS: blog.mion.dev, localhost:3000만 허용
- 보안 헤더 자동 적용
- 전역 데이터 검증

#### 5.3 인증 시스템
- NextAuth.js와 호환되는 JWT 검증
- ADMIN/USER 권한별 가드
- 데코레이터로 간단한 권한 제어

#### 5.4 Swagger 문서
- 접속: `http://localhost:3001/api-docs`
- JWT 토큰 인증 지원
- API별 태그 분류

## 해결한 오류들

### 1. 타입스크립트 모듈 오류 해결 ✅
**문제**: `process is not defined`, `drizzle-kit not found`
**해결**: 패키지 설치, @types/node 추가, ESM __dirname 처리

### 2. Next.js ES 모듈 오류 해결 ✅
**문제**: `module.exports` 문법 오류
**해결**: 
- `postcss.config.js` → `export default` 방식
- `tailwind.config.js` → `import` + `export default`
- `@tailwindcss/postcss` 패키지 추가

### 3. React Context 서버 컴포넌트 오류 해결 ✅
**문제**: `React Context is unavailable in Server Components`
**해결**: 
- `SessionProvider`를 클라이언트 컴포넌트로 분리
- `components/providers.tsx` 생성 (`"use client"` 사용)

### 4. 모듈 경로 오류 해결 ✅
**문제**: `@/components/providers` 찾을 수 없음
**해결**: 상대 경로 `../components/providers` 사용

## 현재 상태

### ✅ 완료된 것들
1. **개발 환경**: 완전히 설정된 Turbo Repo
2. **타입 시스템**: 100% 타입 안전성 보장
3. **데이터베이스**: 완전한 스키마 설계
4. **인증**: NextAuth.js + JWT 시스템
5. **스타일링**: Tailwind + shadcn/ui + 반응형
6. **MDX**: 블로그 글쓰기 시스템
7. **API**: Nest.js + Swagger 문서
8. **보안**: CORS, Helmet, CSRF 모두 적용

### 🚀 지금 실행 가능
```bash
# 모든 서버 함께 실행
pnpm dev

# 개별 실행
pnpm --filter=blog-web dev  # http://localhost:3000
pnpm --filter=blog-api dev  # http://localhost:3001

# API 문서 보기
# http://localhost:3001/api-docs
```

### 📋 다음에 할 일
1. **홈페이지 만들기**: 포스트 목록 보여주기
2. **포스트 상세 페이지**: MDX 렌더링
3. **관리자 페이지**: 글쓰기/수정 화면
4. **API 컨트롤러**: 실제 CRUD 기능
5. **데이터베이스 연결**: 진짜 데이터 저장/조회

## 환경 변수 설정

### blog-web/.env (Next.js)
```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=비밀키입력
GOOGLE_CLIENT_ID=구글클라이언트ID
GOOGLE_CLIENT_SECRET=구글클라이언트시크릿
ADMIN_EMAIL=관리자이메일@gmail.com
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### blog-api/.env (Nest.js)
```bash
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://사용자명:비밀번호@호스트:5432/데이터베이스명?sslmode=require"
JWT_SECRET=JWT비밀키
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
ADMIN_EMAIL=관리자이메일@gmail.com
```

## 중요한 파일 위치들

### Next.js (blog-web)
- `app/layout.tsx`: 기본 레이아웃 + 프로바이더
- `components/providers.tsx`: SessionProvider 래퍼 (클라이언트)
- `lib/auth.ts`: 서버용 인증 도구들
- `hooks/use-auth.ts`: 클라이언트용 인증 훅
- `mdx-components.tsx`: MDX 커스텀 컴포넌트들

### Nest.js (blog-api)  
- `src/main.ts`: 서버 설정 + Swagger 설정
- `src/auth/`: JWT 전략과 가드들
- `src/app.module.ts`: 메인 모듈

### 공통 패키지
- `packages/shared/src/`: 타입 정의 + 도구들
- `packages/database/src/`: 데이터베이스 스키마

## 기술적 결정들

### 선택한 기술들과 이유
1. **UUIDv7**: CUID2 대신 선택 (표준 규격, 시간 정렬)
2. **다크모드**: 수동 토글 없이 시스템 설정 따름
3. **타입 안전성**: strict 모드, any 타입 금지
4. **ES Module**: 모든 설정 파일을 최신 방식으로
5. **경로**: 별칭(@) 대신 상대 경로 (안정성)

### 구조 설계 결정
1. **모노레포**: 프론트엔드와 백엔드를 하나로 관리
2. **인증**: NextAuth.js + JWT 조합
3. **상태관리**: React Context 사용
4. **스타일**: CSS-in-JS 대신 Tailwind CSS
5. **데이터베이스**: ORM 우선, 직접 SQL 최소화

**이 파일을 보면 모든 작업 상황을 파악할 수 있습니다!**

---

# 요구사항 및 코드 분석 결과 (2025-09-06)

## 개발자 정보 분석

### 개발자 배경 및 경험
- **백엔드 전문성**: Nest.js 4년 이상의 풍부한 경험을 보유하고 계시네요
- **풀스택 도전**: Next.js는 초보 수준으로, AI의 도움을 받아 풀스택 개발에 도전하려는 의지를 보여주십니다
- **학습 지향적**: 새로운 기술 스택에 대해 자세한 설명을 원하시는 학습형 개발자이십니다

### 기술 스택 선호도
- **백엔드**: Nest.js (숙련도 높음)
- **프론트엔드**: Next.js (초보 수준, 상세한 가이드 필요)
- **개발 환경**: GitHub 블로그 → 풀스택 블로그로 전환 시도

### 개발 스타일 및 특징
- 체계적인 접근을 선호하시며, 상세한 설명과 가이드를 필요로 하심
- 기존 경험(백엔드)을 바탕으로 새로운 영역(프론트엔드)으로 확장하려는 적극적 자세

## 프로젝트 요구사항 상세 분석

### 기능적 요구사항 (Functional Requirements)

#### 핵심 기능
- **포스트 관리**: CRUD 기능 (등록/수정/조회/삭제)
- **인증 시스템**: Google OAuth 전용 로그인
- **권한 관리**: Mion님만 포스트 작성 가능 (ADMIN 권한)
- **MDX 지원**: Markdown 확장 형태의 콘텐츠 작성
- **카테고리/태그 시스템**: 포스트 분류 및 필터링

#### 상세 기능
- **Slug 기반 URL**: SEO 최적화된 사용자 친화적 URL 구조
- **조회수 시스템**: IP/세션 기반 중복 방지 조회수 추적
- **실시간 MDX 에디터**: 미리보기, 코드 하이라이팅, 이미지 업로드
- **SEO 최적화**: 메타데이터, Open Graph, 사이트맵, 구조화된 데이터

### 비기능적 요구사항 (Non-functional Requirements)

#### 성능 요구사항
- **이미지 최적화**: WebP 우선, 레이지 로딩
- **번들 최적화**: 코드 스플리팅, Tree shaking
- **캐싱 전략**: 정적 자원 적극적 캐싱
- **반응형 디자인**: 모바일-태블릿-데스크톱 최적화

#### 보안 요구사항
- **JWT 기반 인증**: Stateless 방식으로 Vercel + Railway 환경 최적화
- **CSRF 보호**: NextAuth.js를 통한 CSRF 토큰 검증
- **권한 기반 접근 제어**: ADMIN/USER 역할 구분
- **CORS 설정**: 허용된 도메인만 API 접근 가능

#### 접근성 요구사항
- **WCAG 2.1 AA 준수**: 4.5:1 이상의 색상 대비
- **키보드 네비게이션**: 모든 인터랙티브 요소 접근 가능
- **스크린 리더 지원**: 적절한 ARIA 레이블 및 시맨틱 HTML

## 현재 코드베이스 분석 결과

### 프로젝트 아키텍처 현황

#### Monorepo 구조
- **패키지 매니저**: `pnpm@9.0.0` (workspace 지원)
- **빌드 시스템**: Turbo Repo 2.5.6 (TUI 모드 활성화)
- **Node 요구사항**: `>=18` (최신 ES 기능 활용)

#### 워크스페이스 구조
```
mion-blog/
├── apps/
│   ├── blog-web/          # Next.js 15 프론트엔드
│   └── blog-api/          # Nest.js API 서버
├── packages/
│   ├── shared/            # 공통 타입 및 유틸리티
│   ├── database/          # Drizzle ORM 스키마
│   ├── ui/                # 공통 UI 컴포넌트 (개발 중)
│   ├── eslint-config/     # ESLint 설정
│   └── typescript-config/ # TypeScript 설정
```

### 기술 스택 상세 분석

#### 프론트엔드 (blog-web)
- **React**: 19.1.0 (최신 안정 버전)
- **Next.js**: 15.5.0 (App Router + Turbopack)
- **TypeScript**: 5.9.2 (strict 모드)
- **Tailwind CSS**: 4.1.12 (최신 버전)
- **NextAuth.js**: 4.x (JWT + Google OAuth)

#### 백엔드 (blog-api)
- **Nest.js**: 최신 버전 (IoC Container + 모듈 시스템)
- **Drizzle ORM**: 타입 안전한 데이터베이스 쿼리
- **Swagger**: API 문서 자동 생성
- **JWT + Passport**: 인증/인가 시스템

#### 공통 패키지
- **shared**: 타입 정의 + 유틸리티 함수
- **database**: PostgreSQL 스키마 (UUIDv7 기반)

### 코드 품질 평가

#### 우수한 점들
- ✅ **모던 기술 스택**: 최신 stable 버전 사용
- ✅ **타입 안전성**: 100% TypeScript 커버리지
- ✅ **보안 고려**: 다층 보안 체계
- ✅ **성능 최적화**: Turbopack, 폰트 최적화
- ✅ **개발 경험**: Hot reload, Swagger 문서

#### 미완성 영역
- 🔄 **CRUD API**: 실제 데이터 처리 로직 미구현
- 🔄 **UI Components**: packages/ui 미완성
- 🔄 **Error Handling**: 전역 에러 처리 미흡
- 🔄 **Testing**: 테스트 커버리지 부족

## 개발 우선순위 제안

### Phase 1: 핵심 기능 개발 (즉시 착수)
1. **포스트 CRUD API 구현** (Nest.js)
   - 포스트 생성/조회/수정/삭제 컨트롤러
   - 카테고리/태그 관리 API
   - 권한 기반 접근 제어

2. **프론트엔드 페이지 구현** (Next.js)
   - 홈페이지: 포스트 목록 표시
   - 포스트 상세 페이지: MDX 렌더링
   - 관리자 페이지: 글쓰기/수정 인터페이스

### Phase 2: UI/UX 완성
1. **디자인 시스템 구현**
   - Aura 블로그 컨셉 적용
   - 반응형 그리드 시스템
   - 다크모드 시스템 설정

2. **MDX 에디터 개발**
   - 실시간 미리보기
   - 코드 하이라이팅
   - 이미지 업로드 기능

### Phase 3: 최적화 및 운영 준비
1. **성능 최적화**
   - 이미지 최적화 시스템
   - 번들 사이즈 최적화
   - 캐싱 전략 구현

2. **SEO 완성**
   - 동적 메타데이터
   - 사이트맵 자동 생성
   - 구조화된 데이터

### 추가 개선사항
- **즉시 필요**: 전역 에러 처리, 데이터베이스 트랜잭션 관리
- **중장기**: 성능 모니터링, CI/CD 파이프라인, 테스트 자동화

## 결론

현재 Mion Blog 프로젝트는 **견고한 기초 인프라**가 완성된 상태입니다. Next.js와 Nest.js의 최신 기술 스택을 활용하여 현대적인 풀스택 블로그 시스템의 토대가 마련되어 있으며, 이제 실제 비즈니스 로직과 사용자 인터페이스 구현 단계로 진입할 준비가 되었습니다.