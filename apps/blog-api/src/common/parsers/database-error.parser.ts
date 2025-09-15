import { Injectable, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums/error-codes.enum';

/**
 * 데이터베이스 관련 에러를 파싱하는 클래스
 * Single Responsibility: DB 에러 감지 및 파싱만 담당
 */
@Injectable()
export class DatabaseErrorParser {
  /**
   * 데이터베이스 에러인지 확인
   */
  isDatabaseError(error: Error): boolean {
    const hasPostgresCode = (error as any).code && 
      typeof (error as any).code === 'string' && 
      /^\d{5}$/.test((error as any).code);
    
    const message = error.message.toLowerCase();
    const name = error.constructor.name.toLowerCase();
    
    return (
      hasPostgresCode ||
      message.includes('duplicate') ||
      message.includes('unique constraint') ||
      message.includes('foreign key') ||
      message.includes('database') ||
      name.includes('query') ||
      name.includes('database') ||
      name.includes('constraint')
    );
  }

  /**
   * PostgreSQL 에러 코드 기반 에러 파싱
   */
  parseDatabaseError(error: Error): { code: ErrorCode; statusCode: number } {
    const pgCode = (error as any).code;
    
    // PostgreSQL 에러 코드 매핑
    if (pgCode) {
      switch (pgCode) {
        case '23505': // unique_violation
          return {
            code: ErrorCode.UNIQUE_CONSTRAINT_VIOLATION,
            statusCode: HttpStatus.CONFLICT
          };
        case '23503': // foreign_key_violation
          return {
            code: ErrorCode.FOREIGN_KEY_CONSTRAINT_VIOLATION,
            statusCode: HttpStatus.BAD_REQUEST
          };
        case '23514': // check_violation
          return {
            code: ErrorCode.CHECK_CONSTRAINT_VIOLATION,
            statusCode: HttpStatus.BAD_REQUEST
          };
        case '23502': // not_null_violation
          return {
            code: ErrorCode.NOT_NULL_CONSTRAINT_VIOLATION,
            statusCode: HttpStatus.BAD_REQUEST
          };
        default:
          return {
            code: ErrorCode.DATABASE_QUERY_FAILED,
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR
          };
      }
    }

    // 메시지 기반 매핑 (fallback)
    const message = error.message.toLowerCase();
    
    if (message.includes('duplicate') || message.includes('unique')) {
      return {
        code: ErrorCode.UNIQUE_CONSTRAINT_VIOLATION,
        statusCode: HttpStatus.CONFLICT
      };
    }
    if (message.includes('foreign key')) {
      return {
        code: ErrorCode.FOREIGN_KEY_CONSTRAINT_VIOLATION,
        statusCode: HttpStatus.BAD_REQUEST
      };
    }
    if (message.includes('not null')) {
      return {
        code: ErrorCode.NOT_NULL_CONSTRAINT_VIOLATION,
        statusCode: HttpStatus.BAD_REQUEST
      };
    }
    if (message.includes('check')) {
      return {
        code: ErrorCode.CHECK_CONSTRAINT_VIOLATION,
        statusCode: HttpStatus.BAD_REQUEST
      };
    }
    
    return {
      code: ErrorCode.DATABASE_QUERY_FAILED,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR
    };
  }

  /**
   * 개발 환경에서 사용할 데이터베이스 에러 디테일 정보 추출
   */
  getDatabaseErrorDetails(error: Error): Record<string, any> {
    return {
      originalMessage: error.message,
      pgCode: (error as any).code,
      constraint: (error as any).constraint,
      table: (error as any).table
    };
  }
}