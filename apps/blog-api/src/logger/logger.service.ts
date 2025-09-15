import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

/**
 * 로거 서비스 인터페이스
 * Interface Segregation: 필요한 로깅 메서드만 노출
 */
export interface ILoggerService {
  log(message: string, context?: string, data?: Record<string, unknown>): void;
  error(message: string, trace?: string, context?: string, data?: Record<string, unknown>): void;
  warn(message: string, context?: string, data?: Record<string, unknown>): void;
  debug(message: string, context?: string, data?: Record<string, unknown>): void;
  verbose(message: string, context?: string, data?: Record<string, unknown>): void;
  setContext(context: string): void;
}

/**
 * Pino 기반 로거 서비스
 * Single Responsibility: 로깅 기능만 담당
 * Liskov Substitution: NestJS Logger 인터페이스와 호환
 * Dependency Inversion: PinoLogger 추상화에 의존
 */
@Injectable()
export class LoggerService implements ILoggerService {
  constructor(
    @InjectPinoLogger(LoggerService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * 일반 로그 메시지
   */
  log(message: string, context?: string, data?: Record<string, unknown>): void {
    this.logger.info({ context, ...data }, message);
  }

  /**
   * 에러 로그 메시지
   */
  error(
    message: string, 
    trace?: string, 
    context?: string, 
    data?: Record<string, unknown>
  ): void {
    this.logger.error(
      { 
        context, 
        trace, 
        ...data 
      }, 
      message
    );
  }

  /**
   * 경고 로그 메시지
   */
  warn(message: string, context?: string, data?: Record<string, unknown>): void {
    this.logger.warn({ context, ...data }, message);
  }

  /**
   * 디버그 로그 메시지
   */
  debug(message: string, context?: string, data?: Record<string, unknown>): void {
    this.logger.debug({ context, ...data }, message);
  }

  /**
   * 상세 로그 메시지
   */
  verbose(message: string, context?: string, data?: Record<string, unknown>): void {
    this.logger.trace({ context, ...data }, message);
  }

  /**
   * 로거 컨텍스트 설정
   */
  setContext(context: string): void {
    this.logger.setContext(context);
  }

  /**
   * HTTP 요청/응답 로깅용 헬퍼 메서드
   */
  logHttpRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    userId?: string
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    
    this.logger[level]({
      context: 'HTTP',
      method,
      url,
      statusCode,
      duration,
      userId,
    }, `${method} ${url} ${statusCode} - ${duration}ms`);
  }

  /**
   * 비즈니스 이벤트 로깅용 헬퍼 메서드
   */
  logBusinessEvent(
    event: string,
    details: Record<string, unknown>,
    userId?: string
  ): void {
    this.logger.info({
      context: 'Business',
      event,
      userId,
      ...details,
    }, `Business Event: ${event}`);
  }

  /**
   * 성능 메트릭 로깅용 헬퍼 메서드
   */
  logPerformance(
    operation: string,
    duration: number,
    metadata?: Record<string, unknown>
  ): void {
    const level = duration > 3000 ? 'warn' : 'debug';
    
    this.logger[level]({
      context: 'Performance',
      operation,
      duration,
      ...metadata,
    }, `Operation "${operation}" took ${duration}ms`);
  }
}