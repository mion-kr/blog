import Link from 'next/link';
import { FileQuestion, ArrowLeft, Home, Search } from 'lucide-react';

/**
 * 포스트를 찾을 수 없을 때 표시되는 404 페이지
 */
export default function PostNotFound() {
  return (
    <div className="py-8 max-md:py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center py-16">
          {/* 404 아이콘 */}
          <div className="mb-8">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-muted)]">
              <FileQuestion className="h-12 w-12 text-[var(--color-text-secondary)]" />
            </div>
          </div>

          {/* 제목과 설명 */}
          <div className="mb-8 space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-[var(--color-text-primary)] md:text-5xl">
              포스트를 찾을 수 없습니다
            </h1>
            <p className="text-lg text-[var(--color-text-secondary)] md:text-xl">
              요청하신 포스트가 존재하지 않거나 이동되었을 수 있습니다.
            </p>
          </div>

          {/* 제안 메시지 */}
          <div className="mb-10 rounded-lg bg-[var(--color-card)] p-6 text-left">
            <h3 className="mb-3 font-semibold text-[var(--color-text-primary)]">
              다음 방법을 시도해보세요:
            </h3>
            <ul className="space-y-2 text-[var(--color-text-secondary)]">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent-primary)] flex-shrink-0" />
                URL을 다시 확인해보세요
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent-primary)] flex-shrink-0" />
                홈페이지에서 최신 포스트를 둘러보세요
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent-primary)] flex-shrink-0" />
                검색 기능을 사용해 원하는 내용을 찾아보세요
              </li>
            </ul>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-3 font-semibold text-white hover:bg-[var(--color-accent-primary-hover)] transition-colors"
            >
              <Home className="h-4 w-4" />
              홈으로 돌아가기
            </Link>

            <Link
              href="/posts"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-6 py-3 font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-muted)] transition-colors"
            >
              <Search className="h-4 w-4" />
              모든 포스트 보기
            </Link>
          </div>

          {/* 뒤로 가기 링크 */}
          <div className="mt-8">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              이전 페이지로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}