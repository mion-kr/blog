'use client';

import Image from 'next/image';
import Link from 'next/link';
import { PostResponseDto } from '@repo/shared';
import { cn } from '@/lib/utils';
import { CalendarDays, Eye, ImageOff, Tag } from 'lucide-react';

interface PostCardProps {
  post: PostResponseDto;
  className?: string;
  viewMode?: 'grid' | 'list';
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
export function PostCard({ post, className, viewMode = 'grid' }: PostCardProps) {
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
        viewMode === 'list' ? 'blog-post-card-list' : '',
        className
      )}
    >
      {/* 커버 이미지 */}
      <div className={cn(
        "relative overflow-hidden bg-muted",
        viewMode === 'list'
          ? "aspect-[4/3] w-60 flex-shrink-0 sm:w-64 md:w-72"
          : "aspect-video w-full"
      )}>
        {coverImage ? (
          <Image
            src={coverImage}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes={viewMode === 'list'
              ? "208px"
              : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            }
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-muted to-muted/80 px-4 py-6 text-muted-foreground">
            <div className={cn(
              "flex items-center justify-center rounded-full bg-muted-foreground/15",
              viewMode === 'list' ? "h-20 w-20" : "h-20 w-20"
            )}>
              <ImageOff
                aria-hidden
                className={cn(viewMode === 'list' ? "h-10 w-10" : "h-10 w-10")}
              />
            </div>
            <span className={cn(
              "font-semibold",
              viewMode === 'list' ? "text-lg" : "text-lg"
            )}>
              No Image
            </span>
            <span className={cn(
              "text-xs opacity-80",
              viewMode === 'list' ? "hidden" : "block"
            )}>
              준비 중인 커버 이미지에요
            </span>
          </div>
        )}

        {/* 카테고리 배지 */}
        <div className={cn(
          "absolute",
          viewMode === 'list' ? "top-2 left-2" : "top-3 left-3"
        )}>
          <span className="blog-category-badge">
            {category.name}
          </span>
        </div>
      </div>

      {/* 카드 콘텐츠 */}
      <div className={cn(
        "flex flex-1",
        viewMode === 'list' ? "flex-col p-2 justify-between" : "flex-col p-3"
      )}>
        {/* 제목 */}
        <h3 className={cn(
          "blog-post-title mb-2 overflow-hidden",
          viewMode === 'list'
            ? "text-lg leading-tight"
            : ""
        )} style={viewMode === 'list'
          ? { display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }
          : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }
        }>
          <Link href={`/posts/${slug}`} className="stretched-link">
            {title}
          </Link>
        </h3>

        {/* 요약 - 리스트 뷰에서는 더 짧게 */}
        {excerpt && (
          <p className={cn(
            "blog-post-excerpt mb-4 flex-1",
            viewMode === 'list' ? "text-sm" : ""
          )} style={viewMode === 'list'
            ? { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }
            : undefined
          }>
            {truncateText(excerpt, viewMode === 'list' ? 100 : 150)}
          </p>
        )}

        {/* 태그 목록 - 리스트 뷰에서는 개수 제한 */}
        {tags.length > 0 && (
          <div className={cn(
            "mb-4 flex flex-wrap gap-1",
            viewMode === 'list' ? "mb-2" : ""
          )}>
            {tags.slice(0, viewMode === 'list' ? 2 : 3).map((tag) => (
              <span
                key={tag.id}
                className={cn(
                  "blog-tag gap-1",
                  viewMode === 'list' ? "text-xs px-2 py-1" : ""
                )}
              >
                <Tag className={cn(
                  viewMode === 'list' ? "h-2.5 w-2.5" : "h-3 w-3"
                )} />
                {tag.name}
              </span>
            ))}
            {tags.length > (viewMode === 'list' ? 2 : 3) && (
              <span className={cn(
                "blog-tag",
                viewMode === 'list' ? "text-xs px-2 py-1" : ""
              )}>
                +{tags.length - (viewMode === 'list' ? 2 : 3)}
              </span>
            )}
          </div>
        )}

        {/* 메타 정보 */}
        <div className={cn(
          "blog-post-meta",
          viewMode === 'list'
            ? "flex-wrap gap-2 text-xs"
            : "justify-between"
        )}>
          <div className={cn(
            "flex items-center",
            viewMode === 'list' ? "gap-3" : "gap-4"
          )}>
            <span className="flex items-center gap-1">
              <CalendarDays className={cn(
                viewMode === 'list' ? "h-2.5 w-2.5" : "h-3 w-3"
              )} />
              {formatDate(displayDate)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className={cn(
                viewMode === 'list' ? "h-2.5 w-2.5" : "h-3 w-3"
              )} />
              {viewCount.toLocaleString()}
            </span>

            {/* 리스트 뷰에서는 작성자를 같은 줄에 표시 */}
            {viewMode === 'list' && (
              <div className="flex items-center gap-1">
                {author.image && (
                  <Image
                    src={author.image}
                    alt={author.name}
                    width={16}
                    height={16}
                    className="rounded-full"
                  />
                )}
                <span className="font-medium">{author.name}</span>
              </div>
            )}
          </div>

          {/* 작성자 정보 - 그리드 뷰에서만 */}
          {viewMode === 'grid' && (
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
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * 포스트 카드 스켈레톤 로딩 컴포넌트
 */
export function PostCardSkeleton({ className, viewMode = 'grid' }: { className?: string; viewMode?: 'grid' | 'list' }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-card shadow-sm',
        viewMode === 'list' ? 'flex flex-row gap-4 p-3' : 'flex flex-col',
        className
      )}
    >
      {/* 이미지 스켈레톤 */}
      <div className={cn(
        "bg-muted animate-pulse",
        viewMode === 'list' ? "aspect-[4/3] w-32 flex-shrink-0" : "aspect-video w-full"
      )} />

      {/* 콘텐츠 스켈레톤 */}
      <div className={cn(
        "flex flex-1 flex-col space-y-4",
        viewMode === 'list' ? "p-0" : "p-3"
      )}>
        {/* 제목 스켈레톤 */}
        <div className="space-y-2">
          <div className={cn(
            "bg-muted rounded animate-pulse",
            viewMode === 'list' ? "h-4" : "h-5"
          )} />
          {viewMode === 'grid' && (
            <div className="h-5 bg-muted rounded w-3/4 animate-pulse" />
          )}
        </div>

        {/* 요약 스켈레톤 */}
        <div className="space-y-2 flex-1">
          <div className={cn(
            "bg-muted rounded animate-pulse",
            viewMode === 'list' ? "h-3" : "h-4"
          )} />
          <div className={cn(
            "bg-muted rounded animate-pulse",
            viewMode === 'list' ? "h-3 w-4/5" : "h-4"
          )} />
          {viewMode === 'grid' && (
            <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
          )}
        </div>

        {/* 태그 스켈레톤 */}
        <div className="flex gap-2">
          <div className={cn(
            "bg-muted rounded animate-pulse",
            viewMode === 'list' ? "h-5 w-12" : "h-6 w-16"
          )} />
          <div className={cn(
            "bg-muted rounded animate-pulse",
            viewMode === 'list' ? "h-5 w-16" : "h-6 w-20"
          )} />
          {viewMode === 'grid' && (
            <div className="h-6 w-14 bg-muted rounded animate-pulse" />
          )}
        </div>

        {/* 메타 정보 스켈레톤 */}
        <div className={cn(
          "flex items-center",
          viewMode === 'list' ? "gap-3" : "justify-between"
        )}>
          <div className={cn(
            "flex",
            viewMode === 'list' ? "gap-3" : "gap-4"
          )}>
            <div className={cn(
              "bg-muted rounded animate-pulse",
              viewMode === 'list' ? "h-3 w-16" : "h-4 w-20"
            )} />
            <div className={cn(
              "bg-muted rounded animate-pulse",
              viewMode === 'list' ? "h-3 w-8" : "h-4 w-12"
            )} />
            {viewMode === 'list' && (
              <div className="h-3 w-12 bg-muted rounded animate-pulse" />
            )}
          </div>
          {viewMode === 'grid' && (
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 bg-muted rounded-full animate-pulse" />
              <div className="h-4 w-16 bg-muted rounded animate-pulse" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
