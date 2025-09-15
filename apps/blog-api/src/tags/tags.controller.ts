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

import { TagsService } from './tags.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';

import { TagQueryDto } from './dto/tag-query.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagResponseDto } from './dto/tag-response.dto';

import {
  ApiPublicList,
  ApiPublicDetail,
  ApiAdminCreate,
  ApiAdminUpdate,
  ApiAdminDelete,
  ApiConflictError,
  PaginatedResponse,
} from '../common/decorators';

/**
 * 블로그 태그 API 컨트롤러
 * 
 * 엔드포인트:
 * - GET /api/tags - 태그 목록 조회 (공개)
 * - GET /api/tags/:slug - 태그 상세 조회 (공개)
 * - POST /api/tags - 태그 생성 (ADMIN + CSRF)
 * - PUT /api/tags/:slug - 태그 수정 (ADMIN + CSRF)
 * - DELETE /api/tags/:slug - 태그 삭제 (ADMIN + CSRF)
 */
@ApiExtraModels(TagResponseDto)
@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  /**
   * 태그 목록 조회 (공개 API)
   * 쿼리 파라미터로 페이징, 정렬, 필터링 지원
   */
  @Get()
  @PaginatedResponse()
  @ApiPublicList(
    TagResponseDto,
    '태그 목록 조회',
    '모든 태그를 페이징과 필터링을 통해 조회합니다. 공개 API이므로 인증이 필요하지 않습니다.',
  )
  async findAll(@Query() query: TagQueryDto): Promise<TagResponseDto[]> {
    return this.tagsService.findAll(query);
  }

  /**
   * 태그 상세 조회 (공개 API)
   */
  @Get(':slug')
  @ApiPublicDetail(
    TagResponseDto,
    '태그 상세 조회',
    '태그',
    '슬러그로 특정 태그를 조회합니다.',
  )
  async findOne(@Param('slug') slug: string): Promise<TagResponseDto> {
    return this.tagsService.findOneBySlug(slug);
  }

  /**
   * 태그 생성 (ADMIN 권한 + CSRF 보호)
   */
  @Post()
  @UseGuards(AdminGuard, CsrfGuard)
  @ApiAdminCreate(TagResponseDto, '태그 생성')
  @ApiConflictError('슬러그 중복')
  async create(@Body() createTagDto: CreateTagDto): Promise<TagResponseDto> {
    return this.tagsService.create(createTagDto);
  }

  /**
   * 태그 수정 (ADMIN 권한 + CSRF 보호)
   */
  @Put(':slug')
  @UseGuards(AdminGuard, CsrfGuard)
  @ApiAdminUpdate(TagResponseDto, '태그 수정', '태그')
  @ApiConflictError('슬러그 중복')
  async update(
    @Param('slug') slug: string,
    @Body() updateTagDto: UpdateTagDto,
  ): Promise<TagResponseDto> {
    return this.tagsService.update(slug, updateTagDto);
  }

  /**
   * 태그 삭제 (ADMIN 권한 + CSRF 보호)
   */
  @Delete(':slug')
  @UseGuards(AdminGuard, CsrfGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAdminDelete('태그 삭제', '태그')
  async remove(@Param('slug') slug: string): Promise<void> {
    return this.tagsService.remove(slug);
  }
}