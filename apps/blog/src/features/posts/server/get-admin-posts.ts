// 이관 전 경로를 유지한 타입 모듈
import type { PostsQuery, PostResponseDto } from '@repo/shared';

export interface AdminPostsResult {
  posts: PostResponseDto[];
  total: number;
  postsPerPage: number;
  query: PostsQuery;
  error?: string | null;
}
