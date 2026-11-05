import { readingTimeMinutes } from './format';

// 이관 전 lib/posts/post-summary.ts
export function summaryExcerpt(post: { title: string; excerpt: string | null }): string {
  return post.excerpt?.trim() ? post.excerpt.trim() : `${post.title} 글의 핵심 내용을 빠르게 확인해보세요.`;
}
export const summaryReadingTime = (content: string) => readingTimeMinutes(content);
export const formatCompactNumber = (value: number) => new Intl.NumberFormat('en', { notation: 'compact' }).format(value);

/** 이관 전 posts-pagination.tsx 번호 목록 */
export function pageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  const pages: (number | 'ellipsis')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('ellipsis');
  }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages) {
    if (end < totalPages - 1) pages.push('ellipsis');
    pages.push(totalPages);
  }
  return pages;
}
