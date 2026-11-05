/** 수정 요청의 published에 따른 published_at(이관 전 posts.service.ts update와 같음). */
export function nextPublishedAt(existing: { published: boolean; publishedAt: Date | null }, published: boolean, now: Date): Date | null {
  if (published && !existing.published) return now;
  if (!published && existing.published) return null;
  return existing.publishedAt;
}

/** 발행된 글은 제목을 바꿔도 slug를 유지한다(사용자 결정 3). 저장돼 있던 published 기준. */
export function shouldRegenerateSlug(existing: { published: boolean; title: string }, title: string): boolean {
  return !existing.published && title !== existing.title;
}
