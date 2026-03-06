import { Injectable, Logger } from '@nestjs/common';
import { db, sql } from '@repo/database';

/**
 * 데이터베이스 헬스체크 지원 서비스입니다.
 */
@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  /**
   * 데이터베이스 연결 상태를 확인합니다.
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; timestamp: string }> {
    try {
      // 간단한 쿼리로 연결 상태만 확인합니다.
      await db.execute(sql`SELECT 1`);

      this.logger.debug('Database health check passed');
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
