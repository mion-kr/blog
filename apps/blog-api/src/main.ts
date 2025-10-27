import {
  BadRequestException,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationError } from 'class-validator';
import cors from 'cors';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { CategoriesModule } from './categories/categories.module';
import {
  ApiResponseDto,
  ApiResponseMeta,
  PaginatedApiResponseDto,
} from './common/dto';
import { formatValidationErrors } from './common/utils';
import { PostsModule } from './posts/posts.module';
import { SettingsModule } from './settings/settings.module';
import { TagsModule } from './tags/tags.module';
import { UploadsModule } from './uploads/uploads.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Pino Logger 설정
  app.useLogger(app.get(Logger));

  // 포트 설정 (Swagger 서버 설정에서 사용하기 위해 미리 정의)
  const port = process.env.PORT ?? 3001;

  // 글로벌 프리픽스 설정
  app.setGlobalPrefix('api');

  // 보안 헤더 설정
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    }),
  );

  // CORS 설정 - 요구사항 문서 기준
  app.use(
    cors({
      origin: [
        process.env.CORS_ORIGIN ?? 'https://blog.mion-space.dev', // 프로덕션 도메인
        'http://localhost:3000', // 개발 환경
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    }),
  );

  // 검색 엔진 색인 방지 (API 레벨)
  app.use((req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
  });

  // 전역 ValidationPipe 설정
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        const formattedErrors = formatValidationErrors(validationErrors);

        return new BadRequestException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: '입력 데이터가 올바르지 않습니다.',
          error: 'Bad Request',
          validation: formattedErrors,
        });
      },
    }),
  );

  // 전역 인터셉터와 필터는 CommonModule에서 APP_INTERCEPTOR, APP_FILTER Provider로 등록됨

  // Swagger API 문서: 운영(prod)에서는 비활성화
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle("Mion's Blog API")
      .setDescription('Mion의 기술 블로그 API 문서')
      .setVersion('1.0')
      .addServer(`http://localhost:${port}`, '개발 환경')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'NextAuth.js에서 발급된 JWT 토큰을 입력하세요.',
        in: 'header',
      })
      .addTag('auth', '인증 관련 API')
      .addTag('posts', '블로그 포스트 API')
      .addTag('categories', '카테고리 API')
      .addTag('tags', '태그 API')
      .addTag('database', '데이터베이스 테스트 API (개발 환경 전용)')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      include: [
        PostsModule,
        CategoriesModule,
        TagsModule,
        SettingsModule,
        UploadsModule,
      ],
      extraModels: [ApiResponseDto, PaginatedApiResponseDto, ApiResponseMeta],
    });
    SwaggerModule.setup('api-docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  await app.listen(port);

  // Pino Logger 인스턴스를 가져와서 사용
  const logger = app.get(Logger);
  logger.log(`🚀 Blog API is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger docs available at: http://localhost:${port}/api-docs`);
}
void bootstrap();
