import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { postsApi } from "@/lib/api-client";
import type { PostResponseDto } from "@repo/shared";
import { getSiteUrl } from "@/lib/site";

const SITE_URL = getSiteUrl();
const SITEMAP_CACHE_SCOPE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const MAX_SITEMAP_PAGES = 100;

export const dynamic = "force-dynamic";

const getCachedSitemapPosts = unstable_cache(
  async () => normalizePostsForSitemap(await fetchAllPosts()),
  ["sitemap-posts", SITEMAP_CACHE_SCOPE],
  { revalidate: 300 },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      priority: 1.0,
      changeFrequency: "daily",
    },
    {
      url: `${SITE_URL}/posts`,
      priority: 0.8,
      changeFrequency: "daily",
    },
    {
      url: `${SITE_URL}/about`,
      priority: 0.5,
      changeFrequency: "monthly",
    },
  ];

  const posts = await getCachedSitemapPosts();

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/posts/${post.slug}`,
    lastModified: new Date(post.updatedAt ?? post.publishedAt ?? post.createdAt),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...postRoutes];
}

async function fetchAllPosts(): Promise<PostResponseDto[]> {
  const items: PostResponseDto[] = [];
  let page = 1;
  const limit = 50;

  // published 글만 색인합니다.
  // postsApi.getPosts는 서버 환경에서 NEXT_PUBLIC_API_URL 기준으로 백엔드를 호출합니다.
  // pagination 메타를 활용해서 모든 페이지를 순회합니다.
  // 어느 페이지에서든 실패하면 부분 결과를 반환하지 않고 오류를 전파합니다.
  try {
    // 페이지네이션 오류로 무한 순회하지 않도록 최대 페이지 수를 제한합니다.
    for (let i = 0; i < MAX_SITEMAP_PAGES; i++) {
      const res = await postsApi.getPosts({ page, limit, published: true });
      if (!res.success) {
        throw new Error(res.message);
      }

      items.push(...res.data);

      const totalPages = res.meta.totalPages ?? Math.ceil(res.meta.total / res.meta.limit);
      if (!res.meta.hasNext) {
        if (page < totalPages) {
          throw new Error("sitemap pagination ended before totalPages");
        }
        return items;
      }
      if (page >= totalPages) {
        throw new Error("sitemap pagination hasNext exceeded totalPages");
      }
      page += 1;
    }

    throw new Error(`sitemap pagination exceeded ${MAX_SITEMAP_PAGES} pages`);
  } catch (error) {
    // 실패를 캐시하지 않고 다음 요청이 다시 시도할 수 있도록 오류를 전파합니다.
    console.error("[sitemap] unexpected error while fetching posts", {
      page,
      limit,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

}

/**
 * 사이트맵에 안전하게 포함할 포스트 목록을 정제합니다.
 */
function normalizePostsForSitemap(posts: PostResponseDto[]): PostResponseDto[] {
  const visited = new Set<string>();

  return posts.filter((post) => {
    // 발행 상태가 아니거나 slug가 없거나 중복된 포스트는 제외합니다.
    if (!post.published || !post.slug || visited.has(post.slug)) {
      return false;
    }

    visited.add(post.slug);
    return true;
  });
}
