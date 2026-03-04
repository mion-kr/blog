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
import { ApiTags, ApiExtraModels, ApiQuery } from '@nestjs/swagger';

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
 * - GET /api/posts/:slug - 포스트 상세 조회 (공개, 기본 조회수 증가 / 옵션 비활성화 지원)
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
   * 포스트 상세 조회 (공개 API, 기본 조회수 증가)
   */
  @Get(':slug')
  @ApiPublicDetail(
    PostResponseDto,
    '포스트 상세 조회',
    '포스트',
    '슬러그로 특정 포스트를 조회합니다. trackView=false면 조회수 증가 없이 조회합니다.',
  )
  @ApiQuery({
    name: 'trackView',
    required: false,
    description: '조회수 증가 여부 (기본값: true)',
    schema: { type: 'boolean', default: true },
  })
  async findOne(
    @Param('slug') slug: string,
    @Query('trackView') trackViewRaw?: string,
  ): Promise<PostResponseDto> {
    const trackView = this.parseTrackView(trackViewRaw);

    // 메타데이터/봇 경로에서 조회수 증가를 제어할 수 있도록 trackView 값을 전달합니다.
    return this.postsService.findOneBySlug(slug, { trackView });
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

  /**
   * `trackView` 쿼리 문자열을 boolean으로 변환합니다.
   */
  private parseTrackView(trackViewRaw?: string): boolean {
    // 쿼리가 없거나 알 수 없는 값이면 기존 동작(조회수 증가)을 유지합니다.
    if (trackViewRaw === 'false') {
      return false;
    }

    return true;
  }
}
