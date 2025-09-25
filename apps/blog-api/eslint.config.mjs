// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // 기존 규칙들
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',

      // any 타입 관련 경고들 비활성화
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',

      // await 없는 async 함수 경고 비활성화
      '@typescript-eslint/require-await': 'off',

      // 사용하지 않는 변수 경고 비활성화
      '@typescript-eslint/no-unused-vars': 'off',

      // 바인딩되지 않은 메소드 참조 경고 비활성화 (테스트에서 자주 발생)
      '@typescript-eslint/unbound-method': 'off',

      // Promise 관련 경고들 비활성화
      '@typescript-eslint/no-misused-promises': 'off',

      // 빈 함수 허용
      '@typescript-eslint/no-empty-function': 'off',

      // 사용하지 않는 표현식 경고를 warning으로 변경
      '@typescript-eslint/no-unused-expressions': 'warn',

      // any 타입 관련 추가 경고들
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
    },
  },
);