import { Controller, Get, Param, Query } from '@nestjs/common';
import { PaginatedData } from '@repo/shared';

import { TagResponseDto } from '../tags/dto/tag-response.dto';
import {
  ApiAdminController,
  ApiAdminDetail,
  ApiAdminErrors,
  ApiPublicList,
  PaginatedResponse,
} from '../common/decorators';
import {
  AuthorResponseDto,
  PostCategoryResponseDto,
  PostResponseDto,
} from './dto/post-response.dto';
import { PostQueryDto } from './dto/post-query.dto';
import { PostsService } from './posts.service';

@ApiAdminController(
  'admin-posts',
  PostResponseDto,
  AuthorResponseDto,
  PostCategoryResponseDto,
  TagResponseDto,
)
@Controller('admin/posts')
export class AdminPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @PaginatedResponse()
  @ApiPublicList(
    PostResponseDto,
    '관리자 포스트 목록 조회',
    'ADMIN 권한으로 발행 및 미발행 포스트를 페이징과 필터링을 통해 조회합니다.',
  )
  @ApiAdminErrors()
  async findAll(
    @Query() query: PostQueryDto,
  ): Promise<PaginatedData<PostResponseDto>> {
    return this.postsService.findAllForAdmin(query);
  }

  @Get(':slug')
  @ApiAdminDetail(
    PostResponseDto,
    '관리자 포스트 상세 조회',
    'ADMIN 권한으로 발행 상태와 관계없이 포스트를 조회합니다.',
  )
  async findOne(@Param('slug') slug: string): Promise<PostResponseDto> {
    return this.postsService.findOneBySlug(slug);
  }
}
