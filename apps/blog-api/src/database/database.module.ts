import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

/**
 * 데이터베이스 지원 서비스를 등록합니다.
 */
@Module({
  providers: [DatabaseService],
})
export class DatabaseModule {}
