# 모바일 홈 LCP 검증

- 검증일: 2026-08-30 (Asia/Seoul)
- 기준 HEAD: `73d5dec01662af39c498ef0904db925710599536`
- 검증 대상: 위 HEAD에 현재 작업 트리의 SEO 변경을 더한 상태(미커밋)
- 앱: Next.js `16.3.3` Webpack production build
- 브라우저 도구: agent-browser `0.34.0`, Chrome for Testing `152.0.7977.54`
- 대상: `http://127.0.0.1:3200/`
- viewport: 390×844, DPR 1
- 조건: 서로 다른 새 브라우저 세션, 로컬 서버, 별도 네트워크·CPU throttling 없음

## 결과

| 실행 | LCP | CLS | LCP element |
| --- | ---: | ---: | --- |
| 1 | 364ms | 0 | `div`, size 117706 |
| 2 | 116ms | 0 | `div`, size 117706 |
| 3 | 124ms | 0 | `div`, size 117706 |

- 정렬값: 116ms, 124ms, 364ms
- 중앙값: 124ms
- 로컬 production 참고값 기준 2500ms 이하
- 측정 수집 실패 1회: LCP·FCP가 `null`이어서 유효 실행에서 제외

## 판단

- 세 유효 실행 모두 2500ms 이하이고 콘솔 오류·layout shift가 없어 추가 성능 코드를 추정 변경하지 않았다.
- 핵심 네온 레이아웃과 콘텐츠를 유지했다.
- 이 결과는 Lighthouse Mobile simulated throttling, PageSpeed Insights 또는 CrUX 현장 데이터가 아니다.

## 미확인

- 배포된 운영 URL의 Lighthouse Mobile LCP 2.5초 이하 여부
- 실제 CrUX LCP·INP·CLS 75번째 백분위수
- 운영 cover image·서버·네트워크 지연의 영향
