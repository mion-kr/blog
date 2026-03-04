import type { MetadataRoute } from "next";
import { postsApi } from "@/lib/api-client";
import type { PostResponseDto } from "@repo/shared";
import { getSiteUrl } from "@/lib/site";

const SITE_URL = getSiteUrl();
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      priority: 1.0,
      changeFrequency: "daily",
      lastModified: new Date(),
    },
    {
      url: `${SITE_URL}/posts`,
      priority: 0.8,
      changeFrequency: "daily",
      lastModified: new Date(),
    },
    {
      url: `${SITE_URL}/about`,
      priority: 0.5,
      changeFrequency: "monthly",
      lastModified: new Date(),
    },
  ];

  const posts = normalizePostsForSitemap(await fetchAllPosts());

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
  // 실패 시에는 관측 가능한 로그를 남기고 정적 라우트만 반환합니다.
  try {
    // 최대 100 페이지 루프 안전장치
    for (let i = 0; i < 100; i++) {
      const res = await postsApi.getPosts({ page, limit, published: true });
      if (!res.success) {
        // API 실패 시 원인을 추적할 수 있도록 로그를 남깁니다.
        console.error("[sitemap] failed to fetch posts page", {
          page,
          limit,
          message: res.message,
        });
        break;
      }

      items.push(...res.data);

      const totalPages = res.meta.totalPages ?? Math.ceil(res.meta.total / res.meta.limit);
      if (page >= totalPages || !res.meta.hasNext) break;
      page += 1;
    }
  } catch (error) {
    // 네트워크/런타임 오류도 로그로 남겨서 sitemap 누락 원인을 관측 가능하게 합니다.
    console.error("[sitemap] unexpected error while fetching posts", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return items;
}

/**
 * 사이트맵에 안전하게 포함할 포스트 목록을 정제합니다.
 */
function normalizePostsForSitemap(posts: PostResponseDto[]): PostResponseDto[] {
  const visited = new Set<string>();

  return posts.filter((post) => {
    // slug가 없거나 중복된 포스트는 제외해 잘못된 URL 생성을 방지합니다.
    if (!post.slug || visited.has(post.slug)) {
      return false;
    }

    visited.add(post.slug);
    return true;
  });
}
