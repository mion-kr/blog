import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cors from 'cors';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 보안 헤더 설정
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // CORS 설정 - 요구사항 문서 기준
  app.use(cors({
    origin: [
      'https://blog.mion.dev', // 프로덕션 도메인
      'http://localhost:3000',  // 개발 환경
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  }));

  // 전역 ValidationPipe 설정
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Swagger API 문서 설정
  const config = new DocumentBuilder()
    .setTitle('Mion\'s Blog API')
    .setDescription('Mion의 기술 블로그 API 문서')
    .setVersion('1.0')
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
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // 글로벌 프리픽스 설정
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  
  console.log(`🚀 Blog API is running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs available at: http://localhost:${port}/api-docs`);
}
bootstrap();
