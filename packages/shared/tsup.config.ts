import { defineConfig } from 'tsup';

export default defineConfig({
  // 3개의 엔트리 포인트: 메인, types, utils
  entry: {
    index: './src/index.ts',
    'types/index': './src/types/index.ts',
    'utils/index': './src/utils/index.ts'
  },
  // ESM + CJS 듀얼 포맷 지원
  format: ['esm', 'cjs'],
  // TypeScript 타입 정의 파일 생성
  dts: true,
  // 코드 스플리팅 활성화 (트리 쉐이킹 최적화)
  splitting: true,
  // 소스맵 생성 (디버깅 지원)
  sourcemap: true,
  // 빌드 전 dist 폴더 정리
  clean: true,
  // 외부 의존성 번들링 제외
  external: [],
  // 최소화 비활성화 (라이브러리 패키지이므로)
  minify: false,
  // Node.js 환경 타겟
  target: 'es2020',
  // CommonJS와 ES모듈 간 호환성
  platform: 'node'
});