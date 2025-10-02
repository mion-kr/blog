import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import {
  categories as categoriesTable,
  db,
  posts as postsTable,
  postTags as postTagsTable,
} from '@repo/database';
import { AppModule } from '../app.module';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const TEST_ADMIN_TOKEN = 'test-admin-token';
const TEST_ADMIN_USER_ID = 'test-admin-user';

const createMockAdminGuard = (): CanActivate => ({
  canActivate: (context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const authHeader =
      request.headers['authorization'] ?? request.headers['Authorization'];

    if (authHeader === `Bearer ${TEST_ADMIN_TOKEN}`) {
      request.user = {
        id: TEST_ADMIN_USER_ID,
        role: 'ADMIN',
        email: 'admin@example.com',
        name: 'Test Admin',
      };
      return true;
    }

    throw new UnauthorizedException('Invalid token for testing');
  },
});

/**
 * Categories API Integration Tests
 *
 * 실제 데이터베이스와 HTTP 요청/응답을 테스트하는 통합 테스트
 * - 전체 API 엔드포인트 테스트
 * - 실제 JWT 인증 테스트
 * - 데이터베이스 트랜잭션 테스트
 * - CRUD 작업의 전체 플로우 테스트
 * - 에러 상황 및 예외 처리 테스트
 */
// TestContainer 적용하여 테스트 예정
describe.skip('CategoriesController (Integration)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;

  // JWT 토큰 (테스트용 관리자 토큰)
  let adminToken: string;

  // 테스트 데이터
  const testCategory = {
    name: '개발',
    slug: 'development',
    description: '개발 관련 포스트들을 모아놓은 카테고리입니다.',
    color: '#3B82F6',
  };

  const updateCategory = {
    name: '웹 개발',
    description: '웹 개발 관련 포스트들을 모아놓은 카테고리입니다.',
    color: '#EF4444',
  };

  beforeAll(async () => {
    const testingModuleBuilder = Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        AppModule,
      ],
    });

    testingModuleBuilder
      .overrideGuard(JwtAuthGuard)
      .useValue(createMockAdminGuard());
    testingModuleBuilder
      .overrideGuard(AdminGuard)
      .useValue(createMockAdminGuard());

    moduleFixture = await testingModuleBuilder.compile();

    app = moduleFixture.createNestApplication();

    // 글로벌 프리픽스 설정 (실제 애플리케이션과 동일)
    app.setGlobalPrefix('api');

    // ValidationPipe 설정 (실제 애플리케이션과 동일)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    adminToken = await getAdminToken();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // 각 테스트 전에 카테고리 테이블 정리
    await cleanupCategories();
  });

  describe('GET /api/categories', () => {
    it('빈 카테고리 목록을 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/categories')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        },
      });
    });

    it('페이징된 카테고리 목록을 반환해야 함', async () => {
      // 테스트 카테고리 생성
      await createTestCategory(app, testCategory, adminToken);

      const response = await request(app.getHttpServer())
        .get('/api/categories?page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        name: testCategory.name,
        slug: testCategory.slug,
        description: testCategory.description,
        color: testCategory.color,
        postCount: 0,
      });
      expect(response.body.meta).toMatchObject({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('이름으로 카테고리를 검색할 수 있어야 함', async () => {
      // 여러 테스트 카테고리 생성
      await createTestCategory(app, testCategory, adminToken);
      await createTestCategory(
        app,
        {
          ...testCategory,
          name: '디자인',
          slug: 'design',
        },
        adminToken,
      );

      const response = await request(app.getHttpServer())
        .get('/api/categories?search=개발')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('개발');
    });

    it('정렬 기능이 동작해야 함', async () => {
      // 두 개의 카테고리 생성
      await createTestCategory(app, testCategory, adminToken);
      await createTestCategory(
        app,
        {
          ...testCategory,
          name: 'B카테고리',
          slug: 'b-category',
        },
        adminToken,
      );

      const response = await request(app.getHttpServer())
        .get('/api/categories?sortBy=name&sortOrder=asc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('B카테고리');
      expect(response.body.data[1].name).toBe('개발');
    });
  });

  describe('GET /api/categories/:slug', () => {
    it('존재하는 카테고리를 조회할 수 있어야 함', async () => {
      await createTestCategory(app, testCategory, adminToken);

      const response = await request(app.getHttpServer())
        .get(`/api/categories/${testCategory.slug}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: testCategory.name,
        slug: testCategory.slug,
        description: testCategory.description,
        color: testCategory.color,
        postCount: 0,
      });
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();
    });

    it('존재하지 않는 카테고리 조회 시 404 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/categories/non-existent-slug')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('카테고리를 찾을 수 없습니다');
    });
  });

  describe('POST /api/categories', () => {
    it('관리자 권한으로 카테고리를 생성할 수 있어야 함', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testCategory)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: testCategory.name,
        slug: testCategory.slug,
        description: testCategory.description,
        color: testCategory.color,
        postCount: 0,
      });
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();
    });

    it('인증 없이 카테고리 생성 시 401 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/categories')
        .send(testCategory)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('잘못된 데이터로 카테고리 생성 시 400 에러를 반환해야 함', async () => {
      const invalidCategory = {
        name: '', // 빈 이름
        slug: 'invalid slug!', // 잘못된 슬러그
        color: 'invalid-color', // 잘못된 색상
      };

      const response = await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidCategory)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('중복된 슬러그로 카테고리 생성 시 409 에러를 반환해야 함', async () => {
      // 첫 번째 카테고리 생성
      await createTestCategory(app, testCategory, adminToken);

      // 동일한 슬러그로 두 번째 카테고리 생성 시도
      const response = await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...testCategory,
          name: '다른 이름',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('이미 사용 중인 슬러그');
    });

    it('필수 필드 없이 카테고리 생성 시 400 에러를 반환해야 함', async () => {
      const incompleteCategory = {
        name: '테스트 카테고리',
        // slug 누락
      };

      const response = await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(incompleteCategory)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/categories/:slug', () => {
    beforeEach(async () => {
      await createTestCategory(app, testCategory, adminToken);
    });

    it('관리자 권한으로 카테고리를 수정할 수 있어야 함', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/categories/${testCategory.slug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateCategory)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: updateCategory.name,
        slug: testCategory.slug, // 슬러그는 변경되지 않음
        description: updateCategory.description,
        color: updateCategory.color,
      });
    });

    it('존재하지 않는 카테고리 수정 시 404 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/categories/non-existent-slug')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateCategory)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('인증 없이 카테고리 수정 시 401 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/categories/${testCategory.slug}`)
        .send(updateCategory)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('부분 수정이 가능해야 함', async () => {
      const partialUpdate = {
        name: '새로운 이름',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/categories/${testCategory.slug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(partialUpdate.name);
      expect(response.body.data.description).toBe(testCategory.description);
    });
  });

  describe('DELETE /api/categories/:slug', () => {
    beforeEach(async () => {
      await createTestCategory(app, testCategory, adminToken);
    });

    it('관리자 권한으로 카테고리를 삭제할 수 있어야 함', async () => {
      await request(app.getHttpServer())
        .delete(`/api/categories/${testCategory.slug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // 삭제 확인
      await request(app.getHttpServer())
        .get(`/api/categories/${testCategory.slug}`)
        .expect(404);
    });

    it('존재하지 않는 카테고리 삭제 시 404 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/categories/non-existent-slug')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('인증 없이 카테고리 삭제 시 401 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/categories/${testCategory.slug}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('연관된 포스트가 있는 카테고리 삭제 시 에러를 반환해야 함', async () => {
      // 포스트와 연관된 카테고리 생성 로직 필요
      // 이 부분은 실제 데이터베이스 관계에 따라 구현
    });
  });

  describe('Database Transaction Tests', () => {
    it('카테고리 생성 중 오류 발생 시 롤백되어야 함', async () => {
      // 트랜잭션 테스트를 위한 시나리오
      // 실제 구현 시 데이터베이스 트랜잭션 동작 확인
    });

    it('동시성 테스트: 같은 슬러그로 동시 생성 시 하나만 성공해야 함', async () => {
      // 동시성 테스트 로직
      const promises = Array(5)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post('/api/categories')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(testCategory),
        );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(
        (result) =>
          result.status === 'fulfilled' && result.value.status === 201,
      );
      const failed = results.filter(
        (result) =>
          result.status === 'fulfilled' && result.value.status === 409,
      );

      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(4);
    });
  });
});

// 헬퍼 함수들

/**
 * 테스트용 관리자 토큰 획득
 */
async function getAdminToken(): Promise<string> {
  return TEST_ADMIN_TOKEN;
}

/**
 * 카테고리 테이블 정리
 */
async function cleanupCategories(): Promise<void> {
  await db.delete(postTagsTable);
  await db.delete(postsTable);
  await db.delete(categoriesTable);
}

/**
 * 테스트 카테고리 생성
 */
async function createTestCategory(
  app: INestApplication,
  category: any,
  token: string,
): Promise<any> {
  const response = await request(app.getHttpServer())
    .post('/api/categories')
    .set('Authorization', `Bearer ${token}`)
    .send(category);

  return response.body.data;
}
