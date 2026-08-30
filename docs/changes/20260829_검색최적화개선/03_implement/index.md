# 검색 최적화 개선 구현 문서

## 작업

- 작업 식별자: `20260829_검색최적화개선`
- 기능 식별 키: `seo`
- 기준 명세: `docs/specs/seo/spec.md`
- 변경 명세: `docs/changes/20260829_검색최적화개선/specs/seo/spec.md`

## 문서

| 문서 | 목적 |
| --- | --- |
| [implementation-plan.md](implementation-plan.md) | 10개 SEO 개선의 순차 구현, 파일별 변경, 검증과 롤백 계획 |
| [evidence/http-status.md](evidence/http-status.md) | production HTTP 상태·metadata·구조화 데이터 검증 결과 |
| [evidence/mobile-lcp.md](evidence/mobile-lcp.md) | 로컬 모바일 LCP 참고 측정과 운영 미확인 범위 |
| [evidence/accessibility.md](evidence/accessibility.md) | WCAG 2.2 AA 영향 범위의 route별 자동·수동 검사와 미확인 범위 |

## 대상 영역

- 백엔드: 코드·API 계약 변경 없음, 기존 pagination meta만 사용
- 데이터베이스: 스키마·데이터·migration 변경 없음
- 앱·프론트엔드: `apps/blog-web` route metadata, 목록 상태, 날짜 렌더링, 정적 이미지, 링크·스타일, 홈 성능
- 문서: 활성 변경 문서만 유지하며 기준 명세 반영은 구현 완료 후 Mion 6에서 수행

## 확인 근거

| 출처 | 링크 | 관련 이유 |
| --- | --- | --- |
| 인터뷰 | [01_interview/index.md](../01_interview/index.md) | 사용자 결정과 자답된 기술 세부사항 |
| 설계 | [02_design/index.md](../02_design/index.md) | route·자산·렌더링·성능 설계 |
| 변경 명세 | [specs/seo/spec.md](../specs/seo/spec.md) | 관찰 가능한 변경 계약과 수용 기준 |
| 프론트엔드 기준 | [Testing And Change Management](../../../frontend/testing-and-change-management.md) | 테스트·검증·변경 관리 기준 |
| 현재 앱 | [`apps/blog-web`](../../../../apps/blog-web) | 실제 구현·테스트 대상 |

기준 코드는 `mion-kr/스킬활용한-리펙토링`, 커밋 `73d5dec01662af39c498ef0904db925710599536`, Next.js `16.3.3`이다. 관련 Linear 이슈와 배포 커밋 일치 여부는 미확인이다.

## 남은 질문

- 제품 결정이 필요한 질문은 없다.
- 실제 CrUX 현장 데이터는 없으며 운영 CWV 통과 여부는 구현·배포 후에도 데이터가 쌓이기 전까지 미확인으로 남는다.
- OG 이미지의 세부 구도·색상·문구는 확정된 시각 계약 안에서 생성 후 시각 QA로 선택한다.

## 실행 결과

- [x] 1. Node 기반 production HTTP 검증용 mock을 유효 page와 범위 초과 page를 구분하도록 작성했다.
- [x] 2. 로그인 metadata 격리와 목록 범위 초과 404를 구현·검증했다.
- [x] 3. KST 날짜 helper와 `BlogPosting.author.url`을 구현·검증했다.
- [x] 4. 두 공유 이미지를 생성한 뒤 route metadata와 함께 구현·검증했다.
- [x] 5. query 보존 페이지네이션 링크를 구현·검증했다.
- [x] 6. WCAG 2.2 AA 변경 영향 범위의 6개 route를 1440·390·320px에서 감사했다. 44×44 일괄 적용 없이 실제 target·대비·초점 가림·Reflow·ARIA 실패만 수정했고 자동 위반 0건, route별 수동 근거와 외부 미확인 범위를 기록했다.
- [ ] 7. 로컬 production 모바일 홈 참고 측정은 3회 중앙값 124ms였고 추정 성능 변경은 하지 않았다. 운영 Lighthouse Mobile 동일 조건 3회 측정을 실행하지 않아 LCP 수용 기준은 미완료다.
- [x] 8. 로컬 타입·린트·production build·HTTP와 실제 route 브라우저 확인을 완료했다. Playwright E2E 구성은 사용자 지시에 따라 제거했다.

Mion 5의 승인된 로컬 구현·WCAG 2.2 변경 영향 수용 검증·SEO production HTTP 검증은 완료됐다. 배포 후 Lighthouse Mobile, PageSpeed, CrUX 현장 데이터, 공개 글 9개의 Rich Results Test는 미실행 상태이므로 운영 SEO 완료나 Mion 6 아카이브로 판단하지 않는다.
