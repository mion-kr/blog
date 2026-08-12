import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  NotFoundException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PaginationMeta } from '@repo/shared';
import request from 'supertest';

import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminPostsController } from './admin-posts.controller';
import { PostResponseDto } from './dto/post-response.dto';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

const TEST_ADMIN_TOKEN = 'test-admin-token';

const createMockAdminGuard = (): CanActivate => ({
  canActivate: (context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;

    if (authorization === `Bearer ${TEST_ADMIN_TOKEN}`) {
      return true;
    }

    throw new UnauthorizedException('Invalid token for testing');
  },
});

describe('Posts access boundaries', () => {
  let app: INestApplication;
  let postsService: jest.Mocked<PostsService>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [PostsController, AdminPostsController],
      providers: [
        {
          provide: PostsService,
          useValue: {
            findAll: jest.fn(),
            findPublishedBySlug: jest.fn(),
            findAllForAdmin: jest.fn(),
            findOneBySlug: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AdminGuard)
      .useValue(createMockAdminGuard())
      .compile();

    postsService = moduleFixture.get<jest.Mocked<PostsService>>(PostsService);
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('공개 목록은 미발행 필터 요청을 공개 조회 use-case에만 전달해야 함', async () => {
    postsService.findAll.mockResolvedValue({
      items: [],
      meta: PaginationMeta.create(0, 1, 10),
    });

    await request(app.getHttpServer())
      .get('/api/posts?published=false')
      .expect(200);

    expect(postsService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ published: false }),
    );
    expect(postsService.findAllForAdmin).not.toHaveBeenCalled();
  });

  it('공개 상세는 미발행 포스트를 찾을 수 없음으로 응답해야 함', async () => {
    postsService.findPublishedBySlug.mockRejectedValue(
      new NotFoundException(
        "슬러그 'draft-post'에 해당하는 포스트를 찾을 수 없습니다.",
      ),
    );

    await request(app.getHttpServer()).get('/api/posts/draft-post').expect(404);

    expect(postsService.findPublishedBySlug).toHaveBeenCalledWith(
      'draft-post',
      { trackView: true },
    );
    expect(postsService.findOneBySlug).not.toHaveBeenCalled();
  });

  it('인증되지 않은 요청은 관리자 초안 목록을 조회할 수 없어야 함', async () => {
    await request(app.getHttpServer()).get('/api/admin/posts').expect(401);

    expect(postsService.findAllForAdmin).not.toHaveBeenCalled();
  });

  it('관리자는 미발행 포스트 목록과 상세를 조회할 수 있어야 함', async () => {
    const draft = {
      id: 'post-1',
      title: 'Draft Post',
      slug: 'draft-post',
      content: '# Draft',
      published: false,
    } as PostResponseDto;
    postsService.findAllForAdmin.mockResolvedValue({
      items: [draft],
      meta: PaginationMeta.create(1, 1, 10),
    });
    postsService.findOneBySlug.mockResolvedValue(draft);

    const listResponse = await request(app.getHttpServer())
      .get('/api/admin/posts?published=false')
      .set('Authorization', `Bearer ${TEST_ADMIN_TOKEN}`)
      .expect(200);
    const detailResponse = await request(app.getHttpServer())
      .get('/api/admin/posts/draft-post')
      .set('Authorization', `Bearer ${TEST_ADMIN_TOKEN}`)
      .expect(200);

    expect(listResponse.body.items[0]).toMatchObject({ published: false });
    expect(detailResponse.body).toMatchObject({ published: false });
    expect(postsService.findAllForAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ published: false }),
    );
    expect(postsService.findOneBySlug).toHaveBeenCalledWith('draft-post');
  });
});
