import { calculateReadingTimeMinutesFromMdx } from "@/lib/reading-time";

import type { PostResponseDto, PostSummary } from "@repo/shared";

const FALLBACK_EXCERPT_SUFFIX = "글의 핵심 내용을 빠르게 확인해보세요.";

/**
 * 단일 포스트 응답을 홈/목록 전용 summary 데이터로 변환합니다.
 */
export function toPostSummary(post: PostResponseDto): PostSummary {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    // 요약은 excerpt 우선, 없으면 제목 기반 fallback으로 고정합니다.
    excerpt: buildSummaryExcerpt(post),
    coverImage: post.coverImage,
    viewCount: post.viewCount,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    publishedAt: post.publishedAt,
    // reading time은 summary 재사용을 위해 서버에서 미리 계산합니다.
    readingTimeMinutes: calculateReadingTimeMinutesFromMdx(post.content),
    category: {
      id: post.category.id,
      name: post.category.name,
      slug: post.category.slug,
    },
    tags: post.tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
    })),
  };
}

/**
 * 포스트 응답 목록을 summary 목록으로 변환합니다.
 */
export function toPostSummaries(posts: PostResponseDto[]): PostSummary[] {
  // 홈/목록 렌더 경로에는 summary만 전달되도록 한 번에 변환합니다.
  return posts.map((post) => toPostSummary(post));
}

/**
 * 홈/목록 카드에서 사용할 요약 문구를 생성합니다.
 */
function buildSummaryExcerpt(
  post: Pick<PostResponseDto, "title" | "excerpt">,
): string {
  if (post.excerpt && post.excerpt.trim().length > 0) {
    return post.excerpt.trim();
  }

  // excerpt가 없을 때도 상세 원문 대신 짧은 안내 문구만 노출합니다.
  return `${post.title} ${FALLBACK_EXCERPT_SUFFIX}`;
}
