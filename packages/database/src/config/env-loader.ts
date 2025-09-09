import { config } from 'dotenv';
import { resolve, join, dirname } from 'node:path';
import { existsSync } from 'node:fs';

/**
 * 현재 실행 컨텍스트에서 앱 이름을 자동으로 감지합니다.
 * @returns 감지된 앱 이름 또는 null
 */
function detectCurrentApp(): string | null {
  const cwd = process.cwd();
  
  // apps/blog-api, apps/blog-web 패턴 매칭
  const appMatch = cwd.match(/\/apps\/([^\/]+)/);
  if (appMatch && appMatch[1]) {
    return appMatch[1];
  }
  
  // package.json의 name 필드에서 추출 시도
  try {
    const packageJsonPath = join(cwd, 'package.json');
    if (existsSync(packageJsonPath)) {
      const fs = require('fs');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const name = packageJson.name;
      if (name && name.includes('/')) {
        const parts = name.split('/');
        const lastPart = parts[parts.length - 1];
        // blog-api, blog-web 같은 패턴 확인
        if (lastPart && lastPart.includes('blog-')) {
          return lastPart;
        }
      }
    }
  } catch (error) {
    // package.json 읽기 실패는 무시
  }
  
  return null;
}

/**
 * 모노레포의 루트 디렉토리를 찾습니다.
 * @param startPath 시작 경로
 * @returns 모노레포 루트 경로
 */
function findMonorepoRoot(startPath: string = process.cwd()): string {
  let currentPath = resolve(startPath);
  
  while (currentPath !== dirname(currentPath)) {
    // turbo.json이나 pnpm-workspace.yaml 존재 확인
    const turboConfigPath = join(currentPath, 'turbo.json');
    const pnpmWorkspacePath = join(currentPath, 'pnpm-workspace.yaml');
    
    if (existsSync(turboConfigPath) || existsSync(pnpmWorkspacePath)) {
      return currentPath;
    }
    
    currentPath = dirname(currentPath);
  }
  
  // 루트를 찾지 못한 경우 현재 작업 디렉토리 반환
  return process.cwd();
}

/**
 * 다층 환경변수 로딩을 수행합니다.
 * 우선순위: 1) 현재 앱별 .env 2) 루트 .env 3) 시스템 환경변수
 */
export function loadEnvironmentVariables(): void {
  const monorepoRoot = findMonorepoRoot();
  const currentApp = detectCurrentApp();
  
  const envPaths: string[] = [];
  
  // 1. 현재 앱의 .env 파일 (최고 우선순위)
  if (currentApp) {
    const appEnvPath = join(monorepoRoot, 'apps', currentApp, '.env');
    if (existsSync(appEnvPath)) {
      envPaths.push(appEnvPath);
    }
  }
  
  // 2. 모노레포 루트의 .env 파일
  const rootEnvPath = join(monorepoRoot, '.env');
  if (existsSync(rootEnvPath)) {
    envPaths.push(rootEnvPath);
  }
  
  // 3. 하드코딩된 blog-api 경로 (하위 호환성)
  const legacyEnvPath = join(monorepoRoot, 'apps', 'blog-api', '.env');
  if (existsSync(legacyEnvPath) && !envPaths.includes(legacyEnvPath)) {
    envPaths.push(legacyEnvPath);
  }
  
  // 환경변수 로딩 (역순으로 로딩하여 우선순위 확보)
  envPaths.reverse().forEach(path => {
    try {
      config({ path, override: false });
    } catch (error) {
      // 개별 파일 로딩 실패는 무시하고 계속 진행
      console.warn(`Warning: Failed to load environment variables from ${path}`);
    }
  });
  
  // 디버그 정보 출력 (개발 환경에서만)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[env-loader] Loaded environment variables from:`, envPaths.reverse());
    console.log(`[env-loader] Current app detected:`, currentApp || 'none');
    console.log(`[env-loader] Monorepo root:`, monorepoRoot);
  }
}

/**
 * 필수 환경변수가 설정되어 있는지 검증합니다.
 * @param requiredVars 필수 환경변수 목록
 * @throws Error 필수 환경변수가 누락된 경우
 */
export function validateRequiredEnvironmentVariables(requiredVars: string[]): void {
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

/**
 * 환경변수를 안전하게 가져옵니다.
 * @param key 환경변수 키
 * @param defaultValue 기본값
 * @returns 환경변수 값 또는 기본값
 */
export function getEnvironmentVariable(key: string, defaultValue?: string): string | undefined {
  return process.env[key] ?? defaultValue;
}