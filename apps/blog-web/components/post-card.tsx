'use client';

import Image from 'next/image';
import Link from 'next/link';
import { PostResponseDto } from '@repo/shared';
import { cn } from '@/lib/utils';
import { CalendarDays, Eye, Tag } from 'lucide-react';

interface PostCardProps {
  post: PostResponseDto;
  className?: string;
}

/**
 * 날짜를 읽기 쉬운 형태로 포맷팅
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
 * 텍스트를 지정된 길이로 자르기
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * 포스트 카드 컴포넌트
 */
export function PostCard({ post, className }: PostCardProps) {
  const {
    title,
    slug,
    excerpt,
    coverImage,
    category,
    tags,
    author,
    publishedAt,
    createdAt,
    viewCount,
  } = post;

  // 발행일이 있으면 발행일을, 없으면 생성일을 사용
  const displayDate = publishedAt ?? createdAt;

  return (
    <article
      className={cn(
        'blog-post-card group',
        className
      )}
    >
      {/* 커버 이미지 */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/80">
            <div className="text-center text-muted-foreground">
              <div className="mx-auto h-12 w-12 rounded-full bg-muted-foreground/20 mb-2" />
              <span className="text-sm">No Image</span>
            </div>
          </div>
        )}
        
        {/* 카테고리 배지 */}
        <div className="absolute top-3 left-3">
          <span className="blog-category-badge">
            {category.name}
          </span>
        </div>
      </div>

      {/* 카드 콘텐츠 */}
      <div className="flex flex-1 flex-col p-6">
        {/* 제목 */}
        <h3 className="blog-post-title mb-2 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          <Link href={`/posts/${slug}`} className="stretched-link">
            {title}
          </Link>
        </h3>

        {/* 요약 */}
        {excerpt && (
          <p className="blog-post-excerpt mb-4 flex-1">
            {truncateText(excerpt, 150)}
          </p>
        )}

        {/* 태그 목록 */}
        {tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="blog-tag gap-1"
              >
                <Tag className="h-3 w-3" />
                {tag.name}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="blog-tag">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* 메타 정보 */}
        <div className="blog-post-meta justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formatDate(displayDate)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {viewCount.toLocaleString()}
            </span>
          </div>
          
          {/* 작성자 정보 */}
          <div className="flex items-center gap-2">
            {author.image && (
              <Image
                src={author.image}
                alt={author.name}
                width={20}
                height={20}
                className="rounded-full"
              />
            )}
            <span className="font-medium">{author.name}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * 포스트 카드 스켈레톤 로딩 컴포넌트
 */
export function PostCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm',
        className
      )}
    >
      {/* 이미지 스켈레톤 */}
      <div className="aspect-video w-full bg-muted animate-pulse" />
      
      {/* 콘텐츠 스켈레톤 */}
      <div className="flex flex-1 flex-col p-6 space-y-4">
        {/* 제목 스켈레톤 */}
        <div className="space-y-2">
          <div className="h-5 bg-muted rounded animate-pulse" />
          <div className="h-5 bg-muted rounded w-3/4 animate-pulse" />
        </div>
        
        {/* 요약 스켈레톤 */}
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
        </div>
        
        {/* 태그 스켈레톤 */}
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-muted rounded animate-pulse" />
          <div className="h-6 w-20 bg-muted rounded animate-pulse" />
          <div className="h-6 w-14 bg-muted rounded animate-pulse" />
        </div>
        
        {/* 메타 정보 스켈레톤 */}
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-4 w-12 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 bg-muted rounded-full animate-pulse" />
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
