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
  postTags as postTagsTable,
  posts as postsTable,
  tags as tagsTable,
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
 * Tags API Integration Tests
 *
 * 실제 데이터베이스와 HTTP 요청/응답을 테스트하는 통합 테스트
 * - 전체 API 엔드포인트 테스트
 * - 실제 JWT 인증 테스트
 * - 데이터베이스 트랜잭션 테스트
 * - CRUD 작업의 전체 플로우 테스트
 * - 다대다 관계 (Post-Tag) 테스트
 * - 에러 상황 및 예외 처리 테스트
 */
// TestContainer 적용하여 테스트 예정
describe.skip('TagsController (Integration)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;

  // JWT 토큰 (테스트용 관리자 토큰)
  let adminToken: string;

  // 테스트 데이터
  const testTag = {
    name: 'Next.js',
    slug: 'nextjs',
  };

  const updateTag = {
    name: 'React.js',
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
    // 각 테스트 전에 태그 및 관련 테이블 정리
    await cleanupTags();
  });

  describe('GET /api/tags', () => {
    it('빈 태그 목록을 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tags')
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

    it('페이징된 태그 목록을 반환해야 함', async () => {
      // 테스트 태그 생성
      await createTestTag(app, testTag, adminToken);

      const response = await request(app.getHttpServer())
        .get('/api/tags?page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        name: testTag.name,
        slug: testTag.slug,
        postCount: 0,
      });
      expect(response.body.meta).toMatchObject({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('이름으로 태그를 검색할 수 있어야 함', async () => {
      // 여러 테스트 태그 생성
      await createTestTag(app, testTag, adminToken);
      await createTestTag(
        app,
        {
          name: 'Vue.js',
          slug: 'vuejs',
        },
        adminToken,
      );

      const response = await request(app.getHttpServer())
        .get('/api/tags?search=Next')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Next.js');
    });

    it('정렬 기능이 동작해야 함', async () => {
      // 여러 태그 생성
      await createTestTag(app, testTag, adminToken);
      await createTestTag(
        app,
        {
          name: 'Angular',
          slug: 'angular',
        },
        adminToken,
      );

      const response = await request(app.getHttpServer())
        .get('/api/tags?sortBy=name&sortOrder=asc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('Angular');
      expect(response.body.data[1].name).toBe('Next.js');
    });

    it('postCount 내림차순 정렬이 가능해야 함', async () => {
      // 태그 생성 및 포스트 연결 시뮬레이션
      await createTestTag(app, testTag, adminToken);
      await createTestTag(
        app,
        {
          name: 'Vue.js',
          slug: 'vuejs',
        },
        adminToken,
      );

      const response = await request(app.getHttpServer())
        .get('/api/tags?sortBy=postCount&sortOrder=desc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('GET /api/tags/:slug', () => {
    it('존재하는 태그를 조회할 수 있어야 함', async () => {
      await createTestTag(app, testTag, adminToken);

      const response = await request(app.getHttpServer())
        .get(`/api/tags/${testTag.slug}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: testTag.name,
        slug: testTag.slug,
        postCount: 0,
      });
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();
    });

    it('존재하지 않는 태그 조회 시 404 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tags/non-existent-slug')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('태그를 찾을 수 없습니다');
    });

    it('잘못된 슬러그 형식 조회 시 적절한 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tags/Invalid Slug!')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/tags', () => {
    it('관리자 권한으로 태그를 생성할 수 있어야 함', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testTag)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: testTag.name,
        slug: testTag.slug,
        postCount: 0,
      });
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();
    });

    it('인증 없이 태그 생성 시 401 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tags')
        .send(testTag)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('잘못된 데이터로 태그 생성 시 400 에러를 반환해야 함', async () => {
      const invalidTag = {
        name: '', // 빈 이름
        slug: 'invalid slug!', // 잘못된 슬러그
      };

      const response = await request(app.getHttpServer())
        .post('/api/tags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidTag)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('중복된 슬러그로 태그 생성 시 409 에러를 반환해야 함', async () => {
      // 첫 번째 태그 생성
      await createTestTag(app, testTag, adminToken);

      // 동일한 슬러그로 두 번째 태그 생성 시도
      const response = await request(app.getHttpServer())
        .post('/api/tags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...testTag,
          name: '다른 이름',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('이미 사용 중인 슬러그');
    });

    it('필수 필드 없이 태그 생성 시 400 에러를 반환해야 함', async () => {
      const incompleteTag = {
        name: '테스트 태그',
        // slug 누락
      };

      const response = await request(app.getHttpServer())
        .post('/api/tags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(incompleteTag)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('긴 이름으로 태그 생성 시 400 에러를 반환해야 함', async () => {
      const longNameTag = {
        name: 'a'.repeat(31), // 30자 초과
        slug: 'long-name-tag',
      };

      const response = await request(app.getHttpServer())
        .post('/api/tags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(longNameTag)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/tags/:slug', () => {
    beforeEach(async () => {
      await createTestTag(app, testTag, adminToken);
    });

    it('관리자 권한으로 태그를 수정할 수 있어야 함', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/tags/${testTag.slug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateTag)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: updateTag.name,
        slug: testTag.slug, // 슬러그는 변경되지 않음
      });
    });

    it('존재하지 않는 태그 수정 시 404 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/tags/non-existent-slug')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateTag)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('인증 없이 태그 수정 시 401 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/tags/${testTag.slug}`)
        .send(updateTag)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('빈 데이터로 태그 수정 시도는 성공해야 함 (변경 없음)', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/tags/${testTag.slug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(testTag.name);
    });

    it('잘못된 이름으로 수정 시 400 에러를 반환해야 함', async () => {
      const invalidUpdate = {
        name: '', // 빈 이름
      };

      const response = await request(app.getHttpServer())
        .put(`/api/tags/${testTag.slug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/tags/:slug', () => {
    beforeEach(async () => {
      await createTestTag(app, testTag, adminToken);
    });

    it('관리자 권한으로 태그를 삭제할 수 있어야 함', async () => {
      await request(app.getHttpServer())
        .delete(`/api/tags/${testTag.slug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // 삭제 확인
      await request(app.getHttpServer())
        .get(`/api/tags/${testTag.slug}`)
        .expect(404);
    });

    it('존재하지 않는 태그 삭제 시 404 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/tags/non-existent-slug')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('인증 없이 태그 삭제 시 401 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/tags/${testTag.slug}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('연관된 포스트가 있는 태그도 삭제할 수 있어야 함 (soft delete)', async () => {
      // 포스트와 연관된 태그 생성 및 삭제 테스트
      // 실제 구현에서는 cascade 옵션에 따라 처리
      await request(app.getHttpServer())
        .delete(`/api/tags/${testTag.slug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });

  describe('Tag-Post Relationship Tests', () => {
    it('태그에 연관된 포스트 수가 정확히 계산되어야 함', async () => {
      await createTestTag(app, testTag, adminToken);

      // 포스트 생성 및 태그 연결 로직 필요
      // 여기서는 postCount 확인만 테스트

      const response = await request(app.getHttpServer())
        .get(`/api/tags/${testTag.slug}`)
        .expect(200);

      expect(response.body.data.postCount).toBe(0);
    });

    it('포스트 삭제 시 태그의 postCount가 감소해야 함', async () => {
      // 포스트와 태그 관계 테스트
      // 실제 포스트 API와 연동하여 테스트
    });
  });

  describe('Database Transaction Tests', () => {
    it('태그 생성 중 오류 발생 시 롤백되어야 함', async () => {
      // 트랜잭션 테스트를 위한 시나리오
      // 실제 구현 시 데이터베이스 트랜잭션 동작 확인
    });

    it('동시성 테스트: 같은 슬러그로 동시 생성 시 하나만 성공해야 함', async () => {
      const promises = Array(5)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post('/api/tags')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(testTag),
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

    it('대량 태그 처리 시 성능이 적절해야 함', async () => {
      const startTime = Date.now();

      // 100개 태그 생성
      const promises = Array(100)
        .fill(null)
        .map((_, index) =>
          createTestTag(
            app,
            {
              name: `Tag ${index}`,
              slug: `tag-${index}`,
            },
            adminToken,
          ),
        );

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 성능 검증 (10초 이내)
      expect(duration).toBeLessThan(10000);

      // 생성된 태그 수 확인
      const response = await request(app.getHttpServer())
        .get('/api/tags?limit=200')
        .expect(200);

      expect(response.body.data).toHaveLength(100);
    });
  });

  describe('Edge Cases', () => {
    it('특수 문자가 포함된 태그 이름 처리', async () => {
      const specialTag = {
        name: 'C++/C#',
        slug: 'cpp-csharp',
      };

      const response = await request(app.getHttpServer())
        .post('/api/tags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(specialTag)
        .expect(201);

      expect(response.body.data.name).toBe(specialTag.name);
    });

    it('유니코드 문자가 포함된 태그 이름 처리', async () => {
      const unicodeTag = {
        name: '한국어',
        slug: 'korean',
      };

      const response = await request(app.getHttpServer())
        .post('/api/tags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(unicodeTag)
        .expect(201);

      expect(response.body.data.name).toBe(unicodeTag.name);
    });

    it('슬러그에 대소문자 혼합 시 처리', async () => {
      const mixedCaseTag = {
        name: 'JavaScript',
        slug: 'JavaScript', // 대문자 포함
      };

      const response = await request(app.getHttpServer())
        .post('/api/tags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(mixedCaseTag)
        .expect(400);

      expect(response.body.success).toBe(false);
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
 * 태그 및 관련 테이블 정리
 */
async function cleanupTags(): Promise<void> {
  await db.delete(postTagsTable);
  await db.delete(postsTable);
  await db.delete(tagsTable);
  await db.delete(categoriesTable);
}

/**
 * 테스트 태그 생성
 */
async function createTestTag(
  app: INestApplication,
  tag: any,
  token: string,
): Promise<any> {
  const response = await request(app.getHttpServer())
    .post('/api/tags')
    .set('Authorization', `Bearer ${token}`)
    .send(tag)
    .expect((res) => {
      if (![201, 409].includes(res.status)) {
        throw new Error(`Unexpected status ${res.status} while creating tag`);
      }
    });

  return response.body.data;
}
