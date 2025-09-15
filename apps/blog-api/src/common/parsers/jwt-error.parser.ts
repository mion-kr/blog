import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../enums/error-codes.enum';
import { ErrorMessages } from '../constants/error-messages.constant';

/**
 * JWT 관련 에러를 파싱하는 클래스
 * Single Responsibility: JWT 에러 감지 및 파싱만 담당
 */
@Injectable()
export class JwtErrorParser {
  /**
   * JWT 에러인지 확인
   */
  isJwtError(error: Error): boolean {
    const jwtErrorNames = ['TokenExpiredError', 'JsonWebTokenError', 'NotBeforeError'];
    return jwtErrorNames.includes(error.constructor.name);
  }

  /**
   * JWT 에러를 파싱하여 적절한 에러 코드와 메시지 반환
   */
  parseJwtError(error: Error): { code: ErrorCode; message: string } {
    switch (error.constructor.name) {
      case 'TokenExpiredError':
        return {
          code: ErrorCode.JWT_TOKEN_EXPIRED,
          message: ErrorMessages[ErrorCode.JWT_TOKEN_EXPIRED]
        };
      case 'JsonWebTokenError':
        return {
          code: ErrorCode.INVALID_JWT_TOKEN,
          message: ErrorMessages[ErrorCode.INVALID_JWT_TOKEN]
        };
      case 'NotBeforeError':
        return {
          code: ErrorCode.INVALID_JWT_TOKEN,
          message: ErrorMessages[ErrorCode.INVALID_JWT_TOKEN]
        };
      default:
        return {
          code: ErrorCode.INVALID_JWT_TOKEN,
          message: ErrorMessages[ErrorCode.INVALID_JWT_TOKEN]
        };
    }
  }
}