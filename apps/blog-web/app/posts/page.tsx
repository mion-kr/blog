import { Suspense } from 'react';
import { Metadata } from 'next';

import { PostsContent } from './posts-content';
import { PostsPageSkeleton } from './loading';
import { WithSidebar } from '@/components/layout/with-sidebar';

export const metadata: Metadata = {
  title: '전체 포스트 | Mion\'s Blog',
  description: '기술 인사이트와 개발 경험을 공유하는 Mion의 블로그 전체 포스트 목록입니다.',
  openGraph: {
    title: '전체 포스트 | Mion\'s Blog',
    description: '기술 인사이트와 개발 경험을 공유하는 Mion의 블로그 전체 포스트 목록입니다.',
    type: 'website',
  },
};

export const revalidate = 60; // 1분마다 재검증

interface PostsPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    category?: string;
    tag?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }>;
}

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const resolvedSearchParams = await searchParams;
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

      {/* 메인 콘텐츠 (사이드바 포함) */}
      <WithSidebar>
        <Suspense fallback={<PostsPageSkeleton />}>
          <PostsContent searchParams={resolvedSearchParams} />
        </Suspense>
      </WithSidebar>
    </div>
  );
}