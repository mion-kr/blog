import { Module } from '@nestjs/common';

import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { DrizzleTagsRepository } from './repositories/drizzle-tags.repository';
import { TAGS_REPOSITORY } from './repositories/tags.repository';

/**
 * 태그 모듈
 *
 * 블로그 태그 관련 기능을 담당하는 모듈:
 * - 태그 CRUD 작업
 * - 슬러그 기반 조회
 * - 포스트 수 계산
 * - 슬러그 중복 검사
 */
@Module({
  controllers: [TagsController],
  providers: [
    TagsService,
    {
      provide: TAGS_REPOSITORY,
      useClass: DrizzleTagsRepository,
    },
  ],
  exports: [TagsService],
})
export class TagsModule {}
