import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { ErrorResponse } from '../interfaces/api-response.interface';

/**
 * 에러 로깅을 전담하는 유틸리티 클래스
 * Single Responsibility: 에러 로깅만 담당
 */
@Injectable()
export class ErrorLogger {
  constructor(
    @InjectPinoLogger(ErrorLogger.name)
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext('ExceptionFilter');
  }

  /**
   * 에러를 로깅합니다.
   * 500번대 에러는 ERROR 레벨로, 그 외는 WARN 레벨로 로깅합니다.
   */
  logError(
    exception: unknown,
    request: Request,
    errorResponse: ErrorResponse,
  ): void {
    const { method, url } = request;
    const statusCode = errorResponse.error?.statusCode ?? 500;
    const errorCode = errorResponse.error?.code ?? 'UNKNOWN';

    const logMessage = `${method} ${url} - ${statusCode} ${errorCode}`;
    const logContext = this.buildLogContext(request, errorResponse);

    if (statusCode >= 500) {
      // 서버 에러는 ERROR 레벨로 로깅
      this.logger.error(
        {
          ...logContext,
          exception: this.getExceptionDetails(exception),
        },
        logMessage,
      );
    } else {
      // 클라이언트 에러는 WARN 레벨로 로깅
      this.logger.warn(logContext, logMessage);
    }
  }

  /**
   * 로그 컨텍스트 정보 생성
   */
  private buildLogContext(
    request: Request,
    errorResponse: ErrorResponse,
  ): Record<string, unknown> {
    const { method, url, ip } = request;
    const statusCode = errorResponse.error?.statusCode ?? 500;
    const errorCode = errorResponse.error?.code ?? 'UNKNOWN';

    return {
      method,
      url,
      ip,
      statusCode,
      errorCode,
      userAgent: request.get('User-Agent'),
      userId: (request as any).user?.id,
      timestamp: errorResponse.timestamp,
    };
  }

  /**
   * 예외 상세 정보 추출
   */
  private getExceptionDetails(exception: unknown): unknown {
    if (exception instanceof Error) {
      return {
        name: exception.constructor.name,
        message: exception.message,
        stack: exception.stack,
      };
    }
    return String(exception);
  }
}
