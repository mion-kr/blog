import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { JwtErrorParser } from './parsers/jwt-error.parser';
import { DatabaseErrorParser } from './parsers/database-error.parser';
import { ErrorLogger } from './utils/error-logger.util';

/**
 * 공통 모듈
 * 전역적으로 사용되는 Provider들을 제공합니다.
 * 명시적 import를 통해 순환 참조를 방지합니다.
 */
@Module({
  providers: [
    // 파서 및 유틸리티 Provider
    JwtErrorParser,
    DatabaseErrorParser,
    ErrorLogger,
    // 전역 인터셉터를 Provider로 등록
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    // 전역 예외 필터를 Provider로 등록
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [
    JwtErrorParser,
    DatabaseErrorParser,
    ErrorLogger,
  ],
})
export class CommonModule {}