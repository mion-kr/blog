// 이관 전 경로를 유지한 타입 모듈(관리자 컴포넌트가 import한다)
import type { PostResponseDto } from '@repo/shared';

export interface AdminDashboardData {
  publishedTotal: number;
  draftTotal: number;
  categoryTotal: number;
  tagTotal: number;
  recentDrafts: PostResponseDto[];
}
