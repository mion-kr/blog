/**
 * API 응답의 메타데이터 (페이지네이션용)
 * Swagger 데코레이터가 필요한 경우 blog-api에서 별도 클래스로 확장하여 사용
 */
export interface ApiPaginationMeta {
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
  totalPages?: number;
}

export class PaginationMeta {
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly hasNext: boolean;
  readonly hasPrev: boolean;
  readonly totalPages: number;

  constructor(total: number, page: number = 1, limit: number = 10) {
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
    this.hasNext = page < this.totalPages;
    this.hasPrev = page > 1;
  }

  // 🎯 Static factory method로 더 간편하게
  static create(total: number, page?: number, limit?: number): PaginationMeta {
    return new PaginationMeta(total, page ?? 1, limit ?? 10);
  }
}
