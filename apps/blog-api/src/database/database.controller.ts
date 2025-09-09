import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabaseService } from './database.service';

@ApiTags('database')
@Controller('database')
export class DatabaseController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check database health' })
  @ApiResponse({ status: 200, description: 'Database health status' })
  async getHealth() {
    const healthResult = await this.databaseService.healthCheck();
    const isHealthy = healthResult.status === 'healthy';
    return {
      success: isHealthy,
      message: isHealthy ? 'Database is healthy' : 'Database is not healthy'
    };
  }
}