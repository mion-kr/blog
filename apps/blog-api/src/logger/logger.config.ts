import { ConfigService } from '@nestjs/config';
import { RequestMethod } from '@nestjs/common';
import { Params } from 'nestjs-pino';
import { IncomingMessage } from 'http';
import { ServerResponse } from 'http';
import * as pino from 'pino';

/**
 * Pino Logger 설정 팩토리
 * Single Responsibility: 로거 설정만 담당
 * Open/Closed: 환경별 설정 확장 가능
 */
export class LoggerConfigFactory {
  static createLoggerConfig(configService: ConfigService): Params {
    const isDevelopment = configService.get('NODE_ENV') === 'development';
    const logLevel =
      configService.get('LOG_LEVEL') ?? (isDevelopment ? 'debug' : 'info');

    return {
      pinoHttp: {
        level: logLevel,
        // 🔍 요청 ID 생성 (추적용)
        genReqId: (req: IncomingMessage) => {
          const xRequestId = req.headers['x-request-id'];
          return (
            xRequestId ||
            `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
          );
        },
        // ✅ 로깅할 요청 필터링
        autoLogging: {
          ignore: (req: IncomingMessage): boolean => {
            // Health check 등 제외
            return (
              req.url?.includes('/health') === true ||
              req.url?.includes('/metrics') === true
            );
          },
        },
        // 타임스탬프 설정
        timestamp: pino.stdTimeFunctions.isoTime,
        transport: isDevelopment
          ? {
              target: 'pino-pretty',
              options: {
                levelFirst: true,
                translateTime: 'yyyy-mm-dd HH:MM:ss.l',
                colorize: true,
                ignore: 'pid,hostname',
                messageFormat: '{msg} [{context}]',
                errorLikeObjectKeys: ['err', 'error', 'exception'],
              },
            }
          : undefined,
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
            '*.password',
            '*.token',
            '*.secret',
          ],
          censor: '[REDACTED]',
        },
        serializers: {
          req: (req: IncomingMessage & { id?: string }) => ({
            id: req.id,
            method: req.method,
            url: req.url,
            headers: {
              host: req.headers.host,
              'user-agent': req.headers['user-agent'],
              'content-type': req.headers['content-type'],
            },
            remoteAddress: req.socket?.remoteAddress,
            remotePort: req.socket?.remotePort,
          }),
          res: (res: ServerResponse) => ({
            statusCode: res.statusCode,
            // getHeaders() 메서드가 존재하는 경우에만 사용, 없으면 빈 객체 반환
            headers:
              typeof res.getHeaders === 'function' ? res.getHeaders() : {},
          }),
          err: (err: Error) => {
            const errorObj: Record<string, unknown> = {
              type: err.constructor?.name ?? 'Error',
              message: err.message,
              stack: isDevelopment ? err.stack : undefined,
            };

            // Error 객체의 다른 속성들을 안전하게 복사
            Object.keys(err).forEach((key) => {
              if (!['message', 'stack', 'name'].includes(key)) {
                errorObj[key] = (err as any)[key];
              }
            });

            return errorObj;
          },
        },
        customLogLevel: (
          req: IncomingMessage,
          res: ServerResponse,
          err?: Error,
        ) => {
          if (res.statusCode >= 500 || err) {
            return 'error';
          }
          if (res.statusCode >= 400) {
            return 'warn';
          }
          if (res.statusCode >= 300) {
            return 'info';
          }
          return 'debug';
        },
        customSuccessMessage: (req: IncomingMessage, res: ServerResponse) => {
          return `${req.method} ${req.url}`;
        },
        customErrorMessage: (
          req: IncomingMessage,
          res: ServerResponse,
          err: Error,
        ) => {
          return `${req.method} ${req.url} - ${err.message}`;
        },
        customAttributeKeys: {
          req: 'request',
          res: 'response',
          err: 'error',
          responseTime: 'duration',
        },
        customProps: (req: IncomingMessage & { user?: { id?: string } }) => ({
          context: 'HTTP',
          userId: req.user?.id,
          ip: req.socket?.remoteAddress,
          userAgent: req.headers['user-agent'],
        }),
        // duration을 초 단위로 변환
        formatters: {
          log: (object: Record<string, any>) => {
            if (object.duration && typeof object.duration === 'number') {
              // 밀리초를 초로 변환하고 소수점 3자리까지 표시
              object.duration = `${(object.duration / 1000).toFixed(3)}s`;
            }
            return object;
          },
        },
      },
      exclude: [
        // 헬스체크 엔드포인트는 로깅 제외
        { method: RequestMethod.GET, path: '/health' },
        { method: RequestMethod.GET, path: '/api/health' },
      ],
      forRoutes: ['*'],
      renameContext: 'apiContext',
    };
  }
}
