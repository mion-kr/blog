import Image from "next/image";
import Link from "next/link";
import { cva } from "class-variance-authority";

import styles from "./home-neon-grid.module.css";

import { categoriesApi, postsApi, tagsApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";

import type { PostResponseDto } from "@repo/shared";

// 데이터 로딩 설정
const LATEST_POSTS_LIMIT = 9;
const TRENDING_POSTS_LIMIT = 5;
const CATEGORY_LIMIT = 8;
const TAG_LIMIT = 12;

export const revalidate = 60;

const neonButtonVariants = cva("btn", {
  variants: {
    variant: {
      default: "",
      primary: "btn-primary",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

/**
 * 홈 페이지(샘플 `sample-neon-grid.html` 1:1 포팅).
 * - 홈에서만 sample header/footer/배경을 직접 렌더링합니다.
 * - 데이터(포스트/카테고리/태그)는 기존 API를 그대로 사용합니다.
 */
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
  const trendingPosts = (trendingResponse?.data ?? []).slice(0, TRENDING_POSTS_LIMIT);
  const categories = categoriesResponse?.data ?? [];
  const tags = tagsResponse?.data ?? [];

  const featuredPost = latestPosts[0] ?? null;
  const recentPosts = latestPosts.slice(1, 5);

  const stats = {
    posts: latestResponse?.meta?.total ?? latestPosts.length,
    categories: categoriesResponse?.meta?.total ?? categories.length,
    tags: tagsResponse?.meta?.total ?? tags.length,
    lastUpdated: featuredPost ? new Date(featuredPost.publishedAt ?? featuredPost.createdAt) : undefined,
  };

  return (
    <div className={cn(styles.root, "neon-grid-home")}>
      <div className="neon-grid-bg" aria-hidden="true" />

      <header className="header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="Mion's Blog 홈">
            <div className="brand-icon" aria-hidden="true">
              M
            </div>
            <span>Mion&apos;s Blog</span>
          </Link>

          <nav className="nav" aria-label="메인 네비게이션">
            <Link href="/" className="nav-link active" aria-current="page">
              Home
            </Link>
            <Link href="/posts" className="nav-link">
              Posts
            </Link>
            <Link href="/about" className="nav-link">
              About
            </Link>
          </nav>

          <div className="header-actions" />
        </div>
      </header>

      <div className="container">
        <section className="hero" aria-label="홈 히어로">
          <div className="hero-grid">
            <div className="hero-content">
              <h1>백엔드 개발 기록</h1>
              <p>
                NestJS를 중심으로 백엔드 설계/운영 경험을 정리합니다. 이전에는 Spring Boot로 서비스를 개발했어요.
                실무에서 배운 것과 실험 기록을, 읽기 좋은 형태로 꾸준히 업데이트합니다.
              </p>
              <div className="hero-actions">
                <Link
                  href="/posts"
                  className={neonButtonVariants({ variant: "primary" })}
                >
                  포스트 보러가기 <span className="icon-arrow" aria-hidden="true" />
                </Link>
                <Link href="/about" className={neonButtonVariants({ variant: "default" })}>
                  소개 보기
                </Link>
              </div>
            </div>

            <div className="hero-stats" aria-label="블로그 통계">
              <HeroStatCard value={formatNumber(stats.posts)} label="총 포스트" />
              <HeroStatCard value={formatNumber(stats.categories)} label="카테고리" />
              <HeroStatCard value={formatNumber(stats.tags)} label="태그" />
              <HeroStatCard value={stats.lastUpdated ? formatShortDate(stats.lastUpdated) : "작성 예정"} label="마지막 업데이트" />
            </div>
          </div>
        </section>

        <div className="main-grid">
          <main id="main">
            <section aria-label="추천 글">
              <SectionHeader
                eyebrow="Featured"
                title="오늘의 추천"
                actionHref="/posts"
                actionLabel="전체 보기"
              />

              {featuredPost ? (
                <FeaturedPost post={featuredPost} />
              ) : (
                <article className="featured-post">
                  <div className="featured-cover">
                    <div className="featured-cover-placeholder">Cover Image</div>
                  </div>
                  <div className="featured-meta">
                    <span className="category-badge">
                      <span className="dot" aria-hidden="true" />
                      준비중
                    </span>
                    <span className="meta-item">
                      <span className="icon-calendar" aria-hidden="true" /> 작성 예정
                    </span>
                    <span className="meta-item">
                      <span className="icon-eye" aria-hidden="true" /> 0회
                    </span>
                  </div>
                  <h3 className="featured-title">아직 추천할 글이 없어요</h3>
                  <p className="featured-excerpt">첫 글이 발행되면 여기에서 바로 확인할 수 있어요.</p>
                </article>
              )}
            </section>

            <section aria-label="최근 글">
              <SectionHeader eyebrow="Latest" title="최근 글" actionHref="/posts" actionLabel="더 보기" />

              <div className="posts-grid">
                {recentPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          </main>

          <aside className="sidebar" aria-label="사이드바">
            <div className="sidebar-card">
              <h3 className="sidebar-title">
                <span className="sidebar-title-icon icon-flame" aria-hidden="true" />
                인기 글
              </h3>
              <div className="trending-list">
                {trendingPosts.map((post, index) => (
                  <TrendingItem key={post.id} post={post} rank={index + 1} />
                ))}
              </div>
            </div>

            <div className="sidebar-card">
              <h3 className="sidebar-title">
                <span className="sidebar-title-icon icon-compass" aria-hidden="true" />
                탐색하기
              </h3>
              <div className="explore-section">
                {categories.length > 0 && (
                  <div className="explore-group">
                    <div className="explore-label">
                      <span className="icon-folder" aria-hidden="true" />
                      카테고리
                    </div>
                    <div className="explore-chips">
                      {categories.slice(0, 8).map((c) => (
                        <Link
                          key={c.id}
                          href={`/posts?categorySlug=${c.slug}`}
                          className="explore-chip explore-chip-category"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {tags.length > 0 && (
                  <div className="explore-group">
                    <div className="explore-label">
                      <span className="icon-hash" aria-hidden="true" />
                      태그
                    </div>
                    <div className="explore-chips">
                      {tags.slice(0, 10).map((t) => (
                        <Link
                          key={t.id}
                          href={`/posts?tagSlug=${t.slug}`}
                          className="explore-chip explore-chip-tag"
                        >
                          #{t.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="sidebar-card">
              <h3 className="sidebar-title">
                <span className="sidebar-title-icon icon-chart" aria-hidden="true" />
                블로그 현황
              </h3>
              <div className="quick-stats">
                <div className="quick-stat">
                  <div className="quick-stat-value">{formatNumber(stats.posts)}</div>
                  <div className="quick-stat-label">글</div>
                </div>
                <div className="quick-stat">
                  <div className="quick-stat-value">{formatNumber(stats.categories)}</div>
                  <div className="quick-stat-label">분류</div>
                </div>
                <div className="quick-stat">
                  <div className="quick-stat-value">{formatNumber(stats.tags)}</div>
                  <div className="quick-stat-label">태그</div>
                </div>
              </div>
              <div className="sidebar-divider" />
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                마지막 업데이트:{" "}
                <span style={{ color: "var(--neon-cyan)" }}>
                  {stats.lastUpdated ? formatDate(stats.lastUpdated) : "작성 예정"}
                </span>
              </div>
            </div>
          </aside>
        </div>

        <footer className="footer">
          <p className="footer-text">
            © {new Date().getFullYear()}{" "}
            <Link href="/" aria-label="Mion's Blog">
              Mion&apos;s Blog
            </Link>
            . Neon Grid Theme · Dark Mode Only
          </p>
        </footer>
      </div>
    </div>
  );
}

/**
 * 히어로 통계 카드.
 */
function HeroStatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/**
 * 섹션 헤더(샘플 구조).
 */
function SectionHeader({
  eyebrow,
  title,
  actionHref,
  actionLabel,
}: {
  eyebrow: string;
  title: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="section-header">
      <div className="section-title">
        <div>
          <div className="section-eyebrow">{eyebrow}</div>
          <h2>{title}</h2>
        </div>
      </div>
      <Link href={actionHref} className={neonButtonVariants({ variant: "default" })}>
        {actionLabel} <span className="icon-arrow" aria-hidden="true" />
      </Link>
    </div>
  );
}

/**
 * 추천(Featured) 포스트.
 */
function FeaturedPost({ post }: { post: PostResponseDto }) {
  const href = `/posts/${post.slug}`;
  const displayDate = post.publishedAt ?? post.createdAt;

  return (
    <article className="featured-post">
      <div className="featured-cover">
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            sizes="(max-width: 1024px) 100vw, 980px"
            className="featured-cover-img"
            priority
          />
        ) : (
          <div className="featured-cover-placeholder">Cover Image</div>
        )}
      </div>

      <div className="featured-meta">
        <Link href={`/posts?categorySlug=${post.category.slug}`} className="category-badge">
          <span className="dot" aria-hidden="true" />
          {post.category.name}
        </Link>
        <span className="meta-item">
          <span className="icon-calendar" aria-hidden="true" /> {formatDate(displayDate)}
        </span>
        <span className="meta-item">
          <span className="icon-eye" aria-hidden="true" /> {formatNumber(post.viewCount)}회
        </span>
      </div>

      <h3 className="featured-title">
        <Link href={href}>{post.title}</Link>
      </h3>

      {post.excerpt && <p className="featured-excerpt">{post.excerpt}</p>}

      <div className="featured-footer">
        <div className="tags">
          {post.tags.slice(0, 3).map((tag) => (
            <Link
              key={tag.id}
              href={`/posts?tagSlug=${tag.slug}`}
              className="tag"
            >
              #{tag.name}
            </Link>
          ))}
        </div>
        <Link href={href} className="read-more">
          읽기 <span className="icon-arrow" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

/**
 * 최근 글 카드.
 */
function PostCard({ post }: { post: PostResponseDto }) {
  const href = `/posts/${post.slug}`;
  const displayDate = post.publishedAt ?? post.createdAt;

  return (
    <article className="post-card">
      <div className="post-card-meta">
        <Link href={`/posts?categorySlug=${post.category.slug}`} className="category-badge">
          <span className="dot" aria-hidden="true" />
          {post.category.name}
        </Link>
        <span className="meta-item">{formatMonthDay(displayDate)}</span>
      </div>
      <h3 className="post-card-title">
        <Link href={href}>{post.title}</Link>
      </h3>
      {post.excerpt && <p className="post-card-excerpt">{post.excerpt}</p>}
      <div className="post-card-footer">
        <span className="view-count">
          <span className="icon-eye" aria-hidden="true" /> {formatNumber(post.viewCount)}회
        </span>
        <Link href={href} className="read-more">
          읽기 <span className="icon-arrow" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

/**
 * 인기 글 행.
 */
function TrendingItem({ post, rank }: { post: PostResponseDto; rank: number }) {
  return (
    <Link href={`/posts/${post.slug}`} className="trending-item">
      <div className="trending-rank">{String(rank).padStart(2, "0")}</div>
      <div className="trending-content">
        <div className="trending-title">{post.title}</div>
        <div className="trending-views">
          <span className="icon-eye" aria-hidden="true" /> {formatNumber(post.viewCount)}회
        </div>
      </div>
    </Link>
  );
}

/**
 * 날짜 포맷(긴 형식).
 */
function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(dateObj);
}

/**
 * 날짜 포맷(월/일, 샘플 카드용).
 */
function formatMonthDay(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  return `${month}월 ${day}일`;
}

/**
 * 짧은 날짜 포맷(히어로 스탯용).
 */
function formatShortDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

/**
 * 숫자 포맷.
 */
function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

