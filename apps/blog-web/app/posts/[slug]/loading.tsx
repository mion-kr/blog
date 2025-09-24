import { cn } from '@/lib/utils';

/**
 * 포스트 로딩 스켈레톤 컴포넌트
 */
export default function PostLoading() {
  return (
    <div className="blog-post-page animate-pulse">
      {/* 상단 네비게이션 스켈레톤 */}
      <nav className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-background)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="h-4 w-32 bg-gray-300 rounded" />
            <div className="h-8 w-20 bg-gray-300 rounded" />
          </div>
        </div>
      </nav>

      {/* 포스트 헤더 스켈레톤 */}
      <header className="py-8 max-md:py-6 bg-gradient-to-b from-[var(--color-hero-gradient-from)] to-[var(--color-background)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-8 py-16">
            {/* 메타 정보 스켈레톤 */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-6 w-20 bg-gray-300 rounded-full" />
              <div className="h-4 w-24 bg-gray-300 rounded" />
              <div className="h-4 w-16 bg-gray-300 rounded" />
            </div>

            {/* 제목 스켈레톤 */}
            <div className="space-y-4">
              <div className="h-12 bg-gray-300 rounded w-full" />
              <div className="h-12 bg-gray-300 rounded w-3/4" />
            </div>

            {/* 요약 스켈레톤 */}
            <div className="space-y-3">
              <div className="h-6 bg-gray-300 rounded w-full" />
              <div className="h-6 bg-gray-300 rounded w-5/6" />
              <div className="h-6 bg-gray-300 rounded w-4/5" />
            </div>

            {/* 태그 스켈레톤 */}
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-6 w-16 bg-gray-300 rounded-full" />
              ))}
            </div>

            {/* 작성자 정보 스켈레톤 */}
            <div className="flex items-center gap-4 rounded-xl bg-[var(--color-card)] p-6">
              <div className="h-16 w-16 bg-gray-300 rounded-full flex-shrink-0" />
              <div className="space-y-2">
                <div className="h-5 w-24 bg-gray-300 rounded" />
                <div className="h-4 w-16 bg-gray-300 rounded" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 포스트 본문 스켈레톤 */}
      <main className="py-8 max-md:py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            {/* 커버 이미지 스켈레톤 */}
            <div className="relative mb-12 aspect-video overflow-hidden rounded-xl bg-gray-300" />

            {/* 콘텐츠 스켈레톤 */}
            <div className="space-y-8">
              {/* 단락 1 */}
              <div className="space-y-4">
                <div className="h-8 bg-gray-300 rounded w-2/3" />
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-4 bg-gray-300 rounded" />
                  ))}
                  <div className="h-4 bg-gray-300 rounded w-4/5" />
                </div>
              </div>

              {/* 코드 블록 스켈레톤 */}
              <div className="h-32 bg-gray-300 rounded-lg" />

              {/* 단락 2 */}
              <div className="space-y-4">
                <div className="h-6 bg-gray-300 rounded w-1/2" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-4 bg-gray-300 rounded" />
                  ))}
                  <div className="h-4 bg-gray-300 rounded w-3/4" />
                </div>
              </div>

              {/* 이미지 스켈레톤 */}
              <div className="h-64 bg-gray-300 rounded-lg" />

              {/* 단락 3 */}
              <div className="space-y-4">
                <div className="h-6 bg-gray-300 rounded w-3/5" />
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-4 bg-gray-300 rounded" />
                  ))}
                  <div className="h-4 bg-gray-300 rounded w-2/3" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 포스트 푸터 스켈레톤 */}
      <footer className="py-8 max-md:py-6 border-t border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-8 py-16">
            {/* 태그 섹션 스켈레톤 */}
            <div className="space-y-4">
              <div className="h-6 w-20 bg-gray-300 rounded" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-6 w-16 bg-gray-300 rounded-full" />
                ))}
              </div>
            </div>

            {/* 포스트 정보 스켈레톤 */}
            <div className="rounded-xl bg-[var(--color-card)] p-6 space-y-4">
              <div className="h-6 w-24 bg-gray-300 rounded" />
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-16 bg-gray-300 rounded" />
                    <div className="h-5 w-24 bg-gray-300 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* 홈으로 돌아가기 버튼 스켈레톤 */}
            <div className="text-center">
              <div className="h-12 w-40 bg-gray-300 rounded-lg mx-auto" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * 포스트 콘텐츠 스켈레톤 컴포넌트 (재사용 가능)
 */
export function PostContentSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6 animate-pulse', className)}>
      {/* 제목 스켈레톤 */}
      <div className="space-y-3">
        <div className="h-8 bg-gray-200 rounded w-3/4" />
        <div className="h-6 bg-gray-200 rounded w-1/2" />
      </div>

      {/* 단락 스켈레톤 */}
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>

      {/* 코드 블록 스켈레톤 */}
      <div className="h-32 bg-gray-200 rounded-lg" />

      {/* 더 많은 단락 스켈레톤 */}
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-4/5" />
      </div>

      {/* 이미지 스켈레톤 */}
      <div className="h-48 bg-gray-200 rounded-lg" />

      {/* 마지막 단락 스켈레톤 */}
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>
    </div>
  );
}