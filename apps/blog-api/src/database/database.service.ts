import { Injectable, Logger } from '@nestjs/common';
import { db, sql } from '@repo/database';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  /**
   * 데이터베이스 인스턴스를 반환합니다.
   */
  getDb(): typeof db {
    return db;
  }

  /**
   * 데이터베이스 연결 상태를 확인합니다.
   * @returns 연결 상태
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      // 간단한 쿼리로 연결 상태 확인
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
