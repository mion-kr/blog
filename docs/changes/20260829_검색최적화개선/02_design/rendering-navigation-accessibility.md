# 렌더링·탐색·접근성 설계

## Change Context

- 불변 작업 식별자: `20260829_검색최적화개선`
- 기능 식별 키: `seo`
- 기준 명세: `docs/specs/seo/spec.md`
- 활성 변경 명세 델타: `docs/changes/20260829_검색최적화개선/specs/seo/spec.md`
- 기준 명세 조회 상태: 없음
- 변경 유형: 수정
- 기준 상태 → 제안 변경 → 수용 기준: 환경 의존 날짜·버튼 탐색·모호한 링크 → 공통 KST helper·실제 링크·WCAG 2.2 AA 보강 → SSR·DOM·브라우저 수용 검증

## 결론

- 공개 게시일 표시를 `Asia/Seoul`로 고정한 공통 순수 helper로 통일한다.
- 페이지네이션은 query를 보존하는 실제 Next.js `Link`로 전환하고 현재 client navigation의 `scroll: false` 경험을 유지한다.
- 섹션 링크의 보이는 문구와 카드 링크의 접근성 이름을 목적별로 구분한다.
- 접근성 목표를 WCAG 2.2 AA로 상향하고, 네온 디자인을 유지하면서 현재 공개 route와 로그인 화면에 해당하는 성공 기준을 요소별로 검증한다. 이번 변경 영향 범위의 부분 감사이며 블로그 전체 적합성을 선언하지 않는다.

## 배경

- 홈·목록·상세·공개 PostCard가 실행 환경의 로컬 시간대를 사용하는 중복 날짜 함수를 가진다.
- 운영 목록에서 서버와 한국 브라우저 날짜가 달라 hydration 오류가 재현됐다.
- 페이지네이션은 button과 `router.push`로만 이동해 초기 HTML에 후속 page 링크가 없다.
- 홈의 `전체 보기`, `더 보기`, 반복되는 `읽기`가 링크 목적을 충분히 설명하지 않는다.
- 전역 anchor는 밑줄이 제거되고 홈 푸터 링크는 색상 위주로 구분된다. 페이지 버튼은 40×40이다.

## Component Design

### 날짜 helper

- `apps/blog-web/lib/date-format.ts`에 `Intl.DateTimeFormat`과 `timeZone: 'Asia/Seoul'`을 사용하는 순수 helper를 둔다.
- 현재 필요한 형식은 `YYYY.MM.DD`, `M월 D일`, `YYYY년 M월 D일`이며 동일 옵션을 중복 구현하지 않는다.
- 홈 내부 카드, 목록 client component, 상세 server component가 같은 helper를 사용한다. 공개 렌더 경로에서 재사용되는 `components/post-card.tsx`도 같은 계약을 적용하되, 현재 사용처가 없으면 불필요한 동작 변경을 만들지 않는다.
- `<time dateTime>`의 원본 UTC ISO 값과 저장 시각은 유지한다.
- 푸터의 현재 연도와 관리자 날짜는 게시일 표시 계약이 아니므로 이번 범위에서 변경하지 않는다.

### 페이지네이션

- `PostsContent`가 현재 `URLSearchParams`를 복사하고 page만 바꾸는 href builder를 소유한다.
- `PostsPagination`은 `onPageChange` 대신 page별 href를 받아 이전·다음·번호를 `Link`로 렌더링한다.
- `limit`, `search`, `categorySlug`·legacy `category`, `tagSlug`·legacy `tag`, `sort`, `order`, `sortPreset`을 보존한다. `sortPreset`은 API `PostsQuery`나 DTO에 추가하지 않고 UI의 URL 표시 상태로만 보존한다.
- 현재 페이지는 `aria-current="page"`인 비탐색 요소로, 사용할 수 없는 이전·다음은 `aria-disabled="true"`인 비링크 요소로 표현한다.
- 활성 링크는 `scroll={false}`를 사용해 현재 전환 경험을 유지한다.

### 링크 이름과 스타일

- `/posts` 섹션 링크는 `전체 포스트 보기`처럼 목적지를 보이는 문구에 포함한다.
- 카드의 짧은 `읽기` 문구는 유지하되 `${post.title} 읽기` 접근성 이름을 제공한다.
- 푸터 링크에는 밑줄 등 색상 외 구분을 항상 제공하고 hover·focus-visible을 유지한다.
- 페이지네이션과 감사에서 지적된 작은 interactive target은 WCAG 2.2 성공 기준 2.5.8의 24×24 CSS px, 대상 간 간격, 인라인·동등 대상·브라우저 기본·필수 예외를 요소별로 검증한다.
- 44×44 CSS px는 WCAG 2.1 AAA 성공 기준이므로 일괄 적용하지 않는다. 실제 실패가 확인된 요소만 route-local 스타일로 보정한다.
- 일반 텍스트 대비 4.5:1과 전역 focus-visible outline을 유지한다.

### WCAG 2.2 AA 적용 범위

- 이번 활성 변경의 수용 대상은 공개 홈·글 목록·About·글 상세·공개 404와 `/auth/signin`의 로컬 UI다. 인증 후 관리자 화면 전체는 기존 SEO 인터뷰 범위를 벗어나므로 적합성을 주장하지 않고 별도 감사 대상으로 남긴다.
- 성공 기준 2.4.11 `Focus Not Obscured (Minimum)`: 키보드로 초점을 이동했을 때 sticky header·sidebar·overlay가 초점 요소 전체를 가리지 않아야 한다. 실패가 재현될 때만 해당 route의 scroll 여백이나 겹침을 조정한다.
- 성공 기준 2.5.7 `Dragging Movements`: 현재 대상 route에 drag 전용 상호작용이 없으므로 코드 변경 대상이 아니다. 수용 검증에서 drag-only 기능이 없음을 재확인한다.
- 성공 기준 2.5.8 `Target Size (Minimum)`: 각 포인터 대상은 24×24 이상이거나 성공 기준이 허용하는 간격·인라인·동등 대상·브라우저 기본·필수 예외를 충족해야 한다.
- 성공 기준 3.2.6 `Consistent Help`: 반복되는 도움말 수단이 있는 경우 route 간 상대적 순서를 유지한다. 현재 범위에는 반복 도움말 수단이 없어 코드 변경 없이 해당 없음으로 기록한다.
- 성공 기준 3.3.7 `Redundant Entry`: 같은 절차에서 이미 입력한 정보를 다시 요구하지 않는다. 현재 공개 route와 로컬 로그인 화면에는 반복 입력 절차가 없어 해당 없음으로 기록한다.
- 성공 기준 3.3.8 `Accessible Authentication (Minimum)`: 로컬 로그인 화면은 인지 기능 검사를 요구하지 않고 Google 인증 진입만 제공하는 현재 계약을 유지한다. 외부 Google 제공자 화면은 이 저장소의 로컬 적합성 판정과 분리해 미확인으로 공개한다.
- WCAG 2.1 AA에서 이어지는 대비·키보드·스크린 리더 기준도 유지한다. 자동 진단의 `incomplete` 항목은 통과로 간주하지 않고 수동 확인한다.
- 이번 변경 영향 기준은 1.4.3 `Contrast (Minimum)`, 1.4.10 `Reflow`, 1.4.11 `Non-text Contrast`, 2.4.3 `Focus Order`, 2.4.7 `Focus Visible`, 2.4.11 `Focus Not Obscured (Minimum)`, 4.1.2 `Name, Role, Value`와 위 WCAG 2.2 신규 기준이다. route별로 통과·실패·해당 없음·미확인을 기록한다.
- 성공 기준 1.4.10은 320 CSS px 폭에서 별도로 확인한다. 390px 검증은 포인터 대상과 일반 모바일 시각 회귀 근거로 유지하되 Reflow 판정을 대신하지 않는다.

## User Flow

- 사용자는 검색·카테고리·태그·정렬 query를 유지한 채 페이지 링크를 새 탭으로 열거나 주소를 복사할 수 있다.
- JavaScript 실행 전 HTML에도 유효 page 링크가 존재한다.
- 결과가 0개인 page 1에서는 현재 빈 상태와 Reset 동작을 유지한다.
- 링크 문구와 focus 상태는 데스크톱·390px 모바일에서 구분 가능해야 한다.

## Validation

- UTC 자정 경계 fixture가 홈·목록·상세에서 같은 KST 날짜로 렌더링된다.
- 직접 URL 로드와 hydration 후 날짜 텍스트가 같고 React hydration 오류가 없다.
- page 링크 href가 모든 현재 query와 `sortPreset`을 보존하며 page만 바꾼다.
- 유효 page canonical과 필터 URL noindex 계약이 유지된다.
- Node HTML 검사와 agent-browser 접근성 트리에서 섹션·카드 링크의 목적지가 구분된다.
- 데스크톱과 390px 모바일에서 공개 route와 `/auth/signin`의 키보드 초점을 순서대로 이동해 초점 요소가 sticky UI에 완전히 가리지 않는지 확인한다.
- 390px 모바일에서 각 포인터 대상의 크기·중심 간 거리를 측정하고 24×24, 간격 또는 허용 예외 중 어떤 근거로 성공 기준 2.5.8을 충족하는지 기록한다.
- 320px 폭에서 수평 스크롤에 의존하지 않고 정보·기능이 세로로 reflow되는지 확인한다. 표·코드처럼 2차원 배치가 필수인 콘텐츠는 예외 근거를 따로 기록한다.
- WCAG 2.2 A·AA 자동 진단과 수동 대비 확인을 함께 수행한다. 자동 진단만으로 전체 적합성을 선언하지 않는다.
- drag-only 상호작용, 반복 도움말, 반복 입력, 로컬 인지 기능 검사의 유무를 확인하고 해당 없음 또는 통과 근거를 남긴다.

## Risks

- 날짜 helper 적용 대상 일부가 누락되면 hydration 오류가 route별로 남는다. 공개 게시일 사용처 검색과 테스트를 함께 수행한다.
- 페이지네이션 href builder가 `sortPreset`을 누락하면 URL의 선택 preset 표시 상태가 사라질 수 있다.
- 전역 anchor 스타일을 바꾸면 범위가 커지므로 푸터와 해당 route-local interactive target만 수정한다.
- 외부 Google 인증 제공자 화면을 확인하지 않고 블로그 전체가 WCAG 2.2 AA를 충족한다고 확대 해석할 수 없다.

## Unresolved Questions

- 제품 질문은 없다.
- 인증 후 관리자 화면과 외부 Google 인증 제공자 화면의 WCAG 2.2 AA 적합성은 이번 SEO 활성 변경에서 미확인이다.

## References

- [날짜 인터뷰](../01_interview/date-timezone-hydration.md)
- [페이지네이션 인터뷰](../01_interview/crawlable-pagination.md)
- [링크 이름 인터뷰](../01_interview/descriptive-link-labels.md)
- [접근성 인터뷰](../01_interview/accessibility-visual-rules.md)
- [W3C WCAG 2.2 변경 사항](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [W3C Target Size (Minimum) 이해 문서](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
