import { Controller, Get } from '@nestjs/common';
import { ApiExtraModels, ApiTags } from '@nestjs/swagger';

import { ApiPublicSingle } from '../common/decorators';
import { DatabaseService } from './database.service';
import { DatabaseHealthResponseDto } from './dto/database-health-response.dto';

@ApiTags('database')
@ApiExtraModels(DatabaseHealthResponseDto)
@Controller('database')
export class DatabaseController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get('health')
  @ApiPublicSingle(
    DatabaseHealthResponseDto,
    '데이터베이스 헬스 체크',
    '현재 데이터베이스 연결 상태를 반환합니다.',
  )
  async getHealth(): Promise<DatabaseHealthResponseDto> {
    const healthResult = await this.databaseService.healthCheck();
    return healthResult;
  }
}
