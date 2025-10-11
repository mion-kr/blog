import { Module } from '@nestjs/common';

import { CategoriesModule } from '../categories/categories.module';
import { UploadsModule } from '../uploads/uploads.module';
import { TagsModule } from '../tags/tags.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { DrizzlePostsRepository } from './repositories/drizzle-posts.repository';
import { POSTS_REPOSITORY } from './repositories/posts.repository';

/**
 * 포스트 모듈
 *
 * 블로그 포스트 관련 기능을 담당하는 모듈:
 * - 포스트 CRUD 작업
 * - 조회수 증가
 * - 페이징 및 필터링
 * - 관계 데이터 포함 (카테고리, 태그, 작성자)
 */
@Module({
  imports: [CategoriesModule, TagsModule, UploadsModule],
  controllers: [PostsController],
  providers: [
    PostsService,
    {
      provide: POSTS_REPOSITORY,
      useClass: DrizzlePostsRepository,
    },
  ],
  exports: [PostsService],
})
export class PostsModule {}
