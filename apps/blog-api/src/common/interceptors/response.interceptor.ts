import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiResponse, PaginatedData, PaginationMeta } from '@repo/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();

    return next.handle().pipe(
      map((data) => {
        // 이미 ApiResponse 형태라면 그대로 반환
        if (data?.success !== undefined) {
          return data;
        }

        // 메타데이터에서 커스텀 메시지 가져오기
        const customMessage = this.reflector.get<string>(
          'response-message',
          handler,
        );
        const isPaginated = this.reflector.get<boolean>(
          'is-paginated',
          handler,
        );

        const response: ApiResponse<T> = {
          success: true,
          message:
            customMessage ?? this.getDefaultMessage(request.method, data),
          data: data ?? null,
          timestamp: new Date().toISOString(),
          path: request.url,
        };

        // 페이징 데이터 처리
        if (isPaginated && this.isPaginatedData(data)) {
          response.data = data.items as T;
          response.meta = data.meta;
        }

        return response;
      }),
    );
  }

  private getDefaultMessage(method: string, data: T | PaginatedData<T>): string {
    // 데이터 타입에 따른 스마트 메시지 생성
    if (Array.isArray(data)) {
      return `${data.length}개의 항목을 조회했습니다.`;
    }

    const messages = {
      GET: data ? '조회가 완료되었습니다.' : '데이터를 찾을 수 없습니다.',
      POST: '생성이 완료되었습니다.',
      PUT: '수정이 완료되었습니다.',
      PATCH: '업데이트가 완료되었습니다.',
      DELETE: '삭제가 완료되었습니다.',
    };

    return messages[method] ?? '요청이 완료되었습니다.';
  }

  private isPaginatedData(data: T | PaginatedData<T>): data is PaginatedData<T> {
    if (!data || typeof data !== 'object') return false;
    
    const obj = data as Record<string, unknown>;
    return (
      'items' in obj &&
      'meta' in obj &&
      Array.isArray(obj.items) &&
      obj.meta instanceof PaginationMeta
    );
  }
}
