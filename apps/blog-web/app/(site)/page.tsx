import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import Image from "next/image";
import Link from "next/link";

import styles from "./home.module.css";

import { ApiError } from "@/lib/api-errors";
import { categoriesApi, postsApi, tagsApi } from "@/lib/api-client";
import { serializeJsonLd } from "@/lib/json-ld";
import {
  formatKoreanMonthDay,
  formatKoreanNumericDate,
} from "@/lib/date-format";
import { toPostSummaries } from "@/lib/posts/post-summary";
import { getSiteUrl } from "@/lib/site";

import type { PostSummary } from "@repo/shared";

// 데이터 로딩 설정
const RECENT_POSTS_LIMIT = 6;
// 대표 글 1편 + 최근 글 목록
const LATEST_POSTS_LIMIT = 1 + RECENT_POSTS_LIMIT;
const TRENDING_POSTS_LIMIT = 5;
const CATEGORY_LIMIT = 8;
const TAG_LIMIT = 12;
const HOME_LOAD_MAX_ATTEMPTS = 4;
const HOME_LOAD_RETRY_DELAYS_MS = [0, 400, 900, 1800];
const HOME_DATA_CACHE_SCOPE =
  process.env.BLOG_API_URL ?? "unconfigured";
const SITE_URL = getSiteUrl();
const SITE_NAME = "미온 블로그";
const HOME_TITLE = `${SITE_NAME} — AI로 만들고 배우기`;
const HOME_DESCRIPTION =
  "AI를 활용해 아이디어를 구현하고, 직접 만들며 배운 경험을 기록합니다. 다양한 도구의 활용 사례부터 개발 과정의 시행착오, 완성한 결과물까지 공유합니다.";

const TOPICS = [
  {
    title: "AI와 함께 만들기",
    description: "코딩 에이전트에게 일을 나누고, 결과를 테스트와 리뷰로 확인하는 방법을 정리합니다.",
  },
  {
    title: "설계와 인프라",
    description: "AI로 아이디어를 구현하며 사용했던 설계와 인프라를 기록 합니다.",
  },
  {
    title: "장애 기록",
    description: "운영 중에 부딪힌 문제의 원인과 대응을 기록합니다.",
  },
] as const;

type HomeData = {
  latestResponse: Awaited<ReturnType<typeof postsApi.getPosts>> | null;
  trendingResponse: Awaited<ReturnType<typeof postsApi.getPosts>> | null;
  categoriesResponse: Awaited<ReturnType<typeof categoriesApi.getCategories>> | null;
  tagsResponse: Awaited<ReturnType<typeof tagsApi.getTags>> | null;
};

class HomeDataLoadError extends Error {
  constructor(readonly homeData: HomeData) {
    super("Homepage data is temporarily unavailable");
    this.name = "HomeDataLoadError";
  }
}

// 빌드 시점의 API 실패가 빈 홈으로 고정되지 않도록 요청 시 렌더링합니다.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  keywords: [],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    locale: "ko_KR",
    url: "/",
    images: [
      {
        url: "/og/blog.png",
        width: 1200,
        height: 630,
        alt: "Mion 기술 블로그 공유 이미지",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: ["/og/blog.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

/**
 * 홈 데이터 로딩 에러가 재시도 가능한지 판별합니다.
 */
function isRetriableHomeLoadError(error: unknown): boolean {
  if (error instanceof ApiError) {
    // 배포 직후 백엔드 기동 지연이나 5xx 응답은 짧게 재시도합니다.
    return error.code === "NETWORK_ERROR" || error.status >= 500;
  }

  return false;
}

/**
 * 지정한 시간만큼 대기합니다.
 */
async function sleep(ms: number): Promise<void> {
  // 홈 첫 진입 시 일시적인 기동 지연을 흡수하기 위한 짧은 대기입니다.
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * 홈 화면용 API 요청을 재시도와 함께 실행합니다.
 */
async function loadHomeResource<T>(
  label: string,
  loader: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < HOME_LOAD_MAX_ATTEMPTS; attempt += 1) {
    try {
      // 첫 시도 이후에는 지수에 가까운 짧은 backoff를 둡니다.
      const delay = HOME_LOAD_RETRY_DELAYS_MS[attempt] ?? 0;
      if (delay > 0) {
        await sleep(delay);
      }

      return await loader();
    } catch (error) {
      lastError = error;

      if (!isRetriableHomeLoadError(error) || attempt === HOME_LOAD_MAX_ATTEMPTS - 1) {
        break;
      }

      console.warn(`[home] retrying ${label}`, {
        attempt: attempt + 1,
        maxAttempts: HOME_LOAD_MAX_ATTEMPTS,
        error,
      });
    }
  }

  throw lastError;
}

async function loadHomeData() {
  const [latestResult, trendingResult, categoriesResult, tagsResult] = await Promise.allSettled([
    loadHomeResource("latest posts", () =>
      postsApi.getPosts({
        page: 1,
        limit: LATEST_POSTS_LIMIT,
        published: true,
        sort: "publishedAt",
        order: "desc",
      }),
    ),
    loadHomeResource("trending posts", () =>
      postsApi.getPosts({
        page: 1,
        limit: TRENDING_POSTS_LIMIT + 2,
        published: true,
        sort: "viewCount",
        order: "desc",
      }),
    ),
    loadHomeResource("categories", () =>
      categoriesApi.getCategories({
        page: 1,
        limit: CATEGORY_LIMIT,
        sort: "name",
        order: "asc",
      }),
    ),
    loadHomeResource("tags", () =>
      tagsApi.getTags({
        page: 1,
        limit: TAG_LIMIT,
        sort: "name",
        order: "asc",
      }),
    ),
  ]);

  const allFailed =
    latestResult.status === "rejected" &&
    trendingResult.status === "rejected" &&
    categoriesResult.status === "rejected" &&
    tagsResult.status === "rejected";
  const hasFailure =
    latestResult.status === "rejected" ||
    trendingResult.status === "rejected" ||
    categoriesResult.status === "rejected" ||
    tagsResult.status === "rejected";

  if (allFailed) {
    console.error("Failed to bootstrap homepage data", {
      latest: latestResult.reason,
      trending: trendingResult.reason,
      categories: categoriesResult.reason,
      tags: tagsResult.reason,
    });
  } else {
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
  }

  const homeData: HomeData = {
    latestResponse: latestResult.status === "fulfilled" ? latestResult.value : null,
    trendingResponse: trendingResult.status === "fulfilled" ? trendingResult.value : null,
    categoriesResponse: categoriesResult.status === "fulfilled" ? categoriesResult.value : null,
    tagsResponse: tagsResult.status === "fulfilled" ? tagsResult.value : null,
  };

  if (hasFailure) {
    throw new HomeDataLoadError(homeData);
  }

  return homeData;
}

// 기존 5분 캐시는 네 리소스가 모두 성공한 결과에만 적용합니다.
const getCachedHomeData = unstable_cache(
  loadHomeData,
  ["homepage-data", HOME_DATA_CACHE_SCOPE],
  { revalidate: 300 },
);

/**
 * 홈 페이지(Editorial 테마, MID-238 캔버스 `Main`).
 * - 헤더/푸터는 (site) SiteChrome이 렌더링합니다.
 * - 데이터(포스트/카테고리/태그)는 기존 API를 그대로 사용합니다.
 */
export default async function HomePage() {
  let homeData: HomeData = {
    latestResponse: null,
    trendingResponse: null,
    categoriesResponse: null,
    tagsResponse: null,
  };

  try {
    homeData = await getCachedHomeData();
  } catch (error) {
    if (error instanceof HomeDataLoadError) {
      homeData = error.homeData;
    }

    console.warn(
      "Homepage data is temporarily unavailable. Rendering fallback state without caching it.",
      error,
    );
  }

  const { latestResponse, trendingResponse, categoriesResponse, tagsResponse } = homeData;

  const latestPosts = toPostSummaries(latestResponse?.data ?? []);
  const trendingPosts = toPostSummaries(
    (trendingResponse?.data ?? []).slice(0, TRENDING_POSTS_LIMIT),
  );
  // 카테고리 목록 API의 postCount는 발행된 글만 집계합니다.
  const categories = (categoriesResponse?.data ?? []).filter((category) => category.postCount > 0);
  const tags = tagsResponse?.data ?? [];

  const featuredPost = latestPosts[0] ?? null;
  const recentPosts = latestPosts.slice(1, 1 + RECENT_POSTS_LIMIT);

  const stats = {
    posts: latestResponse?.meta?.total ?? latestPosts.length,
    categories: categories.length,
    tags: tagsResponse?.meta?.total ?? tags.length,
  };
  const homeJsonLd = buildHomeJsonLd(stats);

  return (
    <main id="main" className={styles.root}>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(homeJsonLd) }}
      />

      <section className="masthead" aria-label="홈 히어로">
        <div className="container masthead-in">
          <h1>
            백엔드에서
            <br />
            AI 빌더로
          </h1>
        </div>
      </section>

      <section className="front" aria-label="최근 글">
        <div className="container front-in">
          {featuredPost ? (
            <LeadStory post={featuredPost} />
          ) : (
            <article className="lead-story">
              <figure className="fig cover" data-slot="featured" />
              <h2>아직 추천할 글이 없어요</h2>
              <p>첫 글이 발행되면 여기에서 바로 확인할 수 있어요.</p>
            </article>
          )}

          <div className="latest">
            <div className="latest-head">
              <h2>최근 글</h2>
              <Link className="edge-link" href="/posts">
                최근 포스트 더 보기
              </Link>
            </div>
            <ol className="latest-list">
              {recentPosts.map((post) => (
                <LatestItem key={post.id} post={post} />
              ))}
            </ol>
          </div>
        </div>
      </section>

      {trendingPosts.length > 0 ? (
        <section className="section" aria-labelledby="popular-h">
          <div className="container">
            <div className="head">
              <h2 id="popular-h">인기 글</h2>
            </div>
            <table className="register">
              <thead>
                <tr>
                  <th scope="col">순위</th>
                  <th scope="col">제목</th>
                  <th scope="col" className="views">
                    조회
                  </th>
                </tr>
              </thead>
              <tbody>
                {trendingPosts.map((post, index) => (
                  <tr key={post.id}>
                    <td className="rank num">{String(index + 1).padStart(2, "0")}</td>
                    <td className="title">
                      <Link href={`/posts/${post.slug}`}>{post.title}</Link>
                    </td>
                    <td className="views num">{formatNumber(post.viewCount)}회</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="section" aria-labelledby="topics-h">
        <div className="container topics">
          <div>
            <div className="head head--stack">
              <h2 id="topics-h">이 블로그에서 다루는 것</h2>
            </div>
            <ul className="rows">
              {TOPICS.map((topic) => (
                <li key={topic.title}>
                  <h3>{topic.title}</h3>
                  <p>{topic.description}</p>
                </li>
              ))}
            </ul>
          </div>
          <aside className="explore" aria-labelledby="explore-h">
            <div className="head head--stack">
              <h2 id="explore-h">주제로 찾기</h2>
            </div>
            <p className="explore-span">
              지금까지 쓴 글 <span className="num">{formatNumber(stats.posts)}</span>편을
              카테고리와 태그로 묶었습니다.
            </p>
            {categories.length > 0 ? (
              <>
                <h3>카테고리</h3>
                <div className="chips">
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      className="chip"
                      href={`/posts?categorySlug=${category.slug}`}
                    >
                      {category.name}
                      <span className="num">{formatNumber(category.postCount)}</span>
                    </Link>
                  ))}
                </div>
              </>
            ) : null}
            {tags.length > 0 ? (
              <>
                <h3>태그</h3>
                <div className="chips">
                  {tags.slice(0, 10).map((tag) => (
                    <Link key={tag.id} className="chip" href={`/posts?tagSlug=${tag.slug}`}>
                      {tag.name}
                    </Link>
                  ))}
                </div>
              </>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}

/**
 * 가장 최근 글을 대표 글로 보여 줍니다.
 */
function LeadStory({ post }: { post: PostSummary }) {
  const href = `/posts/${post.slug}`;

  return (
    <article className="lead-story">
      <figure className="fig cover" data-slot="featured">
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt=""
            fill
            sizes="(max-width: 960px) 100vw, 760px"
            priority
          />
        ) : null}
      </figure>
      <div className="meta">
        <Link className="tag" href={`/posts?categorySlug=${post.category.slug}`}>
          {post.category.name}
        </Link>
        <span className="num">{formatKoreanNumericDate(post.publishedAt ?? post.createdAt)}</span>
        <span className="num">조회 {formatNumber(post.viewCount)}회</span>
      </div>
      <h2>
        <Link href={href}>{post.title}</Link>
      </h2>
      {post.excerpt ? <p>{post.excerpt}</p> : null}
      {post.tags.length > 0 ? (
        <div className="chips">
          {post.tags.slice(0, 3).map((tag) => (
            <Link key={tag.id} className="chip" href={`/posts?tagSlug=${tag.slug}`}>
              {tag.name}
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  );
}

/**
 * 최근 글 목록의 한 줄입니다. 제목 링크가 줄 전체를 덮습니다.
 */
function LatestItem({ post }: { post: PostSummary }) {
  return (
    <li>
      <figure className="fig cover" data-slot="latest">
        {post.coverImage ? (
          <Image src={post.coverImage} alt="" fill sizes="136px" />
        ) : null}
      </figure>
      <div>
        <h3>
          <Link href={`/posts/${post.slug}`}>{post.title}</Link>
        </h3>
        <div className="meta">
          <span>{post.category.name}</span>
          <span className="num">{formatKoreanMonthDay(post.publishedAt ?? post.createdAt)}</span>
          <span className="num">조회 {formatNumber(post.viewCount)}회</span>
        </div>
      </div>
    </li>
  );
}

/**
 * 숫자 포맷.
 */
function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

/**
 * 홈 랜딩용 구조화데이터를 생성합니다.
 */
function buildHomeJsonLd(stats: {
  posts: number;
  categories: number;
  tags: number;
}) {
  // 홈을 대표 블로그 랜딩으로 인식할 수 있도록 WebSite와 Organization을 함께 노출합니다.
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}#website`,
      name: SITE_NAME,
      alternateName: "Mion's Blog",
      url: SITE_URL,
      inLanguage: "ko-KR",
      description: HOME_DESCRIPTION,
      publisher: {
        "@id": `${SITE_URL}#organization`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${SITE_URL}#organization`,
      name: "Mion's Blog",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/favicon.ico`,
      },
      description: `${stats.posts}개의 포스트와 ${stats.categories}개 카테고리, ${stats.tags}개 태그를 운영하는 기술 블로그입니다.`,
    },
  ];
}
