import { PaginationMeta } from '@repo/shared';
import { TestBed } from '@suites/unit';

import { AdminGuard } from '../auth/guards/admin.guard';
import { PostResponseDto } from './dto/post-response.dto';
import { AdminPostsController } from './admin-posts.controller';
import { PostsService } from './posts.service';

describe('AdminPostsController', () => {
  let controller: AdminPostsController;
  let postsService;

  const draftPost = { published: false } as PostResponseDto;

  beforeAll(async () => {
    const { unit, unitRef } =
      await TestBed.solitary(AdminPostsController).compile();
    controller = unit;
    postsService = unitRef.get(PostsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('관리자 인가를 적용해야 함', () => {
    const guards = Reflect.getMetadata('__guards__', AdminPostsController);

    expect(guards).toContain(AdminGuard);
  });

  it('관리자는 미발행 포스트 목록을 조회할 수 있어야 함', async () => {
    const response = {
      items: [draftPost],
      meta: PaginationMeta.create(1, 1, 10),
    };
    postsService.findAllForAdmin.mockResolvedValue(response);

    const result = await controller.findAll({ published: false });

    expect(result).toEqual(response);
    expect(postsService.findAllForAdmin).toHaveBeenCalledWith({
      published: false,
    });
  });

  it('관리자는 미발행 포스트 상세를 조회할 수 있어야 함', async () => {
    postsService.findOneBySlug.mockResolvedValue(draftPost);

    const result = await controller.findOne('draft-post');

    expect(result).toEqual(draftPost);
    expect(postsService.findOneBySlug).toHaveBeenCalledWith('draft-post');
  });
});
