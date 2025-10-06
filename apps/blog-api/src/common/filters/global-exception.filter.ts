import {
  Catch,
  ArgumentsHost,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  ConflictException,
  UnprocessableEntityException,
  Injectable,
} from '@nestjs/common';
import { Response, Request } from 'express';
import {
  ErrorResponse,
  ValidationError as ApiValidationError,
} from '../interfaces/api-response.interface';
import { ErrorCode } from '../enums/error-codes.enum';
import {
  ErrorMessages,
  DevelopmentErrorMessages,
} from '../constants/error-messages.constant';
import { JwtErrorParser } from '../parsers/jwt-error.parser';
import { DatabaseErrorParser } from '../parsers/database-error.parser';
import { ErrorLogger } from '../utils/error-logger.util';

/**
 * 전역 예외 처리 필터
 * ResponseInterceptor와 동일한 응답 구조를 유지하면서 에러 응답을 처리합니다.
 * Single Responsibility: 예외 필터링과 응답 생성만 담당
 */
@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly isDevelopment = process.env.NODE_ENV === 'development';

  constructor(
    private readonly jwtErrorParser: JwtErrorParser,
    private readonly databaseErrorParser: DatabaseErrorParser,
    private readonly errorLogger: ErrorLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);
    const statusCode = errorResponse.error?.statusCode ?? 500;

    // 로깅 (ErrorLogger 유틸리티에 위임)
    this.errorLogger.logError(exception, request, errorResponse);

    response.status(statusCode).json(errorResponse);
  }

  /**
   * 에러 응답 객체 생성
   */
  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;

    if (exception instanceof HttpException) {
      return this.handleHttpException(exception, path, timestamp);
    }

    if (exception instanceof Error) {
      return this.handleGenericError(exception, path, timestamp);
    }

    // 알 수 없는 에러
    return this.createErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR,
      '알 수 없는 오류가 발생했습니다.',
      path,
      timestamp,
      this.isDevelopment ? { error: String(exception) } : undefined,
    );
  }

  /**
   * HTTP 예외 처리
   */
  private handleHttpException(
    exception: HttpException,
    path: string,
    timestamp: string,
  ): ErrorResponse {
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // NestJS 기본 예외들 처리
    const errorCode = this.mapHttpStatusToErrorCode(statusCode, exception);
    let userMessage = this.getUserFriendlyMessage(errorCode);
    let details: Record<string, unknown> | undefined = undefined;

    // ValidationPipe 에러 처리
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const response = exceptionResponse as Record<string, unknown>;
      const validationErrors = (response.validation ??
        response.validationErrors) as ApiValidationError[] | undefined;

      if (Array.isArray(response.message)) {
        // class-validator 유효성 검사 에러
        userMessage = '입력 데이터가 올바르지 않습니다.';
        details = {
          validation: response.message,
        };
      } else if (Array.isArray(validationErrors)) {
        userMessage =
          typeof response.message === 'string'
            ? response.message
            : '입력 데이터가 올바르지 않습니다.';
        details = {
          validation: validationErrors,
        };
      } else if (typeof response.message === 'string') {
        userMessage = response.message;
      }
    }

    return this.createErrorResponse(
      errorCode,
      statusCode,
      userMessage,
      path,
      timestamp,
      details,
    );
  }

  /**
   * 일반 에러 처리
   */
  private handleGenericError(
    error: Error,
    path: string,
    timestamp: string,
  ): ErrorResponse {
    const errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
    const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

    // JWT 에러 처리 (JwtErrorParser에 위임)
    if (this.jwtErrorParser.isJwtError(error)) {
      const { code, message } = this.jwtErrorParser.parseJwtError(error);
      return this.createErrorResponse(
        code,
        HttpStatus.UNAUTHORIZED,
        message,
        path,
        timestamp,
        this.isDevelopment
          ? { jwtErrorType: error.constructor.name }
          : undefined,
      );
    }

    // 데이터베이스 관련 에러 감지 (DatabaseErrorParser에 위임)
    if (this.databaseErrorParser.isDatabaseError(error)) {
      const { code, statusCode: dbStatusCode } =
        this.databaseErrorParser.parseDatabaseError(error);
      return this.createErrorResponse(
        code,
        dbStatusCode,
        this.getUserFriendlyMessage(code),
        path,
        timestamp,
        this.isDevelopment
          ? this.databaseErrorParser.getDatabaseErrorDetails(error)
          : undefined,
      );
    }

    return this.createErrorResponse(
      errorCode,
      statusCode,
      this.getUserFriendlyMessage(errorCode),
      path,
      timestamp,
      this.isDevelopment ? { originalMessage: error.message } : undefined,
    );
  }

  /**
   * HTTP 상태 코드를 ErrorCode로 매핑
   */
  private mapHttpStatusToErrorCode(
    statusCode: number,
    exception: HttpException,
  ): ErrorCode {
    if (exception instanceof BadRequestException)
      return ErrorCode.VALIDATION_FAILED;
    if (exception instanceof UnauthorizedException)
      return ErrorCode.UNAUTHORIZED;
    if (exception instanceof ForbiddenException) return ErrorCode.FORBIDDEN;
    if (exception instanceof NotFoundException) return ErrorCode.NOT_FOUND;
    if (exception instanceof ConflictException) return ErrorCode.CONFLICT;
    if (exception instanceof UnprocessableEntityException)
      return ErrorCode.UNPROCESSABLE_ENTITY;

    switch (statusCode) {
      case 400:
        return ErrorCode.BAD_REQUEST;
      case 401:
        return ErrorCode.UNAUTHORIZED;
      case 403:
        return ErrorCode.FORBIDDEN;
      case 404:
        return ErrorCode.NOT_FOUND;
      case 409:
        return ErrorCode.CONFLICT;
      case 422:
        return ErrorCode.UNPROCESSABLE_ENTITY;
      default:
        return ErrorCode.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * 사용자 친화적 메시지 가져오기
   */
  private getUserFriendlyMessage(errorCode: ErrorCode): string {
    const messages = this.isDevelopment
      ? DevelopmentErrorMessages
      : ErrorMessages;
    return messages[errorCode] || messages[ErrorCode.INTERNAL_SERVER_ERROR];
  }

  /**
   * 표준 에러 응답 객체 생성
   */
  private createErrorResponse(
    code: ErrorCode,
    statusCode: number,
    userMessage: string,
    path: string,
    timestamp: string,
    details?: Record<string, unknown>,
  ): ErrorResponse {
    return {
      success: false,
      message: userMessage,
      error: {
        code,
        statusCode,
        ...(this.isDevelopment && details ? { details } : {}),
      },
      timestamp,
      path,
    };
  }
}
