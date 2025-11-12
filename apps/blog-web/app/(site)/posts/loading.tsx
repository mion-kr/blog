import { PostCardSkeleton } from '@/components/post-card';
import { WithSidebar } from '@/components/layout/with-sidebar';

export default function PostsLoading() {
  return <PostsPageSkeleton />;
}

/**
 * 포스트 페이지 스켈레톤 로딩 컴포넌트
 */
export function PostsPageSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* 페이지 헤더 */}
      <section className="bg-gradient-to-b from-[var(--color-hero-gradient-from)] via-[var(--color-hero-gradient-via)] to-[var(--color-background)] py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-[var(--color-text-primary)] md:text-5xl">
              모든 기술 이야기
            </h1>
            <p className="text-lg text-[var(--color-text-secondary)] md:text-xl max-w-2xl mx-auto">
              실무에서 쌓아온 개발 경험과 기술적 깨달음을 정리한 모든 글들이 여기에 있습니다.
              필터와 검색으로 원하는 이야기를 찾아보세요.
            </p>
          </div>
        </div>
      </section>

      <WithSidebar>
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

          {/* 포스트 그리드 스켈레톤 */}
          <div className="blog-posts-grid">
            {Array.from({ length: 12 }, (_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </WithSidebar>
    </div>
  );
}
