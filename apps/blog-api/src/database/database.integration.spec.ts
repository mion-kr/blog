import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';

import { AppModule } from '../app.module';
import { DatabaseService } from './database.service';

describe('DB 상태 조회 HTTP 엔드포인트 제거', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('인증 없는 DB 상태 조회 요청은 404를 반환한다', async () => {
    await request(app.getHttpServer()).get('/api/database/health').expect(404);
  });

  it('앱은 기존 루트 응답과 DB 서비스 등록을 유지한다', async () => {
    await request(app.getHttpServer()).get('/api').expect(200);
    expect(app.get(DatabaseService)).toBeInstanceOf(DatabaseService);
  });

  it('전체 Swagger 문서에 DB 상태 조회 경로와 응답 DTO를 노출하지 않는다', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );

    expect(document.paths).not.toHaveProperty('/api/database/health');
    expect(document.components?.schemas).not.toHaveProperty(
      'DatabaseHealthResponseDto',
    );
  });
});
