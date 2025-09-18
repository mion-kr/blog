import Link from "next/link";

import { Card } from "@repo/ui/card";
import type { ApiResponse, PaginatedResponse, PostWithRelations } from "@repo/shared";

import styles from "./page.module.css";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 9;
const MAX_LIMIT = 30;
const LIMIT_OPTIONS = [6, 9, 12];

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type PostsApiSuccess = PaginatedResponse<PostWithRelations>;
type PostsApiError = Extract<ApiResponse<PostWithRelations[]>, { success: false }>;
type PostsApiResponse = PostsApiSuccess | PostsApiError;

function getSingleValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseNumberParam(
  rawValue: string | string[] | undefined,
  defaultValue: number,
  { min = 1, max = Number.MAX_SAFE_INTEGER }: { min?: number; max?: number } = {},
): number {
  const value = getSingleValue(rawValue);

  if (!value) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return defaultValue;
  }

  const normalized = Math.max(min, parsed);
  return Math.min(normalized, max);
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]\(([^)]*)\)/g, "$1")
    .replace(/[-#>*_~]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildExcerpt(post: PostWithRelations): string {
  const base = (post.excerpt ?? stripMarkdown(post.content ?? ""))
    .replace(/\s+/g, " ")
    .trim();

  if (!base) {
    return "설명이 준비 중인 포스트입니다.";
  }

  if (base.length <= 160) {
    return base;
  }

  return `${base.slice(0, 157).trimEnd()}...`;
}

function formatPostDate(post: PostWithRelations): string {
  const dateLike = post.publishedAt ?? post.createdAt;
  const date = typeof dateLike === "string" ? new Date(dateLike) : dateLike;

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return dateFormatter.format(date);
}

function buildMeta(post: PostWithRelations): string {
  const parts = [
    post.category?.name,
    post.author?.name,
    formatPostDate(post),
  ].filter(Boolean) as string[];

  return parts.join(" · ");
}

async function fetchPosts(page: number, limit: number) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL 환경 변수가 설정되어 있지 않습니다.");
  }

  const url = new URL("/api/posts", baseUrl);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`포스트 목록을 불러오지 못했습니다. (HTTP ${response.status})`);
  }

  const json = (await response.json()) as PostsApiResponse;

  if (!json.success) {
    throw new Error(json.message ?? "포스트 목록을 불러오지 못했습니다.");
  }

  return {
    posts: json.data,
    meta: json.meta,
  };
}

function renderLimitOption(option: number, activeLimit: number) {
  if (option === activeLimit) {
    return (
      <span key={option} className={`${styles.limitButton} ${styles.limitButtonActive}`}>
        {option}
      </span>
    );
  }

  return (
    <Link
      key={option}
      href={{ pathname: "/", query: { page: 1, limit: option } }}
      className={styles.limitButton}
    >
      {option}
    </Link>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const page = parseNumberParam(resolvedSearchParams.page, DEFAULT_PAGE, { min: 1 });
  const limit = parseNumberParam(resolvedSearchParams.limit, DEFAULT_LIMIT, {
    min: 1,
    max: MAX_LIMIT,
  });

  let errorMessage: string | null = null;
  let posts: PostWithRelations[] = [];
  let meta: PostsApiSuccess["meta"] | null = null;

  try {
    const result = await fetchPosts(page, limit);
    posts = result.posts;
    meta = result.meta;
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "알 수 없는 오류가 발생했습니다.";
  }

  const sectionTitle = "최신 포스트";
  const sectionSubtitle =
    "NEXT_PUBLIC_API_URL 환경의 /api/posts 엔드포인트에서 발행된 글들을 불러옵니다.";

  if (errorMessage || !meta) {
    const fallbackError = errorMessage ?? "잠시 후 다시 시도해주세요.";

    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>{sectionTitle}</h1>
          <p className={styles.subtitle}>{sectionSubtitle}</p>
        </header>
        <div className={styles.error} role="alert">
          <span className={styles.errorMessage}>포스트를 불러오지 못했습니다.</span>
          <p>{fallbackError}</p>
        </div>
      </div>
    );
  }

  const totalPages = meta.totalPages ?? Math.max(1, Math.ceil(meta.total / meta.limit));
  const activeLimit = meta.limit ?? limit;
  const limitOptions = Array.from(new Set([...LIMIT_OPTIONS, activeLimit])).sort(
    (a, b) => a - b,
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{sectionTitle}</h1>
        <p className={styles.subtitle}>{sectionSubtitle}</p>
      </header>

      <div className={styles.controls}>
        <div className={styles.limitSelector}>
          <span className={styles.limitSelectorLabel}>페이지당</span>
          {limitOptions.map((option) => renderLimitOption(option, activeLimit))}
          <span>개</span>
        </div>
        <span className={styles.summary}>
          총 {meta.total.toLocaleString()}개의 포스트 · {meta.page} / {totalPages} 페이지
        </span>
      </div>

      {posts.length === 0 ? (
        <div className={styles.empty} role="status">
          <span className={styles.errorMessage}>아직 게시된 포스트가 없습니다.</span>
          <p>새로운 글이 등록되면 가장 먼저 만나보실 수 있어요.</p>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {posts.map((post) => {
              const excerpt = buildExcerpt(post);
              const metaText = buildMeta(post);
              const tagsText = post.tags
                ?.slice(0, 3)
                .map((tag) => `#${tag.name}`)
                .join("  ") ?? "";

              return (
                <Card
                  key={post.id}
                  className={styles.card}
                  title={post.title}
                  href={`/posts/${post.slug}`}
                  target="_self"
                  appendUtm={false}
                >
                  <>
                    {metaText ? <span className={styles.meta}>{metaText}</span> : null}
                    <span className={styles.excerpt}>{excerpt}</span>
                    {tagsText ? <span>{tagsText}</span> : null}
                  </>
                </Card>
              );
            })}
          </div>

          <nav className={styles.pagination} aria-label="페이지네이션">
            {meta.hasPrev ? (
              <Link
                className={styles.paginationButton}
                href={{ pathname: "/", query: { page: meta.page - 1, limit: meta.limit } }}
              >
                이전
              </Link>
            ) : (
              <span
                className={`${styles.paginationButton} ${styles.paginationButtonDisabled}`}
                aria-disabled="true"
              >
                이전
              </span>
            )}
            <span className={styles.paginationInfo}>
              {meta.page} / {totalPages} 페이지
            </span>
            {meta.hasNext ? (
              <Link
                className={styles.paginationButton}
                href={{ pathname: "/", query: { page: meta.page + 1, limit: meta.limit } }}
              >
                다음
              </Link>
            ) : (
              <span
                className={`${styles.paginationButton} ${styles.paginationButtonDisabled}`}
                aria-disabled="true"
              >
                다음
              </span>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
