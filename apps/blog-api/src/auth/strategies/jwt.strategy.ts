import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy as CustomStrategy } from 'passport-custom';
import type { Request } from 'express';
import { jwtDecrypt, type JWTPayload } from 'jose';
import hkdf from '@panva/hkdf';

/**
 * JWT 페이로드 인터페이스
 * NextAuth.js JWE 토큰에서 복호화된 데이터 구조
 */
export interface JwtPayload {
  sub: string; // 사용자 ID
  email: string; // 사용자 이메일
  name?: string; // 사용자 이름 (선택)
  role?: 'ADMIN' | 'USER'; // 사용자 역할
  iat?: number; // 토큰 발급 시간
  exp?: number; // 토큰 만료 시간
  [key: string]: unknown; // NextAuth.js가 추가하는 기타 필드
}

/**
 * NextAuth.js JWE 토큰을 복호화하는 Passport 전략
 *
 * NextAuth.js는 기본적으로 JWT를 JWE(JSON Web Encryption)로 암호화하여 저장합니다.
 * 이 전략은 프론트엔드에서 전송된 JWE 토큰을 복호화하고 검증합니다.
 *
 * 주요 특징:
 * - NextAuth.js와 동일한 HKDF 키 유도 방식 사용
 * - Bearer 토큰 형식의 Authorization 헤더에서 JWE 추출
 * - 토큰 만료 시간 검증
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(CustomStrategy, 'jwt') {
  private readonly encryptionKeyPromise: Promise<Uint8Array>;

  constructor(private readonly configService: ConfigService) {
    super();

    // NEXTAUTH_SECRET 또는 JWT_SECRET 사용 (동일한 값이어야 함)
    const secret =
      configService.get<string>('NEXTAUTH_SECRET') ??
      configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('NEXTAUTH_SECRET is not defined');
    }

    // NextAuth.js와 동일한 방식으로 암호화 키 생성
    this.encryptionKeyPromise = this.deriveEncryptionKey(secret);
  }

  /**
   * NextAuth.js와 동일한 방식으로 암호화 키 생성
   *
   * HKDF(HMAC-based Key Derivation Function)를 사용하여
   * NEXTAUTH_SECRET으로부터 실제 암호화 키를 유도합니다.
   *
   * @param secret - NEXTAUTH_SECRET 값
   * @returns 32바이트 암호화 키
   */
  private async deriveEncryptionKey(secret: string | Buffer) {
    return await hkdf(
      'sha256', // HMAC 알고리즘
      secret, // 입력 키 자료 (IKM)
      '', // Salt (빈 문자열)
      'NextAuth.js Generated Encryption Key', // Info (NextAuth.js 표준)
      32 // 키 길이 (256비트)
    );
  }

  /**
   * HTTP 요청에서 Bearer 토큰 추출
   *
   * Authorization 헤더에서 "Bearer {token}" 형식의 토큰을 추출합니다.
   *
   * @param request - Express Request 객체
   * @returns JWE 토큰 문자열
   * @throws UnauthorizedException - 헤더가 없거나 형식이 잘못된 경우
   */
  private ensureBearerToken(request: Request): string {
    const header = request.headers['authorization'] ?? request.headers['Authorization'];
    if (!header || Array.isArray(header)) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const [scheme, token] = header.split(' ');
    if (!token || scheme?.toLowerCase() !== 'bearer') {
      throw new UnauthorizedException('Authorization header must be a Bearer token');
    }

    return token.trim();
  }

  /**
   * 토큰 만료 시간 검증
   *
   * JWT의 exp(expiration time) 클레임을 확인하여 토큰이 만료되었는지 검증합니다.
   *
   * @param payload - 복호화된 JWT 페이로드
   * @throws UnauthorizedException - 토큰이 만료된 경우
   */
  private assertNotExpired(payload: JWTPayload) {
    if (!payload.exp) {
      return; // exp 클레임이 없으면 만료 검증 생략
    }

    const expiresAt = Number(payload.exp);
    const now = Math.floor(Date.now() / 1000); // 현재 시간(Unix timestamp)
    if (Number.isFinite(expiresAt) && expiresAt < now) {
      throw new UnauthorizedException('Token has expired');
    }
  }

  /**
   * Passport 전략의 메인 검증 메서드
   *
   * 1. Authorization 헤더에서 JWE 토큰 추출
   * 2. HKDF로 유도한 키로 JWE 복호화
   * 3. 토큰 만료 시간 검증
   * 4. 필수 필드(sub, email) 확인
   * 5. 사용자 정보 반환
   *
   * @param request - Express Request 객체
   * @returns 인증된 사용자 정보
   * @throws UnauthorizedException - 토큰이 유효하지 않은 경우
   */
  async validate(request: Request) {
    // 1. Bearer 토큰 추출
    const token = this.ensureBearerToken(request);
    const secretKey = await this.encryptionKeyPromise;

    // 2. JWE 복호화
    let payload: JWTPayload;
    try {
      const result = await jwtDecrypt(token, secretKey, {
        clockTolerance: 15, // 시계 동기화 오차 허용 (15초)
      });
      payload = result.payload;
    } catch (error) {
      throw new UnauthorizedException('Failed to decrypt session token');
    }

    // 3. 토큰 만료 검증
    this.assertNotExpired(payload);

    // 4. 필수 필드 확인
    const subject = payload.sub as string | undefined;
    const email = (payload.email as string | undefined) ?? undefined;
    if (!subject || !email) {
      throw new UnauthorizedException('Token payload is missing subject or email');
    }

    // 5. 사용자 정보 반환
    const name = (payload.name as string | undefined) ?? email;
    const role = (payload.role as 'ADMIN' | 'USER' | undefined) ?? 'USER';

    return {
      id: subject,
      email,
      name,
      role,
      tokenPayload: payload as JwtPayload, // 원본 페이로드도 포함
    };
  }
}
