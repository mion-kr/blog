import { Controller, Get } from '@nestjs/common';

import { ApiPublicController, ApiPublicSingle } from '../common/decorators';
import { DatabaseService } from './database.service';
import { DatabaseHealthResponseDto } from './dto/database-health-response.dto';

/**
 * 데이터베이스 헬스체크 API 컨트롤러입니다.
 */
@ApiPublicController('database', DatabaseHealthResponseDto)
@Controller('database')
export class DatabaseController {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * 데이터베이스 헬스체크 상태를 반환합니다.
   */
  @Get('health')
  @ApiPublicSingle(
    DatabaseHealthResponseDto,
    '데이터베이스 헬스 체크 엔드포인트',
    '현재 데이터베이스 연결 상태를 반환하는 health check endpoint 입니다.',
  )
  async getHealth(): Promise<DatabaseHealthResponseDto> {
    const healthResult = await this.databaseService.healthCheck();
    return healthResult;
  }
}
