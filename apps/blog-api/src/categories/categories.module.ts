import { Module } from '@nestjs/common';

import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { DrizzleCategoriesRepository } from './repositories/drizzle-categories.repository';
import { CATEGORIES_REPOSITORY } from './repositories/categories.repository';

/**
 * 카테고리 모듈
 *
 * 블로그 카테고리 관련 기능을 담당하는 모듈:
 * - 카테고리 CRUD 작업
 * - 슬러그 기반 조회
 * - 포스트 수 계산
 * - 슬러그 중복 검사
 */
@Module({
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    {
      provide: CATEGORIES_REPOSITORY,
      useClass: DrizzleCategoriesRepository,
    },
  ],
  exports: [CategoriesService],
})
export class CategoriesModule {}
