import { ApiProperty } from '@nestjs/swagger';

export class DatabaseHealthResponseDto {
  @ApiProperty({ example: 'healthy', description: '데이터베이스 연결 상태' })
  status!: 'healthy' | 'unhealthy';

  @ApiProperty({
    example: '2025-10-16T00:00:00.000Z',
    description: '상태를 점검한 시각 (ISO8601)',
  })
  timestamp!: string;
}

