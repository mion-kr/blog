import { PostCardSkeleton } from '@/components/post-card';

export default function PostsLoading() {
  return <PostsPageSkeleton />;
}

/**
 * 포스트 페이지 스켈레톤 로딩 컴포넌트
 */
export function PostsPageSkeleton() {
  return (
    <div className="space-y-8">
      {/* 필터 스켈레톤 */}
      <div className="space-y-4">
        {/* 검색 바 스켈레톤 */}
        <div className="h-12 bg-[var(--color-muted)] rounded-lg animate-pulse" />

        {/* 필터 버튼들 스켈레톤 */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-10 w-24 bg-[var(--color-muted)] rounded-lg animate-pulse" />
          <div className="h-10 w-20 bg-[var(--color-muted)] rounded-lg animate-pulse" />
          <div className="h-10 w-28 bg-[var(--color-muted)] rounded-lg animate-pulse" />
        </div>
      </div>

      {/* 결과 상태 스켈레톤 */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 bg-[var(--color-muted)] rounded animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-[var(--color-muted)] rounded animate-pulse" />
          <div className="h-8 w-8 bg-[var(--color-muted)] rounded animate-pulse" />
        </div>
      </div>

      {/* 포스트 그리드 스켈레톤 */}
      <div className="blog-posts-grid">
        {Array.from({ length: 12 }, (_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>

      {/* 페이지네이션 스켈레톤 */}
      <div className="flex flex-col gap-4">
        <div className="text-center">
          <div className="h-5 w-48 bg-[var(--color-muted)] rounded animate-pulse mx-auto" />
        </div>
        <div className="flex items-center justify-center gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="h-9 w-9 bg-[var(--color-muted)] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}