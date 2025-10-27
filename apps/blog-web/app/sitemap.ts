import type { MetadataRoute } from "next";
import { postsApi } from "@/lib/api-client";
import type { PostResponseDto } from "@repo/shared";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://blog.mion-space.dev";

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

  const posts = await fetchAllPosts();

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

  // published 글만 색인
  // postsApi.getPosts는 서버 환경에서 NEXT_PUBLIC_API_URL 기준으로 백엔드를 호출합니다.
  // pagination 메타를 활용해서 모든 페이지를 순회합니다.
  // 실패 시에는 빈 배열을 반환합니다.
  try {
    // 최대 100 페이지 루프 안전장치
    for (let i = 0; i < 100; i++) {
      const res = await postsApi.getPosts({ page, limit, published: true });
      if (!res.success) break;

      items.push(...res.data);

      const totalPages = res.meta.totalPages ?? Math.ceil(res.meta.total / res.meta.limit);
      if (page >= totalPages || !res.meta.hasNext) break;
      page += 1;
    }
  } catch (e) {
    // ignore and return statics only
  }

  return items;
}

