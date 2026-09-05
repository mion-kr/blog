import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

@Injectable()
export class ServerCallerGuard implements CanActivate {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;
  private jwksIssuer?: string;

  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const oidc = request.headers['x-mion-caller-oidc'];

    // OIDC가 전달되면 검증 실패를 개발용 인증으로 우회하지 않습니다.
    if (oidc !== undefined) {
      if (typeof oidc !== 'string' || !oidc) {
        throw new UnauthorizedException(
          'Server caller authentication required',
        );
      }
      await this.verifyOidc(oidc);
      return true;
    }

    const environment = this.configService.get<string>('NODE_ENV');
    const vercel = this.configService.get<string>('VERCEL');
    const localSecret = this.configService.get<string>('BLOG_API_LOCAL_SECRET');
    const localHeader = request.headers['x-mion-local-caller'];
    if (
      (environment === 'development' || environment === 'test') &&
      vercel === undefined &&
      localSecret?.trim() &&
      typeof localHeader === 'string'
    ) {
      const expected = Buffer.from(localSecret);
      const received = Buffer.from(localHeader);
      if (
        expected.length === received.length &&
        timingSafeEqual(expected, received)
      ) {
        return true;
      }
    }

    throw new UnauthorizedException('Server caller authentication required');
  }

  private async verifyOidc(token: string): Promise<void> {
    const issuer = this.configService.get<string>('BLOG_API_CALLER_ISSUER');
    const audience = this.configService.get<string>('BLOG_API_CALLER_AUDIENCE');
    const subject = this.configService.get<string>('BLOG_API_CALLER_SUBJECT');

    try {
      if (
        !issuer ||
        !/^https:\/\/oidc\.vercel\.com(?:\/[a-zA-Z0-9_-]+)?$/.test(issuer) ||
        !audience?.trim() ||
        !subject?.trim()
      ) {
        throw new Error('Caller configuration is missing or invalid');
      }

      if (!this.jwks || this.jwksIssuer !== issuer) {
        // 팀 issuer의 경로를 유지해야 해당 팀의 공개 키를 조회합니다.
        this.jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks`));
        this.jwksIssuer = issuer;
      }

      await jwtVerify(token, this.jwks, {
        algorithms: ['RS256'],
        issuer,
        audience,
        subject,
        requiredClaims: ['iss', 'aud', 'sub', 'exp', 'iat'],
      });
    } catch {
      // 토큰과 외부 검증 오류를 응답이나 로그에 노출하지 않습니다.
      throw new UnauthorizedException('Server caller authentication required');
    }
  }
}
