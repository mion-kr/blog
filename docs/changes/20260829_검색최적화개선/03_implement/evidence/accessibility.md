# WCAG 2.2 AA 변경 영향 범위 검증

## 검증 기준

- 검증일: 2026-08-30 17:22 +0900 (KST)
- 기준 HEAD: `73d5dec01662af39c498ef0904db925710599536`
- 대상 상태: 위 HEAD에 현재 미커밋 SEO·접근성 변경을 더한 작업 트리
- 앱: Next.js `16.3.3`, React `19.2.8`
- 브라우저: agent-browser `0.34.0`, Chrome for Testing `152.0.7977.54`
- 자동 진단: axe-core `4.12.1`, 태그 `wcag2a,wcag2aa,wcag22aa`
- viewport: 1440×900, 390×844, 320×844 CSS px
- route: `/`, `/posts`, `/about`, `/posts/seo-runtime-post`, `/posts/__missing__`, `/auth/signin`
- 범위: 공개 route와 로컬 로그인 UI의 변경 영향 부분 감사. 인증 후 관리자 화면과 외부 Google 인증 제공자 화면의 전체 적합성은 포함하지 않는다.

## 결론

- 위 6개 route의 변경 영향 기준은 로컬 수용 검증을 통과했다.
- axe 자동 진단은 세 viewport의 모든 대상 route에서 위반 0건이다.
- axe가 네온 gradient·pseudo-element 배경의 텍스트 대비를 자동 계산하지 못한 항목은 `incomplete`로 남았으며, 이를 자동 통과로 바꾸지 않고 CSS 전경·배경 토큰을 수동 계산했다.
- 이 결과는 블로그 전체나 외부 Google 인증 화면의 WCAG 2.2 AA 적합성 선언이 아니다.

## 수정 전 재현과 최소 변경

| 재현된 실패 | 수정 | 근거 |
| --- | --- | --- |
| 홈 제목·`읽기` 링크 3개가 성공 기준 2.5.8의 24px 크기·간격을 충족하지 못함 | 해당 제목 링크와 `읽기` 링크에만 `min-height: 24px` 적용 | 44×44 일괄 적용 없이 axe `target-size` 위반 3개를 0개로 해소 |
| About 설명 3개 4.45:1, 상세 태그 4.49:1, 로그인 안내 3.9:1 | About·상세의 `--text-muted`를 다른 공개 route와 같은 0.52 alpha로 통일하고 로그인 안내를 `text-slate-400`으로 조정 | 일반 텍스트 4.5:1 미달 요소만 보정 |
| 로그인 본문 링크가 주변 문구와 색상으로만 구분됨 | `홈으로 돌아가기`에 밑줄 추가 | 성공 기준 1.4.1의 비색상 구분 회복 |
| skip link가 z-index 100인 sticky header 뒤에 완전히 가려짐 | focus z-index를 101로 변경 | 성공 기준 2.4.11의 완전 가림 해소 |
| 320px에서 네온 header와 목록 검색·카드가 오른쪽으로 잘림 | 360px 이하에서 기존 header를 두 줄로 wrap하고 목록 main/search의 최소 너비만 해제 | 새 메뉴 없이 성공 기준 1.4.10 Reflow 회복 |
| 역할 없는 `div`의 `aria-label`과 generic pagination `span`의 `aria-label`을 axe가 판정하지 못함 | 의미 있는 묶음에는 `role="group"` 연결, 비컨트롤 span의 불필요한 `aria-label` 제거 | 기존 UI·탐색 계약을 유지하며 4.1.2 판정 불가 제거 |

## 자동 진단 결과

최종 실행에서 모든 route·viewport의 `violations`는 0건이었다. `passes`는 route별 18~24개였고, 로그인은 `incomplete`도 0건이었다. 다른 네온 route는 배경 gradient 또는 pseudo-element 때문에 `color-contrast` 한 규칙이 `incomplete`로 남았다.

| route | 1440×900 | 390×844 | 320×844 |
| --- | --- | --- | --- |
| `/` | 위반 0 | 위반 0 | 위반 0 |
| `/posts` | 위반 0 | 위반 0 | 위반 0 |
| `/about` | 위반 0 | 위반 0 | 위반 0 |
| `/posts/seo-runtime-post` | 위반 0 | 위반 0 | 위반 0 |
| `/posts/__missing__` | 위반 0 | 위반 0 | 위반 0 |
| `/auth/signin` | 위반 0·미판정 0 | 위반 0·미판정 0 | 위반 0·미판정 0 |

## 수동 검증 근거

### 대비

- 실제 CSS의 가장 밝은 배경 후보를 기본 심층 배경, 카드 배경, cyan 18% glow, purple 12% glow로 나눠 합성 대비를 계산했다.
- `--text-muted: rgba(255,255,255,0.52)`의 최저 대비는 cyan glow 배경에서 4.92:1이다.
- `--text-secondary`는 같은 조건에서 8.03:1, `--text-primary`는 12.99:1, neon cyan은 9.26:1이다.
- 검정 텍스트를 쓰는 브랜드 gradient의 낮은 쪽인 purple 배경도 5.31:1이다.
- focus outline `rgb(59,130,246)`은 확인한 가장 밝은 dark surface에서도 5.06:1이다.
- 투명 글자색으로 구현한 제목 gradient는 white·cyan 두 끝점이 모두 해당 dark background에서 기준을 넘는 것을 확인했다.

### 비텍스트 대비

- 입력·select·페이지 링크·연락 링크처럼 경계가 조작 영역 식별에 필요한 selector는 `--border-glow: rgba(0,229,255,0.45)`를 사용한다. 실제 dark deep·card 배경 합성 대비는 3.21~3.30:1이다.
- 현재 페이지는 neon cyan 배경과 검정 숫자로 13.65:1이고, focus indicator의 neon cyan은 가장 밝은 확인 배경에서도 9.26:1이다.
- 검색 입력은 명시적인 2px neon cyan outline, 상세·상세 404의 `.btn-neon`은 2px neon cyan outline과 기존 box-shadow를 함께 사용한다. 공통 focus outline은 2px blue다.
- `--border-dim`을 유지한 카드·tag pill·구분선은 장식이며, 링크·버튼은 텍스트·`#`·아이콘과 접근성 이름으로 기능을 식별한다. 비활성 pagination과 장식 emoji는 필수 상태를 색상만으로 전달하지 않는다.

### Reflow·초점·포인터 대상

- 320×844에서 의도적으로 숨겨 두었다가 focus 때 나타나는 skip link를 제외하면 viewport 밖으로 잘린 visible·focusable 요소는 6개 route 모두 0개다.
- `document.documentElement.scrollWidth`와 `clientWidth`가 같았고 정보·기능 손실 없이 세로로 reflow됐다.
- 세 viewport에서 route별 focusable 요소를 DOM 순서대로 확인했다. 양의 `tabindex`는 0개이고, 모든 요소가 `:focus-visible`의 공통 또는 route-local 고대비 outline을 가지며 sticky UI에 완전히 가린 요소는 0개다.
- 홈 제목·`읽기` 링크는 24px 이상으로 보정됐다. 24px 미만으로 측정된 나머지는 focus 전 숨김 skip link 또는 문장 안 인라인 링크이며, 인라인·숨김 상태 예외와 focus 시 실제 크기를 구분했다.
- axe의 `target-size` 위반은 모든 대상 route와 viewport에서 0개다.
- 비활성 이전·다음 pagination에는 `이전 페이지 없음`·`다음 페이지 없음`, 현재 page에는 `페이지 N, 현재 페이지` 숨김 문구를 제공해 glyph만 이름으로 남지 않게 했다.
- 6개 route 모두 `#main` 대상이 정확히 1개다. 자체 chrome을 쓰는 상세와 상세 404에는 `tabIndex={-1}`을 연결했으며, 320px 키보드 활성화에서 hash가 `#main`으로 바뀌고 상세는 본문으로 스크롤·focus, production 404는 `MAIN#main` focus가 확인됐다.

### WCAG 2.2 신규 기준 적용 여부

- 2.5.7: 앱 코드에 drag-only 상호작용이 없어 해당 없음이다.
- 3.2.6: 여러 route에 반복 배치되는 동일 도움말 수단이 없어 해당 없음이다.
- 3.3.7: 같은 절차에서 동일 정보를 다시 입력하는 흐름이 없어 해당 없음이다.
- 3.3.8: 로컬 로그인 화면은 인지 기능 검사를 요구하지 않고 Google 인증 진입만 제공한다. 로컬 단계는 통과했고 외부 Google 제공자 화면은 미확인이다.

## route × 성공 기준 매트릭스

| 성공 기준 | 홈 | 목록 | About | 대표 상세 | 상세 404 | 로그인 |
| --- | --- | --- | --- | --- | --- | --- |
| 1.4.3 Contrast (Minimum) | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 |
| 1.4.10 Reflow (320px) | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 |
| 1.4.11 Non-text Contrast | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 |
| 2.4.3 Focus Order | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 |
| 2.4.7 Focus Visible | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 |
| 2.4.11 Focus Not Obscured | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 |
| 2.5.7 Dragging Movements | 해당 없음 | 해당 없음 | 해당 없음 | 해당 없음 | 해당 없음 | 해당 없음 |
| 2.5.8 Target Size (Minimum) | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 |
| 3.2.6 Consistent Help | 해당 없음 | 해당 없음 | 해당 없음 | 해당 없음 | 해당 없음 | 해당 없음 |
| 3.3.7 Redundant Entry | 해당 없음 | 해당 없음 | 해당 없음 | 해당 없음 | 해당 없음 | 해당 없음 |
| 3.3.8 Accessible Authentication | 해당 없음 | 해당 없음 | 해당 없음 | 해당 없음 | 해당 없음 | 로컬 통과·외부 미확인 |

## 2026-08-30 잔여 항목 후속 검증

- 기준 HEAD: `20b47c267d3971794710b0c534c94d083f4e0bc0`에 현재 미커밋 후속 변경을 더한 작업 트리
- 도구: agent-browser `0.34.0`, axe-core `4.12.1`, 태그 `wcag2a,wcag2aa,wcag22aa`
- 대표 상세 `/posts/seo-runtime-post`: 위반 0건, 브랜드 링크의 접근성 이름이 보이는 텍스트 `Mion's Blog`와 일치하고 `Related Tags`가 제목 단계 2로 확인됐다. gradient 배경의 대비 1건은 자동 미판정으로 남아 기존 수동 대비 근거를 유지한다.
- 목록 범위 초과 `/posts?page=999`: 위반 0건, DOM의 `#main`이 1개이며 건너뛰기 링크 활성화 뒤 초점이 `MAIN#main`으로 이동했다.
- 전역 404 `/__seo-missing__`: 위반 0건, DOM의 `#main`이 1개이며 건너뛰기 링크 활성화 뒤 초점이 `MAIN#main`으로 이동했다.
- 이 후속 검증은 변경된 의미 구조와 404 경계에 대한 데스크톱 재검증이다. 기존 6개 route·3개 viewport 감사 범위를 블로그 전체 적합성 선언으로 확대하지 않는다.
| 4.1.2 Name, Role, Value | 통과 | 통과 | 통과 | 통과 | 통과 | 통과 |

## 자동·런타임 회귀 검증

- `pnpm --filter blog-web check-types`: 통과
- `pnpm --filter blog-web lint`: 통과
- `pnpm --filter blog-web exec node scripts/verify-seo-runtime.mjs`: 통과
- Next.js `/_next/mcp`의 `get_compilation_issues`: 0건
- Next.js `/_next/mcp`의 `get_errors`: `configErrors` 0건, `sessionErrors` 0건
- 320px 홈·목록·상세·로그인 viewport screenshot을 확인했으며 header wrap, 목록 검색·카드, 본문, 로그인 UI에서 잘림이나 기능 손실을 발견하지 못했다.

## 미확인과 경계

- 인증 후 관리자 화면과 외부 Google 인증 제공자 화면은 이번 SEO 변경 범위 밖이다.
- 공개 route에서 발견한 공통 skip link의 z-index 수정은 `app/layout.tsx`에 있어 관리자 화면에도 렌더되지만, 관리자 화면의 WCAG 적합성은 별도로 확인하지 않았다.
- agent-browser 감사는 이번 작업의 로컬 수용 증거이며 Playwright 같은 저장소 내 반복 자동 회귀 suite를 새로 도입한 것이 아니다.
- 운영 배포, PageSpeed, CrUX 현장 데이터, 공개 글 9개의 Rich Results Test, Search Console과 소셜 플랫폼 캐시는 별도 운영 검증으로 남는다.
