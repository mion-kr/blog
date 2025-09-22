import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, Eye, Tag as TagIcon, FolderOpen, ArrowLeft } from 'lucide-react';

import { postsApi } from '@/lib/api-client';
import { MDXRenderer } from '@/components/mdx-renderer';
import { ShareButton } from '@/components/share-button';
import { cn } from '@/lib/utils';

import type { PostResponseDto } from '@repo/shared';

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60; // 1분마다 재검증

/**
 * 동적 메타데이터 생성
 */
export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const response = await postsApi.getPostBySlug(slug);

    if (!response.success || !response.data) {
      return {
        title: '포스트를 찾을 수 없습니다 | Mion Blog',
      };
    }

    const post = response.data;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://blog.mion.dev';

    return {
      title: `${post.title} | Mion Blog`,
      description: post.excerpt ?? `${post.title}에 대한 Mion의 기술 블로그 포스트입니다.`,
      openGraph: {
        title: post.title,
        description: post.excerpt ?? `${post.title}에 대한 Mion의 기술 블로그 포스트입니다.`,
        type: 'article',
        publishedTime: new Date(post.publishedAt ?? post.createdAt).toISOString(),
        modifiedTime: new Date(post.updatedAt).toISOString(),
        authors: [post.author.name],
        tags: post.tags.map(tag => tag.name),
        images: post.coverImage ? [{
          url: post.coverImage,
          width: 1200,
          height: 630,
          alt: post.title,
        }] : undefined,
        url: `${baseUrl}/posts/${slug}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: post.title,
        description: post.excerpt ?? `${post.title}에 대한 Mion의 기술 블로그 포스트입니다.`,
        images: post.coverImage ? [post.coverImage] : undefined,
      },
      alternates: {
        canonical: `${baseUrl}/posts/${slug}`,
      },
    };
  } catch {
    return {
      title: '포스트를 찾을 수 없습니다 | Mion Blog',
    };
  }
}

/**
 * 포스트 상세 페이지
 */
export default async function PostPage({ params }: PostPageProps) {
  try {
    const { slug } = await params;

    // 포스트 데이터 조회
    const response = await postsApi.getPostBySlug(slug);

    if (!response.success || !response.data) {
      notFound();
    }

    const post = response.data;

    return (
      <article className="blog-post-page">
        {/* 상단 네비게이션 */}
        <PostNavigation />

        {/* 포스트 헤더 */}
        <PostHeader post={post} />

        {/* 포스트 본문 */}
        <PostContent post={post} />

        {/* 포스트 푸터 */}
        <PostFooter post={post} />
      </article>
    );
  } catch (error) {
    console.error('Error loading post:', error);
    notFound();
  }
}

/**
 * 포스트 상단 네비게이션
 */
function PostNavigation() {
  return (
    <nav className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-background)]/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            홈으로 돌아가기
          </Link>

          <ShareButton />
        </div>
      </div>
    </nav>
  );
}

/**
 * 포스트 헤더
 */
function PostHeader({ post }: { post: PostResponseDto }) {
  const displayDate = post.publishedAt ?? post.createdAt;

  return (
    <header className="py-8 max-md:py-6 bg-gradient-to-b from-[var(--color-hero-gradient-from)] to-[var(--color-background)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8 py-16">
          {/* 카테고리 및 메타 정보 */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link
              href={`/category/${post.category.slug}`}
              className="blog-category-badge"
            >
              <FolderOpen className="h-3 w-3" />
              {post.category.name}
            </Link>

            <span className="flex items-center gap-1 text-[var(--color-text-secondary)]">
              <CalendarDays className="h-4 w-4" />
              {formatDate(displayDate)}
            </span>

            <span className="flex items-center gap-1 text-[var(--color-text-secondary)]">
              <Eye className="h-4 w-4" />
              {formatNumber(post.viewCount)} views
            </span>
          </div>

          {/* 제목 */}
          <h1 className="text-4xl font-bold tracking-tight text-[var(--color-text-primary)] md:text-5xl lg:text-6xl">
            {post.title}
          </h1>

          {/* 요약 */}
          {post.excerpt && (
            <p className="text-xl leading-relaxed text-[var(--color-text-secondary)] md:text-2xl">
              {post.excerpt}
            </p>
          )}

          {/* 태그 목록 */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/tag/${tag.slug}`}
                  className="blog-tag"
                >
                  <TagIcon className="h-3 w-3" />
                  {tag.name}
                </Link>
              ))}
            </div>
          )}

        </div>
      </div>
    </header>
  );
}

/**
 * 포스트 본문
 */
function PostContent({ post }: { post: PostResponseDto }) {
  return (
    <main className="py-8 max-md:py-6 border-t-4 border-[var(--color-border)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* 커버 이미지 */}
          {post.coverImage && (
            <div className="relative mb-12 aspect-video overflow-hidden rounded-xl bg-[var(--color-muted)]">
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                priority
              />
            </div>
          )}

          {/* MDX 콘텐츠 */}
          <div className="prose prose-slate max-w-none prose-headings:text-[var(--color-text-primary)] prose-p:text-[var(--color-text-secondary)] prose-a:text-[var(--color-primary)] prose-strong:text-[var(--color-text-primary)] prose-code:text-[var(--color-accent-primary)] prose-pre:bg-[var(--color-muted)] prose-blockquote:border-l-[var(--color-primary)]">
            <MDXRenderer content={post.content} />
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * 포스트 푸터
 */
function PostFooter({ post }: { post: PostResponseDto }) {
  return (
    <footer className="py-8 max-md:py-6 border-t border-[var(--color-border)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8 py-16">
          {/* 태그 목록 (다시 표시) */}
          {post.tags.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                관련 태그
              </h3>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/tag/${tag.slug}`}
                    className={cn(
                      "blog-tag text-sm",
                      "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] hover:bg-[var(--color-secondary)]/80"
                    )}
                  >
                    <TagIcon className="h-3 w-3" />
                    {tag.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 포스트 정보 */}
          <div className="rounded-xl bg-[var(--color-card)] p-6 space-y-4">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              포스트 정보
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                  카테고리
                </p>
                <Link
                  href={`/category/${post.category.slug}`}
                  className="font-semibold text-[var(--color-primary)] hover:text-[var(--color-accent-primary-hover)]"
                >
                  {post.category.name}
                </Link>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                  발행일
                </p>
                <p className="font-semibold text-[var(--color-text-primary)]">
                  {formatDate(post.publishedAt ?? post.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                  조회수
                </p>
                <p className="font-semibold text-[var(--color-text-primary)]">
                  {formatNumber(post.viewCount)}회
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                  마지막 수정
                </p>
                <p className="font-semibold text-[var(--color-text-primary)]">
                  {formatDate(post.updatedAt)}
                </p>
              </div>
            </div>
          </div>

          {/* 홈으로 돌아가기 링크 */}
          <div className="text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-3 font-semibold text-white hover:bg-[var(--color-accent-primary-hover)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/**
 * 날짜 포맷팅 함수
 */
function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj);
}

/**
 * 숫자 포맷팅 함수
 */
function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value);
}