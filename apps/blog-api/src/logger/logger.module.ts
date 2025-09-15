import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { LoggerConfigFactory } from './logger.config';
import { LoggerService } from './logger.service';

/**
 * 로거 모듈
 * Single Responsibility: 로깅 기능만 제공
 * Dependency Inversion: ConfigService에 의존하여 설정을 주입받음
 */
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => 
        LoggerConfigFactory.createLoggerConfig(configService),
    }),
  ],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}