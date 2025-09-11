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
import { ApiTags } from '@nestjs/swagger';

import { CategoriesService } from './categories.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';

import { CategoryQueryDto } from './dto/category-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';

import {
  ApiPublicList,
  ApiPublicDetail,
  ApiAdminCreate,
  ApiAdminUpdate,
  ApiAdminDelete,
  ApiConflictError,
} from '../common/decorators';

/**
 * 블로그 카테고리 API 컨트롤러
 * 
 * 엔드포인트:
 * - GET /api/categories - 카테고리 목록 조회 (공개)
 * - GET /api/categories/:slug - 카테고리 상세 조회 (공개)
 * - POST /api/categories - 카테고리 생성 (ADMIN + CSRF)
 * - PUT /api/categories/:slug - 카테고리 수정 (ADMIN + CSRF)
 * - DELETE /api/categories/:slug - 카테고리 삭제 (ADMIN + CSRF)
 */
@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * 카테고리 목록 조회 (공개 API)
   * 쿼리 파라미터로 페이징, 정렬, 필터링 지원
   */
  @Get()
  @ApiPublicList(
    CategoryResponseDto,
    '카테고리 목록 조회',
    '모든 카테고리를 페이징과 필터링을 통해 조회합니다. 공개 API이므로 인증이 필요하지 않습니다.',
  )
  async findAll(@Query() query: CategoryQueryDto): Promise<CategoryResponseDto[]> {
    return this.categoriesService.findAll(query);
  }

  /**
   * 카테고리 상세 조회 (공개 API)
   */
  @Get(':slug')
  @ApiPublicDetail(
    CategoryResponseDto,
    '카테고리 상세 조회',
    '카테고리',
    '슬러그로 특정 카테고리를 조회합니다.',
  )
  async findOne(@Param('slug') slug: string): Promise<CategoryResponseDto> {
    return this.categoriesService.findOneBySlug(slug);
  }

  /**
   * 카테고리 생성 (ADMIN 권한 + CSRF 보호)
   */
  @Post()
  @UseGuards(AdminGuard, CsrfGuard)
  @ApiAdminCreate(CategoryResponseDto, '카테고리 생성')
  @ApiConflictError('슬러그 중복')
  async create(@Body() createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.categoriesService.create(createCategoryDto);
  }

  /**
   * 카테고리 수정 (ADMIN 권한 + CSRF 보호)
   */
  @Put(':slug')
  @UseGuards(AdminGuard, CsrfGuard)
  @ApiAdminUpdate(CategoryResponseDto, '카테고리 수정', '카테고리')
  @ApiConflictError('슬러그 중복')
  async update(
    @Param('slug') slug: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.update(slug, updateCategoryDto);
  }

  /**
   * 카테고리 삭제 (ADMIN 권한 + CSRF 보호)
   */
  @Delete(':slug')
  @UseGuards(AdminGuard, CsrfGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAdminDelete('카테고리 삭제', '카테고리')
  async remove(@Param('slug') slug: string): Promise<void> {
    return this.categoriesService.remove(slug);
  }
}