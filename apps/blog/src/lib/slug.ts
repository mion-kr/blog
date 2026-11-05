// packages/shared/src/utils/slug.ts 이식. hangul-romanize는 workerd에서 ESM 진입이 깨져 CommonJS 진입을 쓴다.
// @ts-expect-error 타입 선언이 패키지 루트에만 있다.
import { Romanize } from 'hangul-romanize/dist/index.js';

export function generateSlug(title: string): string {
  const romanized: string = Romanize.from(title);
  return romanized
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

const KOREAN_TO_ENGLISH: Record<string, string> = {
  개발: 'development', 블로그: 'blog', 포스트: 'post', 프로젝트: 'project', 튜토리얼: 'tutorial', 가이드: 'guide', 리뷰: 'review',
  일상: 'daily', 생각: 'thoughts', 공부: 'study', 학습: 'learning', 경험: 'experience', 회고: 'retrospective',
};

export function generateEnglishSlug(title: string): string {
  let processed = title;
  for (const [korean, english] of Object.entries(KOREAN_TO_ENGLISH)) processed = processed.replace(new RegExp(korean, 'g'), english);
  return generateSlug(processed);
}

export function createUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  let unique = baseSlug;
  for (let counter = 1; existingSlugs.includes(unique); counter++) unique = `${baseSlug}-${counter}`;
  return unique;
}

/** 이관 전 posts.service.ts createSlugFromTitle과 같은 순서. existingSlugs는 base로 시작하는 다른 글의 slug. */
export function slugFromTitle(title: string, existingSlugs: string[]): string {
  const base = generateSlug(title) || generateEnglishSlug(title) || 'post';
  return createUniqueSlug(base, existingSlugs);
}

export function slugBase(title: string): string {
  return generateSlug(title) || generateEnglishSlug(title) || 'post';
}
