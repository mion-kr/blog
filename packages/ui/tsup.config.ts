import { defineConfig } from "tsup";

export default defineConfig({
  // 개별 컴포넌트를 엔트리 포인트로 설정
  entry: {
    button: "src/button.tsx",
    card: "src/card.tsx",
    code: "src/code.tsx",
  },
  
  // ESM과 CJS 듀얼 포맷 지원
  format: ["esm", "cjs"],
  
  // TypeScript declaration 파일 생성
  dts: true,
  
  // 코드 분할 비활성화 (개별 컴포넌트별로 빌드)
  splitting: false,
  
  // 소스맵 생성 (개발 시 유용)
  sourcemap: true,
  
  // 빌드 결과 정리
  clean: true,
  
  // React 관련 외부 의존성 처리
  external: ["react", "react-dom"],
  
  // JSX 처리 설정
  esbuildOptions(options) {
    options.jsx = "automatic";
    options.jsxImportSource = "react";
  },
  
  // 출력 디렉토리
  outDir: "dist",
  
  // 번들링 비활성화 (개별 컴포넌트로 유지)
  bundle: true,
  
  // minify 설정 (프로덕션 빌드 최적화)
  minify: false,
  
  // target 설정 (Next.js와 호환)
  target: "es2020",
});