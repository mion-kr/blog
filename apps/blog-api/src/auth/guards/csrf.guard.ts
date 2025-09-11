import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * CSRF 보호 가드
 * 
 * 요구사항:
 * - POST, PUT, DELETE 요청에 대해 CSRF 토큰 검증
 * - X-CSRF-Token 헤더 또는 _csrf 필드에서 토큰 확인
 * - 프로덕션 환경에서는 엄격한 검증 적용
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // GET, HEAD, OPTIONS 요청은 CSRF 검증 생략
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // 개발 환경에서는 CSRF 검증 생략 (선택적)
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    // CSRF 토큰 추출
    const csrfToken = this.extractCsrfToken(request);

    if (!csrfToken) {
      throw new ForbiddenException('CSRF token is required');
    }

    // 실제 프로덕션에서는 토큰 검증 로직 구현 필요
    // 현재는 토큰 존재 여부만 확인
    return true;
  }

  /**
   * 요청에서 CSRF 토큰을 추출합니다.
   * 
   * @param request Express 요청 객체
   * @returns CSRF 토큰 문자열 또는 null
   */
  private extractCsrfToken(request: any): string | null {
    // X-CSRF-Token 헤더에서 토큰 확인
    const headerToken = request.headers['x-csrf-token'];
    if (headerToken) {
      return headerToken;
    }

    // 요청 본문의 _csrf 필드에서 토큰 확인
    const bodyToken = request.body?._csrf;
    if (bodyToken) {
      return bodyToken;
    }

    return null;
  }
}