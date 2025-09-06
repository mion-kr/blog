import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class AdminGuard extends JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // 먼저 JWT 인증 확인
    const isAuthenticated = super.canActivate(context);
    if (!isAuthenticated) return false;

    // 요청 객체에서 사용자 정보 가져오기
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // ADMIN 권한 확인
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}