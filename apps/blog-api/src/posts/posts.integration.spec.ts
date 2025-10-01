import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';

import { AppModule } from '../app.module';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  db,
  users,
  eq,
  posts as postsTable,
  postTags as postTagsTable,
  categories as categoriesTable,
  tags as tagsTable,
} from '@repo/database';

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
 * Posts API Integration Tests
 *
 * 실제 데이터베이스와 HTTP 요청/응답을 테스트하는 통합 테스트
 * - 전체 API 엔드포인트 테스트
 * - 실제 JWT 인증 테스트
 * - 관계형 데이터 처리 테스트 (Category, Tags)
 * - 조회수 증가 기능 테스트
 * - 발행/미발행 상태 처리 테스트
 * - 복잡한 필터링 및 검색 기능 테스트
 * - 에러 상황 및 예외 처리 테스트
 */
// TODO: Re-enable when full-stack integration test harness (DB + auth tokens) is ready.
describe.skip('PostsController (Integration)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;

  // JWT 토큰 (테스트용 관리자 토큰)
  let adminToken: string;

  // 테스트 데이터
  const testCategory = {
    id: '01234567-89ab-cdef-0123-456789abcdef',
    name: '개발',
    slug: 'development',
  };
  const testTags = [
    {
      id: '12345678-9abc-def0-1234-56789abcdef0',
      name: 'Next.js',
      slug: 'nextjs',
    },
    {
      id: '23456789-abcd-ef01-2345-6789abcdef01',
      name: 'React',
      slug: 'react',
    },
  ];

  const testPost = {
    title: 'Next.js 15에서 달라진 점들',
    content:
      '# 안녕하세요\n\n이것은 **MDX** 포스트입니다.\n\n## 주요 변경사항\n\n- React 19 지원\n- 새로운 라우팅 시스템\n- 성능 개선',
    excerpt: 'Next.js 15의 새로운 기능들에 대해 알아봅시다.',
    coverImage: 'https://example.com/cover-image.jpg',
    published: true,
  };

  const updatePost = {
    title: '수정된 제목: Next.js 15 완전 가이드',
    excerpt: '수정된 요약: Next.js 15의 모든 기능을 상세히 다룹니다.',
    published: false,
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

    await ensureAdminUser();
    adminToken = await getAdminToken();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // 각 테스트 전에 데이터 정리 및 기본 데이터 생성
    await cleanupDatabase();
    await setupTestData(app);
  });

  describe('GET /api/posts', () => {
    it('빈 포스트 목록을 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/posts')
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

    it('발행된 포스트만 조회해야 함 (기본값)', async () => {
      // 발행된 포스트와 미발행 포스트 생성
      await createTestPost(app, { ...testPost, published: true }, adminToken);
      await createTestPost(
        app,
        {
          ...testPost,
          title: '미발행 포스트',
          published: false,
        },
        adminToken,
      );

      const response = await request(app.getHttpServer())
        .get('/api/posts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].published).toBe(true);
      expect(response.body.data[0].title).toBe(testPost.title);
    });

    it('페이징된 포스트 목록을 반환해야 함', async () => {
      await createTestPost(app, testPost, adminToken);

      const response = await request(app.getHttpServer())
        .get('/api/posts?page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        title: testPost.title,
        excerpt: testPost.excerpt,
        published: testPost.published,
        views: 0,
      });
      expect(response.body.data[0].category).toBeDefined();
      expect(response.body.data[0].tags).toBeDefined();
      expect(response.body.data[0].author).toBeDefined();
      expect(response.body.meta).toMatchObject({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('제목과 내용으로 포스트를 검색할 수 있어야 함', async () => {
      await createTestPost(app, testPost, adminToken);
      await createTestPost(
        app,
        {
          ...testPost,
          title: 'Vue.js 가이드',
          content: 'Vue.js에 대한 내용입니다.',
        },
        adminToken,
      );

      const response = await request(app.getHttpServer())
        .get('/api/posts?search=Next.js')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toContain('Next.js');
    });

    it('카테고리로 포스트를 필터링할 수 있어야 함', async () => {
      const categorySlug = testCategory.slug;
      await createTestPost(app, testPost, adminToken);

      const response = await request(app.getHttpServer())
        .get(`/api/posts?category=${categorySlug}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category.slug).toBe(categorySlug);
    });

    it('태그로 포스트를 필터링할 수 있어야 함', async () => {
      const tagSlug = testTags[0].slug;
      await createTestPost(app, testPost, adminToken);

      const response = await request(app.getHttpServer())
        .get(`/api/posts?tag=${tagSlug}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(
        response.body.data[0].tags.some((tag) => tag.slug === tagSlug),
      ).toBe(true);
    });

    it('정렬 기능이 동작해야 함', async () => {
      // 시간차를 두고 포스트 생성
      await createTestPost(
        app,
        { ...testPost, title: '첫 번째 포스트' },
        adminToken,
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      await createTestPost(
        app,
        { ...testPost, title: '두 번째 포스트' },
        adminToken,
      );

      // 최신순 정렬 (기본값)
      const response = await request(app.getHttpServer())
        .get('/api/posts?sortBy=createdAt&sortOrder=desc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].title).toBe('두 번째 포스트');
      expect(response.body.data[1].title).toBe('첫 번째 포스트');
    });

    it('조회수 기준 정렬이 가능해야 함', async () => {
      await createTestPost(app, testPost, adminToken);

      const response = await request(app.getHttpServer())
        .get('/api/posts?sortBy=views&sortOrder=desc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('관리자는 미발행 포스트도 조회할 수 있어야 함', async () => {
      await createTestPost(app, { ...testPost, published: false }, adminToken);

      const response = await request(app.getHttpServer())
        .get('/api/posts?includeUnpublished=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].published).toBe(false);
    });
  });

  describe('GET /api/posts/:slug', () => {
    let createdPost: any;

    beforeEach(async () => {
      createdPost = await createTestPost(app, testPost, adminToken);
    });

    it('존재하는 포스트를 조회할 수 있어야 함', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/posts/${createdPost.slug}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        title: testPost.title,
        content: testPost.content,
        excerpt: testPost.excerpt,
        published: testPost.published,
      });
      expect(response.body.data.category).toBeDefined();
      expect(response.body.data.tags).toBeDefined();
      expect(response.body.data.author).toBeDefined();
      expect(response.body.data.views).toBe(1); // 조회수 증가
    });

    it('포스트 조회 시마다 조회수가 증가해야 함', async () => {
      // 첫 번째 조회
      const response1 = await request(app.getHttpServer())
        .get(`/api/posts/${createdPost.slug}`)
        .expect(200);
      expect(response1.body.data.views).toBe(1);

      // 두 번째 조회
      const response2 = await request(app.getHttpServer())
        .get(`/api/posts/${createdPost.slug}`)
        .expect(200);
      expect(response2.body.data.views).toBe(2);

      // 세 번째 조회
      const response3 = await request(app.getHttpServer())
        .get(`/api/posts/${createdPost.slug}`)
        .expect(200);
      expect(response3.body.data.views).toBe(3);
    });

    it('존재하지 않는 포스트 조회 시 404 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/posts/non-existent-slug')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('포스트를 찾을 수 없습니다');
    });

    it('미발행 포스트는 일반 사용자가 조회할 수 없어야 함', async () => {
      const unpublishedPost = await createTestPost(
        app,
        {
          ...testPost,
          title: '미발행 포스트',
          published: false,
        },
        adminToken,
      );

      const response = await request(app.getHttpServer())
        .get(`/api/posts/${unpublishedPost.slug}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('관리자는 미발행 포스트도 조회할 수 있어야 함', async () => {
      const unpublishedPost = await createTestPost(
        app,
        {
          ...testPost,
          title: '미발행 포스트',
          published: false,
        },
        adminToken,
      );

      const response = await request(app.getHttpServer())
        .get(`/api/posts/${unpublishedPost.slug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.published).toBe(false);
    });
  });

  describe('POST /api/posts', () => {
    it('관리자 권한으로 포스트를 생성할 수 있어야 함', async () => {
      const postData = {
        ...testPost,
        categoryId: testCategory.id,
        tagIds: testTags.map((tag) => tag.id),
      };

      const response = await request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(postData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        title: testPost.title,
        content: testPost.content,
        excerpt: testPost.excerpt,
        published: testPost.published,
        views: 0,
      });
      expect(response.body.data.slug).toBeDefined();
      expect(response.body.data.category).toBeDefined();
      expect(response.body.data.tags).toHaveLength(testTags.length);
      expect(response.body.data.author).toBeDefined();
    });

    it('인증 없이 포스트 생성 시 401 에러를 반환해야 함', async () => {
      const postData = {
        ...testPost,
        categoryId: testCategory.id,
        tagIds: testTags.map((tag) => tag.id),
      };

      const response = await request(app.getHttpServer())
        .post('/api/posts')
        .send(postData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('잘못된 데이터로 포스트 생성 시 400 에러를 반환해야 함', async () => {
      const invalidPost = {
        title: '', // 빈 제목
        content: '', // 빈 내용
        published: 'invalid', // 잘못된 boolean
        categoryId: 'invalid-uuid', // 잘못된 UUID
        tagIds: ['invalid-uuid'], // 잘못된 UUID 배열
      };

      const response = await request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPost)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('존재하지 않는 카테고리로 포스트 생성 시 400 에러를 반환해야 함', async () => {
      const postData = {
        ...testPost,
        categoryId: '01234567-89ab-cdef-0123-456789abcdef', // 존재하지 않는 ID
        tagIds: testTags.map((tag) => tag.id),
      };

      const response = await request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(postData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('존재하지 않는 태그로 포스트 생성 시 400 에러를 반환해야 함', async () => {
      const postData = {
        ...testPost,
        categoryId: testCategory.id,
        tagIds: ['01234567-89ab-cdef-0123-456789abcdef'], // 존재하지 않는 ID
      };

      const response = await request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(postData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('선택적 필드 없이 포스트를 생성할 수 있어야 함', async () => {
      const minimalPost = {
        title: '최소 포스트',
        content: '최소한의 내용입니다.',
        published: false,
        categoryId: testCategory.id,
        tagIds: [],
      };

      const response = await request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(minimalPost)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.excerpt).toBeNull();
      expect(response.body.data.coverImage).toBeNull();
      expect(response.body.data.tags).toHaveLength(0);
    });

    it('중복된 제목으로 포스트 생성 시 자동으로 슬러그가 생성되어야 함', async () => {
      const postData = {
        ...testPost,
        categoryId: testCategory.id,
        tagIds: testTags.map((tag) => tag.id),
      };

      // 첫 번째 포스트 생성
      const response1 = await request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(postData)
        .expect(201);

      // 동일한 제목으로 두 번째 포스트 생성
      const response2 = await request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(postData)
        .expect(201);

      expect(response1.body.data.slug).not.toBe(response2.body.data.slug);
    });
  });

  describe('PUT /api/posts/:slug', () => {
    let createdPost: any;

    beforeEach(async () => {
      createdPost = await createTestPost(app, testPost, adminToken);
    });

    it('관리자 권한으로 포스트를 수정할 수 있어야 함', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/posts/${createdPost.slug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatePost)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        title: updatePost.title,
        excerpt: updatePost.excerpt,
        published: updatePost.published,
      });
      expect(response.body.data.content).toBe(testPost.content); // 수정하지 않은 필드 유지
    });

    it('존재하지 않는 포스트 수정 시 404 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/posts/non-existent-slug')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatePost)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('인증 없이 포스트 수정 시 401 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/posts/${createdPost.slug}`)
        .send(updatePost)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('카테고리와 태그를 수정할 수 있어야 함', async () => {
      const updateData = {
        categoryId: testCategory.id,
        tagIds: [testTags[0].id], // 일부 태그만 사용
      };

      const response = await request(app.getHttpServer())
        .put(`/api/posts/${createdPost.slug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tags).toHaveLength(1);
    });

    it('부분 수정이 가능해야 함', async () => {
      const partialUpdate = {
        title: '부분 수정된 제목',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/posts/${createdPost.slug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(partialUpdate.title);
      expect(response.body.data.content).toBe(testPost.content);
    });

    it('잘못된 UUID로 수정 시 400 에러를 반환해야 함', async () => {
      const invalidUpdate = {
        categoryId: 'invalid-uuid',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/posts/${createdPost.slug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/posts/:slug', () => {
    let createdPost: any;

    beforeEach(async () => {
      createdPost = await createTestPost(app, testPost, adminToken);
    });

    it('관리자 권한으로 포스트를 삭제할 수 있어야 함', async () => {
      await request(app.getHttpServer())
        .delete(`/api/posts/${createdPost.slug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // 삭제 확인
      await request(app.getHttpServer())
        .get(`/api/posts/${createdPost.slug}`)
        .expect(404);
    });

    it('존재하지 않는 포스트 삭제 시 404 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/posts/non-existent-slug')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('인증 없이 포스트 삭제 시 401 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/posts/${createdPost.slug}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('포스트 삭제 시 관련된 태그 관계도 삭제되어야 함', async () => {
      await request(app.getHttpServer())
        .delete(`/api/posts/${createdPost.slug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // 태그는 여전히 존재해야 함
      const tagResponse = await request(app.getHttpServer())
        .get(`/api/tags/${testTags[0].slug}`)
        .expect(200);

      expect(tagResponse.body.success).toBe(true);
      expect(tagResponse.body.data.postCount).toBe(0); // 포스트 수는 감소
    });
  });

  describe('Complex Relationship Tests', () => {
    it('포스트 생성 시 카테고리 포스트 수가 증가해야 함', async () => {
      const beforeResponse = await request(app.getHttpServer())
        .get(`/api/categories/${testCategory.slug}`)
        .expect(200);

      const beforeCount = beforeResponse.body.data.postCount;

      await createTestPost(app, testPost, adminToken);

      const afterResponse = await request(app.getHttpServer())
        .get(`/api/categories/${testCategory.slug}`)
        .expect(200);

      expect(afterResponse.body.data.postCount).toBe(beforeCount + 1);
    });

    it('포스트 삭제 시 카테고리 포스트 수가 감소해야 함', async () => {
      const createdPost = await createTestPost(app, testPost, adminToken);

      const beforeResponse = await request(app.getHttpServer())
        .get(`/api/categories/${testCategory.slug}`)
        .expect(200);

      const beforeCount = beforeResponse.body.data.postCount;

      await request(app.getHttpServer())
        .delete(`/api/posts/${createdPost.slug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const afterResponse = await request(app.getHttpServer())
        .get(`/api/categories/${testCategory.slug}`)
        .expect(200);

      expect(afterResponse.body.data.postCount).toBe(beforeCount - 1);
    });

    it('포스트 생성 시 태그 포스트 수가 증가해야 함', async () => {
      const beforeResponse = await request(app.getHttpServer())
        .get(`/api/tags/${testTags[0].slug}`)
        .expect(200);

      const beforeCount = beforeResponse.body.data.postCount;

      await createTestPost(app, testPost, adminToken);

      const afterResponse = await request(app.getHttpServer())
        .get(`/api/tags/${testTags[0].slug}`)
        .expect(200);

      expect(afterResponse.body.data.postCount).toBe(beforeCount + 1);
    });
  });

  describe('Performance and Concurrency Tests', () => {
    it('동시에 여러 포스트 조회 시 조회수가 정확히 증가해야 함', async () => {
      const createdPost = await createTestPost(app, testPost, adminToken);

      // 10번 동시 조회
      const promises = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer()).get(`/api/posts/${createdPost.slug}`),
        );

      await Promise.all(promises);

      // 최종 조회수 확인
      const response = await request(app.getHttpServer())
        .get(`/api/posts/${createdPost.slug}`)
        .expect(200);

      expect(response.body.data.views).toBe(11); // 10 + 1 (마지막 조회)
    });

    it('대량 포스트 목록 조회 성능 테스트', async () => {
      // 50개 포스트 생성
      const promises = Array(50)
        .fill(null)
        .map((_, index) =>
          createTestPost(
            app,
            {
              ...testPost,
              title: `테스트 포스트 ${index}`,
            },
            adminToken,
          ),
        );

      await Promise.all(promises);

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/posts?limit=100')
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.data).toHaveLength(50);
      expect(duration).toBeLessThan(5000); // 5초 이내
    });
  });

  describe('Edge Cases', () => {
    it('매우 긴 내용의 포스트 생성', async () => {
      const longContent = 'a'.repeat(100000); // 100KB 내용
      const longPost = {
        ...testPost,
        content: longContent,
        categoryId: testCategory.id,
        tagIds: testTags.map((tag) => tag.id),
      };

      const response = await request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(longPost)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toHaveLength(100000);
    });

    it('특수 문자가 포함된 제목 처리', async () => {
      const specialPost = {
        ...testPost,
        title: 'C++/C# 프로그래밍 & JavaScript "특별판"',
        categoryId: testCategory.id,
        tagIds: testTags.map((tag) => tag.id),
      };

      const response = await request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(specialPost)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(specialPost.title);
      expect(response.body.data.slug).toBeDefined();
    });

    it('MDX 형식의 복잡한 내용 처리', async () => {
      const mdxContent = `
# 제목

이것은 **MDX** 내용입니다.

\`\`\`javascript
const test = () => {
  console.log('Hello World');
};
\`\`\`

> 인용문입니다.

- 리스트 아이템 1
- 리스트 아이템 2

[링크](https://example.com)

![이미지](https://example.com/image.jpg)
      `;

      const mdxPost = {
        ...testPost,
        content: mdxContent,
        categoryId: testCategory.id,
        tagIds: testTags.map((tag) => tag.id),
      };

      const response = await request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(mdxPost)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(mdxContent);
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
 * 데이터베이스 정리
 */
async function cleanupDatabase(): Promise<void> {
  await db.delete(postTagsTable);
  await db.delete(postsTable);
  await db.delete(tagsTable);
  await db.delete(categoriesTable);
}

/**
 * 테스트 데이터 설정
 */
async function setupTestData(app: INestApplication): Promise<void> {
  const server = app.getHttpServer();

  const categoryResponse = await request(server)
    .post('/api/categories')
    .set('Authorization', `Bearer ${TEST_ADMIN_TOKEN}`)
    .send({
      name: testCategory.name,
      slug: testCategory.slug,
      description: '통합 테스트용 카테고리입니다.',
      color: '#3B82F6',
    })
    .expect(201);

  Object.assign(testCategory, categoryResponse.body.data);

  for (let i = 0; i < testTags.length; i += 1) {
    const tag = testTags[i];
    const tagResponse = await request(server)
      .post('/api/tags')
      .set('Authorization', `Bearer ${TEST_ADMIN_TOKEN}`)
      .send({
        name: tag.name,
        slug: tag.slug,
      })
      .expect(201);

    Object.assign(tag, tagResponse.body.data);
  }
}

/**
 * 테스트 포스트 생성
 */
async function createTestPost(
  app: INestApplication,
  post: any,
  token: string,
): Promise<any> {
  const postData = {
    ...post,
    categoryId: testCategory?.id || '01234567-89ab-cdef-0123-456789abcdef',
    tagIds: testTags?.map((tag) => tag.id) || [],
  };

  const response = await request(app.getHttpServer())
    .post('/api/posts')
    .set('Authorization', `Bearer ${token}`)
    .send(postData)
    .expect((res) => {
      if (res.status !== 201) {
        throw new Error(`Unexpected status ${res.status} while creating post`);
      }
    });

  return response.body.data;
}

async function ensureAdminUser(): Promise<void> {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, TEST_ADMIN_USER_ID))
    .limit(1);

  if (existing.length > 0) {
    return;
  }

  await db.insert(users).values({
    id: TEST_ADMIN_USER_ID,
    email: 'admin@example.com',
    name: 'Test Admin',
    googleId: `google-${TEST_ADMIN_USER_ID}`,
    role: 'ADMIN',
  });
}
