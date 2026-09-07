# About 개인정보 노출 제거 검증

2026-09-07, About 페이지와 전용 스타일만 변경했습니다.

## 변경

- 직접 연락처, 프로필 사진, 회사·학교·기간 및 상세 경력 데이터를 페이지에서 제거했습니다.
- 공개 설정 API와 프로필 환경 변수의 읽기, 관련 import를 제거했습니다. 데이터 조회가 사라져 비동기 페이지와 강제 동적 렌더링도 제거했습니다.
- 소개를 AI 개발 경험, 도구 활용, 시행착오와 결과물 공유로 바꾸고 `/posts` 링크를 넣었습니다. 새로운 개인 실적을 추가하지 않았습니다.
- 제목과 기본·Open Graph·Twitter 설명을 블로그 소개로 맞췄습니다. 공개 브랜드, canonical, robots와 `/og/about.png`는 유지했습니다.
- 네온 카드·레이아웃은 재사용하고 사용하지 않는 사진·이력 스타일만 제거했습니다. 사이트 구현 인프라 문단은 개인정보가 아니므로 그대로 유지했습니다.

## 검증 결과

| 검증 | 결과 |
| --- | --- |
| `pnpm --filter blog-web lint` | 통과 |
| `pnpm --filter @repo/shared build` 후 `pnpm --filter blog-web check-types` | 통과 |
| `doppler run --project mion-blog --config local_web -- env NODE_ENV=production pnpm --filter blog-web build` | 통과, About 정적 생성 |
| Next.js 16.3.3 Turbopack의 `/_next/mcp` | `get_compilation_issues` 이슈 0건, About `get_errors` 설정·세션 오류 0건 |
| 개발 서버 `http://127.0.0.1:3102/about` | HTML 및 RSC 200 |
| 운영 모드 서버 `http://127.0.0.1:3103/about` | HTML 및 RSC 200 |
| 개인정보 문자열 | 변경 전 코드의 이메일·회사·학교·기간 7개 값이 두 서버 HTML/RSC에서 모두 0건 |
| 사진·연락처 구조 | HTML/RSC의 `profileImageUrl`, `mailto:`, 프로필 사진 마크업 없음; About DOM의 이미지 0개 |
| 메타데이터 | 기본·OG·Twitter 설명 일치, `/about` canonical 및 기존 OG 이미지 유지 |
| 경로 | 운영 모드 `/`, `/posts`, `/about`, `/terms`, `/privacy-policy`, `/og/about.png` 모두 200 |
| Orca 브라우저 | 개발 About 1440×1000 및 375×812에서 제목·카드·본문 확인, 문서 가로 넘침 없음 |
| 운영 모드 브라우저 상호작용 | About 직접 진입 후 ‘글 목록 보기’ 클릭으로 `/posts` 이동 확인 |

정적 문구를 그대로 복제하는 테스트는 추가하지 않았습니다. 개인정보 원문을 이 문서나 새 테스트 데이터에 복제하지 않았습니다.

## 재현과 제한

1. `pnpm install --frozen-lockfile` 후 공용 패키지를 빌드하고 린트·타입 검사를 실행합니다.
2. 위 빌드 명령 후 같은 Doppler 설정에서 `NODE_ENV=production pnpm --filter blog-web exec next start --hostname 127.0.0.1 --port 3103`으로 실행합니다.
3. `/about`을 일반 HTML 및 `RSC: 1` 헤더로 요청합니다. 리다이렉트를 따르고 응답 유형이 각각 `text/html`, `text/x-component`인지 확인합니다. 검색봇 검증은 `User-Agent: Googlebot`으로 요청합니다.
4. 변경 전 커밋 `50ce453`의 About 코드에서 개인정보 값을 메모리로만 추출하여 응답에 없는지 대조합니다. 실제 값을 로그나 보고에 출력하지 않습니다.
5. 브라우저에서 제목, 주제 카드, 글 목록 링크, 기본·OG·Twitter 설명과 기존 이미지 주소를 확인합니다.

- 첫 타입 검사는 공용 패키지 빌드 전이라 실패했습니다. 공용 패키지 빌드 후 통과했습니다.
- 첫 빌드는 개발용 Doppler 설정의 `NODE_ENV=development`로 전역 오류 페이지 사전 렌더링에 실패했습니다. 명령 범위에서 `NODE_ENV=production`을 적용한 빌드는 통과했습니다. 저장된 환경 설정은 변경하지 않았습니다.
- 기존 로컬 API가 연결되지 않아 글 데이터 로딩은 검증하지 못했습니다. 운영 모드 `/posts`에서는 기존 서버 설정 오류 안내를 확인했습니다. 링크 이동과 경로 응답 검증을 데이터 로딩 성공으로 해석하지 않습니다.
- 기존 공개 About 원격 조회가 HTTP 오류였고 로컬 설정 API도 연결되지 않았으며 프로필 환경 변수는 없었습니다. 따라서 실제 기존 프로필 URL 값의 일대일 대조는 미확인입니다. 대신 About의 조회/import/환경 변수 의존성 제거, 사진 마크업 부재와 정적 생성을 확인했습니다.
- About 연락처 섹션은 제거했지만 수정 금지 범위인 공용 푸터의 GitHub 링크는 유지했습니다.
- 375px 화면에서 기존 공용 헤더 메뉴 끝부분이 좁게 표시되는 모습은 남아 있습니다. 새 본문·카드는 정상 표시되며 공용 헤더는 수정하지 않았습니다.
- 개발 서버에서 브라우저 이동을 기다리던 Orca 연결이 종료되어 새 탭을 생성했습니다. 새 운영 모드 탭에서 링크 이동을 확인했습니다.
- `next dev`가 미추적 `apps/blog-web/AGENTS.md`, `apps/blog-web/CLAUDE.md`를 생성했습니다. 작업 소유 범위 밖이므로 커밋하지 않았습니다.
- 런타임 파일 복사 대상은 0개였습니다. 비밀을 파일이나 출력에 복제하지 않았습니다.

메타데이터 방식은 [Next.js 공식 Metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)의 정적 metadata 구성을 따릅니다. 변경은 route 계층의 정적 렌더링과 metadata에 한정되며 새 계층·공용 규칙은 추가하지 않았습니다.
