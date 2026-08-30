# 모바일 홈 성능 설계

## Change Context

- 불변 작업 식별자: `20260829_검색최적화개선`
- 기능 식별 키: `seo`
- 기준 명세: `docs/specs/seo/spec.md`
- 활성 변경 명세 델타: `docs/changes/20260829_검색최적화개선/specs/seo/spec.md`
- 기준 명세 조회 상태: 없음
- 변경 유형: 수정
- 기준 상태 → 제안 변경 → 수용 기준: 모바일 홈 Lighthouse LCP 3.3초 → 측정 기반 최소 최적화 → 동일 조건 LCP 2.5초 이하

## 결론

- 현재 측정 근거가 있는 운영 홈 모바일 LCP를 1차 구현·검증 대상으로 한다. 다른 공개 route의 향후 목표를 제외하거나 통과로 간주하지 않는다.
- Lighthouse 모바일 LCP 2.5초 이하를 수용 기준으로 사용하되 종합 성능 점수 목표는 두지 않는다.
- 핵심 네온 레이아웃과 콘텐츠는 유지하고, trace로 확인된 LCP 리소스·렌더 차단·미사용 자원·비핵심 애니메이션만 최소 조정한다.
- CrUX 현장 데이터가 생긴 뒤 LCP·INP·CLS를 별도 재평가한다.

## 배경

- 2026-08-29 PageSpeed Insights 실험실 결과는 모바일 성능 87, LCP 3.3초, TBT 50ms, CLS 0이다.
- 모바일 진단에는 렌더 차단 약 310ms, 미사용 CSS 약 26KiB, 미사용 JavaScript 약 50KiB, legacy JavaScript 약 12KiB, 긴 main-thread task 2개, 비합성 애니메이션 1개가 포함됐다.
- 데스크톱은 성능 100, LCP 0.7초였으며 모바일·데스크톱 CrUX 현장 데이터는 모두 부족하다.
- 홈 추천 이미지는 `next/image`와 `priority`를 사용하지만 현재 LCP element·전송 크기·cache header의 세부 원인은 문서 단계에서 확정하지 않았다.

## Optimization Flow

1. 동일한 모바일 Lighthouse 조건으로 기준값과 LCP element, network waterfall, main-thread trace를 기록한다.
2. LCP가 추천 이미지이면 responsive `sizes`, 실제 표시 크기, Next image optimization 응답, 원격 이미지 latency·cache를 확인한다.
3. 렌더 차단 CSS와 미사용 CSS/JS는 route별 coverage와 bundle 결과로 소유 파일을 확인한 뒤 제거·지연한다.
4. infinite animation과 비합성 효과가 trace에 영향을 주는 경우에만 비핵심 효과를 축소하고 `prefers-reduced-motion` 경로를 보강한다.
5. 각 변경 후 같은 조건에서 재측정하고, LCP 개선이 없거나 회귀가 있으면 해당 변경을 되돌린다.

## Constraints

- 홈의 핵심 네온 grid, 추천 글, 최근 글, 검색 진입 콘텐츠는 제거하지 않는다.
- Mantine 전역 CSS를 미사용 추정만으로 제거하지 않는다. 앱 전체 사용처와 회귀를 먼저 확인한다.
- 운영 PageSpeed 단일 실행을 CrUX 통과로 표현하지 않는다.
- 성능 측정을 위해 새로운 운영 추적 스크립트·외부 서비스·의존성을 자동 추가하지 않는다.

## Validation

- 대상 URL은 홈 `/`로 고정하고 같은 커밋의 production build 또는 동일 배포 버전을 측정한다. Lighthouse navigation mode·Mobile preset·cold cache·simulated throttling을 사용하고 Lighthouse·Chrome 버전과 보고서에 표시된 네트워크·CPU 설정을 기록한다.
- 유효 실행 3회의 LCP 값을 정렬해 가운데 값을 중앙값으로 사용한다. 로컬 production Web Vitals 결과는 `03_implement/evidence/mobile-lcp.md`에 남기고, Lighthouse·PageSpeed는 배포 후 별도 기록한다.
- 사용자가 확정한 1차 수용 기준은 홈 LCP 중앙값 2.5초 이하뿐이다. CLS와 TBT는 최적화가 다른 품질을 훼손하지 않았는지 보는 보조 회귀 지표이며 별도 제품 합격 기준으로 올리지 않는다.
- 390×844 모바일에서 핵심 콘텐츠·네온 디자인·이미지 비율·상호작용을 시각 확인한다.
- 데스크톱 성능과 접근성·SEO category가 기존 결과에서 악화되지 않는지 보조 확인한다.
- 운영 배포 후 PageSpeed와 실제 브라우저를 다시 확인하되, CrUX 데이터 부족은 미확인으로 보고한다.

## Risks

- Lighthouse는 네트워크·서버 변동성이 있으므로 단일 실행만으로 완료 판정하면 오판할 수 있다. 동일 조건 반복 측정과 중앙값을 사용한다.
- 원격 cover image latency가 주원인이면 프론트 코드만으로 목표 달성이 제한될 수 있다. 이 경우 이미지 저장·전송 구조 변경은 별도 범위로 제안한다.
- 애니메이션 제거만으로 LCP가 개선된다고 가정하지 않는다.

## Unresolved Questions

- 제품 질문은 없다.
- 홈 외 공개 route는 이번 기준값과 직접 비교할 근거가 없어 1차 수용 기준에 포함하지 않는다. 후속 측정 없이 다른 route의 상태를 추정하지 않는다.
- 실제 CrUX 현장 데이터가 생기는 시점은 미확인이다.

## References

- [모바일 성능 인터뷰](../01_interview/mobile-performance-targets.md)
- [Google 페이지 경험 기준](https://developers.google.com/search/docs/appearance/page-experience)
- [Web Vitals](https://web.dev/articles/vitals)
