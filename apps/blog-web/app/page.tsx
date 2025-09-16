import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

import { categoriesApi, postsApi, tagsApi } from "@/lib/api-client";
import { HeroActions } from "@/components/hero-actions";
import { PostCard } from "@/components/post-card";
import { cn } from "@/lib/utils";

import type { Category, PostResponseDto, Tag } from "@repo/shared";
import {
  ArrowRight,
  CalendarDays,
  Eye,
  Flame,
  FolderOpen,
  PenSquare,
  Tag as TagIcon,
} from "lucide-react";

const LATEST_POSTS_LIMIT = 10;
const TRENDING_POSTS_LIMIT = 5;
const CATEGORY_LIMIT = 8;
const TAG_LIMIT = 14;

export const revalidate = 60;

type HomeStats = {
  posts: number;
  categories: number;
  tags: number;
  lastUpdated?: Date;
};

export default async function HomePage() {
  const [latestResult, trendingResult, categoriesResult, tagsResult] = await Promise.allSettled([
    postsApi.getPosts({
      page: 1,
      limit: LATEST_POSTS_LIMIT,
      published: true,
      sort: "publishedAt",
      order: "desc",
    }),
    postsApi.getPosts({
      page: 1,
      limit: TRENDING_POSTS_LIMIT + 2,
      published: true,
      sort: "viewCount",
      order: "desc",
    }),
    categoriesApi.getCategories({
      page: 1,
      limit: CATEGORY_LIMIT,
      sort: "name",
      order: "asc",
    }),
    tagsApi.getTags({
      page: 1,
      limit: TAG_LIMIT,
      sort: "name",
      order: "asc",
    }),
  ]);

  if (latestResult.status === "rejected") {
    console.error("Failed to load latest posts", latestResult.reason);
  }
  if (trendingResult.status === "rejected") {
    console.error("Failed to load trending posts", trendingResult.reason);
  }
  if (categoriesResult.status === "rejected") {
    console.error("Failed to load categories", categoriesResult.reason);
  }
  if (tagsResult.status === "rejected") {
    console.error("Failed to load tags", tagsResult.reason);
  }

  const latestResponse = latestResult.status === "fulfilled" ? latestResult.value : null;
  const trendingResponse = trendingResult.status === "fulfilled" ? trendingResult.value : null;
  const categoriesResponse = categoriesResult.status === "fulfilled" ? categoriesResult.value : null;
  const tagsResponse = tagsResult.status === "fulfilled" ? tagsResult.value : null;

  const latestPosts = latestResponse?.data ?? [];
  const featuredPost = latestPosts[0] ?? null;
  const highlightPosts = featuredPost ? latestPosts.slice(1, Math.min(latestPosts.length, 4)) : [];
  const latestGridPosts = featuredPost
    ? latestPosts.slice(1 + highlightPosts.length)
    : latestPosts;

  const trendingPosts = (trendingResponse?.data ?? [])
    .filter((post) => post.id !== featuredPost?.id)
    .slice(0, TRENDING_POSTS_LIMIT);
  const categories = categoriesResponse?.data ?? [];
  const tags = tagsResponse?.data ?? [];

  const stats: HomeStats = {
    posts: latestResponse?.meta?.total ?? latestPosts.length,
    categories: categoriesResponse?.meta?.total ?? categories.length,
    tags: tagsResponse?.meta?.total ?? tags.length,
    lastUpdated: featuredPost
      ? new Date(featuredPost.publishedAt ?? featuredPost.createdAt)
      : undefined,
  };

  return (
    <div className="flex flex-col">
      <HeroSection stats={stats} />

      <section className="blog-section">
        <div className="blog-container space-y-16">
          <FeaturedSection featuredPost={featuredPost} highlightPosts={highlightPosts} />

          {latestGridPosts.length > 0 && (
            <LatestPostsSection posts={latestGridPosts} total={stats.posts} />
          )}

          <DiscoverySection
            trendingPosts={trendingPosts}
            categories={categories}
            tags={tags}
          />
        </div>
      </section>
    </div>
  );
}

function HeroSection({ stats }: { stats: HomeStats }) {
  const formattedLastUpdated = stats.lastUpdated ? formatDate(stats.lastUpdated) : "작성 예정";

  const statCards = [
    {
      label: "전체 포스트",
      value: `${formatNumber(stats.posts)}개`,
      helper: "깊이 있는 기술 인사이트",
    },
    {
      label: "카테고리 & 태그",
      value: `${formatNumber(stats.categories)} 카테고리`,
      helper: `${formatNumber(stats.tags)}개의 태그 수록`,
    },
    {
      label: "마지막 업데이트",
      value: formattedLastUpdated,
      helper: stats.lastUpdated ? "가장 최근에 발행된 글" : "첫 글을 준비 중입니다",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[var(--color-hero-gradient-from)] via-[var(--color-hero-gradient-via)] to-[var(--color-background)] py-20">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-0 h-72 w-72 -translate-x-1/3 rounded-full bg-[var(--color-primary-100)] blur-3xl md:-top-32 md:h-96 md:w-96" />
        <div className="absolute bottom-0 right-0 h-72 w-72 translate-x-1/3 translate-y-1/3 rounded-full bg-[var(--color-primary-200)] blur-3xl" />
      </div>

      <div className="blog-container relative z-10">
        <div className="mx-auto max-w-3xl text-center space-y-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-hero-chip)] px-4 py-1 text-sm font-medium text-[var(--color-primary)] shadow-sm backdrop-blur">
            <SparklesIcon />
            Next.js 15 · Nest.js · MDX
          </span>

          <h1 className="text-4xl font-bold tracking-tight text-[var(--color-text-primary)] md:text-5xl">
            Mion&apos;s 기술 블로그에 오신 것을 환영합니다
          </h1>

          <p className="text-lg text-[var(--color-text-secondary)] md:text-xl">
            실무에서 얻은 경험과 실험을 통해 축적한 개발 인사이트를 공유합니다. 프론트엔드, 백엔드, 인프라를 넘나드는 Mion의 여정을 만나보세요.
          </p>

          <HeroActions />
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => (
            <div key={card.label} className="blog-stat-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                {card.label}
              </p>
              <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
                {card.value}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">{card.helper}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedSection({
  featuredPost,
  highlightPosts,
}: {
  featuredPost: PostResponseDto | null;
  highlightPosts: PostResponseDto[];
}) {
  if (!featuredPost) {
    return (
      <EmptyState
        icon={<PenSquare className="h-5 w-5" aria-hidden />}
        title="첫 번째 포스트를 기다리고 있어요"
        description="관리자 로그인을 통해 새로운 포스트를 작성해보세요."
      />
    );
  }

  const displayDate = featuredPost.publishedAt ?? featuredPost.createdAt;

  return (
    <div className="space-y-8">
      <div className="blog-section-header">
        <div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">Editor&apos;s Pick</p>
          <h2 className="text-3xl font-semibold text-[var(--color-text-primary)] md:text-4xl">
            가장 주목받는 포스트
          </h2>
        </div>
        <Link
          href="/posts"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-accent-primary-hover)]"
        >
          모든 포스트 보기
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="blog-featured-grid">
        <article className="blog-featured-card">
          <div className="relative h-56 w-full bg-[var(--color-muted)] md:h-full">
            {featuredPost.coverImage ? (
              <Image
                src={featuredPost.coverImage}
                alt={featuredPost.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--color-primary-100)] to-[var(--color-primary-200)]">
                <PenSquare className="h-10 w-10 text-[var(--color-primary-500)]" aria-hidden />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 p-6 md:p-8">
            <span className="blog-category-badge w-max">{featuredPost.category.name}</span>

            <h3 className="text-3xl font-bold leading-tight text-[var(--color-text-primary)] md:text-4xl">
              <Link href={`/posts/${featuredPost.slug}`} className="stretched-link">
                {featuredPost.title}
              </Link>
            </h3>

            {featuredPost.excerpt && (
              <p className="text-base leading-relaxed text-[var(--color-text-secondary)]">
                {featuredPost.excerpt}
              </p>
            )}

            {featuredPost.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {featuredPost.tags.slice(0, 4).map((tag) => (
                  <span key={tag.id} className="blog-tag">
                    <TagIcon className="h-3 w-3" aria-hidden />
                    {tag.name}
                  </span>
                ))}
                {featuredPost.tags.length > 4 && (
                  <span className="blog-tag">+{featuredPost.tags.length - 4}</span>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-secondary)]">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" aria-hidden />
                {formatDate(displayDate)}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" aria-hidden />
                {formatNumber(featuredPost.viewCount)} views
              </span>
              <span className="font-medium text-[var(--color-text-primary)]">{featuredPost.author.name}</span>
            </div>
          </div>
        </article>

        <div className="blog-featured-list">
          {highlightPosts.length > 0 ? (
            highlightPosts.map((post) => (
              <PostCard key={post.id} post={post} className="h-full" />
            ))
          ) : (
            <EmptyState
              icon={<PenSquare className="h-5 w-5" aria-hidden />}
              title="추가 포스트가 준비 중입니다"
              description="새로운 글이 발행되면 이곳에서 바로 확인할 수 있어요."
            />
          )}
        </div>
      </div>
    </div>
  );
}

function LatestPostsSection({
  posts,
  total,
}: {
  posts: PostResponseDto[];
  total?: number;
}) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="blog-section-header">
        <div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">Latest</p>
          <h2 className="text-3xl font-semibold text-[var(--color-text-primary)]">
            방금 올라온 기술 노트
          </h2>
        </div>
        <Link
          href="/posts"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-accent-primary-hover)]"
        >
          전체 포스트 {typeof total === "number" ? `(${formatNumber(total)})` : ""}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="blog-posts-grid">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

function DiscoverySection({
  trendingPosts,
  categories,
  tags,
}: {
  trendingPosts: PostResponseDto[];
  categories: Category[];
  tags: Tag[];
}) {
  const hasTrending = trendingPosts.length > 0;
  const hasCategories = categories.length > 0;
  const hasTags = tags.length > 0;

  if (!hasTrending && !hasCategories && !hasTags) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="blog-section-header">
        <div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">Discover</p>
          <h2 className="text-3xl font-semibold text-[var(--color-text-primary)]">
            지금 가장 많이 읽는 주제
          </h2>
        </div>
        <Link
          href="/search"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-accent-primary-hover)]"
        >
          검색으로 더 찾아보기
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
            <Flame className="h-5 w-5 text-[var(--color-accent-warning)]" aria-hidden />
            인기 포스트 Top {trendingPosts.length}
          </h3>

          {hasTrending ? (
            <div className="blog-trending-list">
              {trendingPosts.map((post, index) => (
                <Link key={post.id} href={`/posts/${post.slug}`} className="blog-trending-item">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-secondary)] text-sm font-semibold text-[var(--color-secondary-foreground)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-[var(--color-text-primary)] line-clamp-2">
                      {post.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" aria-hidden />
                        {formatNumber(post.viewCount)}회 조회
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" aria-hidden />
                        {formatDate(post.publishedAt ?? post.createdAt)}
                      </span>
                      <span className="font-medium text-[var(--color-text-primary)]">
                        {post.category.name}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Flame className="h-5 w-5" aria-hidden />}
              title="아직 인기 포스트가 없어요"
              description="새로운 포스트가 발행되면 조회수 기준으로 자동 집계됩니다."
            />
          )}
        </div>

        <aside className="space-y-8">
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
              <FolderOpen className="h-5 w-5 text-[var(--color-accent-success)]" aria-hidden />
              카테고리
            </h3>

            {hasCategories ? (
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <CategoryLink key={category.id} category={category} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<FolderOpen className="h-5 w-5" aria-hidden />}
                title="카테고리가 아직 없어요"
                description="관리자 페이지에서 카테고리를 생성하면 이곳에 표시됩니다."
              />
            )}
          </div>

          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
              <TagIcon className="h-5 w-5 text-[var(--color-accent-secondary)]" aria-hidden />
              인기 태그
            </h3>

            {hasTags ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <TagLink key={tag.id} tag={tag} emphasis={index % 5 === 0} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<TagIcon className="h-5 w-5" aria-hidden />}
                title="등록된 태그가 없습니다"
                description="포스트에 태그를 추가하면 독자가 더 쉽게 찾을 수 있어요."
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function CategoryLink({ category }: { category: Category }) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className={cn(
        "blog-tag",
        "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] hover:bg-[var(--color-secondary)]/80"
      )}
    >
      <FolderOpen className="h-3 w-3" aria-hidden />
      {category.name}
    </Link>
  );
}

function TagLink({ tag, emphasis }: { tag: Tag; emphasis?: boolean }) {
  return (
    <Link
      href={`/tag/${tag.slug}`}
      className={cn(
        "blog-tag",
        emphasis ? "text-sm font-semibold" : "text-xs"
      )}
    >
      #{tag.name}
    </Link>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] px-6 py-12 text-center">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{description}</p>
    </div>
  );
}

function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(dateObj);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function SparklesIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 text-[var(--color-primary)]"
    >
      <path
        d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z"
        fill="currentColor"
        opacity="0.6"
      />
      <path
        d="M18 12l.9 2.7L22 16l-3.1 1.3L18 20l-.9-2.7L14 16l3.1-1.3L18 12zM6 12l.7 2.1L9 15l-2.3.9L6 18l-.7-2.1L3 15l2.3-.9L6 12z"
        fill="currentColor"
        opacity="0.35"
      />
    </svg>
  );
}
