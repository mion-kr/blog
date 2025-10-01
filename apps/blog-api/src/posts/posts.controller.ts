import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiExtraModels } from '@nestjs/swagger';

import { PostsService } from './posts.service';
import { AdminGuard } from '../auth/guards/admin.guard';

import { PostQueryDto } from './dto/post-query.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import {
  PostResponseDto,
  AuthorResponseDto,
  PostCategoryResponseDto,
} from './dto/post-response.dto';
import { PaginatedData } from '@repo/shared';
import { TagResponseDto } from '../tags/dto/tag-response.dto';

import {
  ApiPublicList,
  ApiPublicDetail,
  ApiAdminCreate,
  ApiAdminUpdate,
  ApiAdminDelete,
  ResponseMessage,
  PaginatedResponse,
  User,
  CurrentUser,
} from '../common/decorators';

/**
 * 블로그 포스트 API 컨트롤러
 *
 * 엔드포인트:
 * - GET /api/posts - 포스트 목록 조회 (공개)
 * - GET /api/posts/:slug - 포스트 상세 조회 (공개, 조회수 증가)
 * - POST /api/posts - 포스트 생성 (ADMIN + CSRF)
 * - PUT /api/posts/:slug - 포스트 수정 (ADMIN + CSRF)
 * - DELETE /api/posts/:slug - 포스트 삭제 (ADMIN + CSRF)
 */
@ApiExtraModels(
  PostResponseDto,
  AuthorResponseDto,
  PostCategoryResponseDto,
  TagResponseDto,
)
@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  /**
   * 포스트 목록 조회 (공개 API)
   * 쿼리 파라미터로 페이징, 정렬, 필터링 지원
   */
  @Get()
  @PaginatedResponse()
  @ApiPublicList(
    PostResponseDto,
    '포스트 목록 조회',
    '발행된 포스트들을 페이징과 필터링을 통해 조회합니다. 공개 API이므로 인증이 필요하지 않습니다.',
  )
  async findAll(
    @Query() query: PostQueryDto,
  ): Promise<PaginatedData<PostResponseDto>> {
    return this.postsService.findAll(query);
  }

  /**
   * 포스트 상세 조회 (공개 API, 조회수 증가)
   */
  @Get(':slug')
  @ApiPublicDetail(
    PostResponseDto,
    '포스트 상세 조회',
    '포스트',
    '슬러그로 특정 포스트를 조회합니다. 조회할 때마다 조회수가 1 증가합니다.',
  )
  async findOne(@Param('slug') slug: string): Promise<PostResponseDto> {
    return this.postsService.findOneBySlug(slug);
  }

  /**
   * 포스트 생성 (ADMIN 권한 + CSRF 보호)
   */
  @Post()
  @UseGuards(AdminGuard)
  @ApiAdminCreate(PostResponseDto, '포스트 생성')
  async create(
    @User() user: CurrentUser,
    @Body() createPostDto: CreatePostDto,
  ): Promise<PostResponseDto> {
    return this.postsService.create(createPostDto, user.id);
  }

  /**
   * 포스트 수정 (ADMIN 권한 + CSRF 보호)
   */
  @Put(':slug')
  @UseGuards(AdminGuard)
  @ApiAdminUpdate(PostResponseDto, '포스트 수정', '포스트')
  async update(
    @Param('slug') slug: string,
    @User() user: CurrentUser,
    @Body() updatePostDto: UpdatePostDto,
  ): Promise<PostResponseDto> {
    return this.postsService.update(slug, updatePostDto, user.id);
  }

  /**
   * 포스트 삭제 (ADMIN 권한 + CSRF 보호)
   */
  @Delete(':slug')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAdminDelete('포스트 삭제', '포스트')
  async remove(
    @Param('slug') slug: string,
    @User() user: CurrentUser,
  ): Promise<void> {
    return this.postsService.remove(slug, user.id);
  }
}
