import { cache } from "react";

import { postsApi } from "@/lib/api-client";

import type { PostResponseDto } from "@repo/shared";

/**
 * SEO 메타데이터 경로 전용 포스트 조회 함수입니다.
 * `trackView=false` 요청만 같은 slug 내에서 캐시되도록 분리합니다.
 */
const getPostWithoutTracking = cache(async (slug: string): Promise<PostResponseDto | null> => {
  try {
    // SSR/SEO 경로에서는 조회수 증가를 비활성화해 봇/메타 호출의 지표 오염을 방지합니다.
    const response = await postsApi.getPostBySlug(slug, { trackView: false });
    if (!response.success || !response.data) {
      return null;
    }

    return response.data;
  } catch {
    return null;
  }
});

/**
 * SSR 본문 렌더링용 포스트 조회 함수입니다.
 * `trackView=true` 요청만 같은 slug 내에서 캐시되도록 분리합니다.
 */
const getPostWithTracking = cache(async (slug: string): Promise<PostResponseDto | null> => {
  try {
    // 사용자 진입 경로에서는 기존 조회수 증가 동작을 유지합니다.
    const response = await postsApi.getPostBySlug(slug, { trackView: true });
    if (!response.success || !response.data) {
      return null;
    }

    return response.data;
  } catch {
    return null;
  }
});

/**
 * 메타데이터 생성용 포스트 조회 함수입니다.
 */
export async function getPostForSeo(slug: string): Promise<PostResponseDto | null> {
  return getPostWithoutTracking(slug);
}

/**
 * SSR 본문 렌더링용 포스트 조회 함수입니다.
 */
export async function getPostForRender(slug: string): Promise<PostResponseDto | null> {
  return getPostWithTracking(slug);
}
