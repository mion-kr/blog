// Slug 생성 및 관리 유틸리티
import { Romanize } from 'hangul-romanize';

/**
 * 제목을 URL 친화적인 slug로 변환
 * @param title - 변환할 제목
 * @returns slug 문자열
 */
export function generateSlug(title: string): string {
  // 한글을 로마자로 변환
  const romanized = Romanize.from(title);

  return romanized
    .toLowerCase() // 소문자 변환
    .trim() // 앞뒤 공백 제거
    .replace(/[^\w\s-]/g, '') // 특수문자 제거 (영문, 숫자, 공백, 하이픈만)
    .replace(/[\s_]+/g, '-') // 공백과 언더스코어를 하이픈으로
    .replace(/^-+|-+$/g, '') // 앞뒤 하이픈 제거
    .substring(0, 100); // 길이 제한
}

/**
 * 한글을 영문으로 변환하여 slug 생성 (간단한 음성변환)
 * @param title - 변환할 제목
 * @returns 영문 slug 문자열
 */
export function generateEnglishSlug(title: string): string {
  // 간단한 한글 -> 영문 매핑
  const koreanToEnglish: Record<string, string> = {
    '개발': 'development',
    '블로그': 'blog',
    '포스트': 'post',
    '프로젝트': 'project',
    '튜토리얼': 'tutorial',
    '가이드': 'guide',
    '리뷰': 'review',
    '일상': 'daily',
    '생각': 'thoughts',
    '공부': 'study',
    '학습': 'learning',
    '경험': 'experience',
    '회고': 'retrospective',
  };

  // 한글 단어들을 영문으로 변환
  let processedTitle = title;
  Object.entries(koreanToEnglish).forEach(([korean, english]) => {
    processedTitle = processedTitle.replace(new RegExp(korean, 'g'), english);
  });

  return generateSlug(processedTitle);
}

/**
 * slug 중복 확인을 위한 고유한 slug 생성
 * @param baseSlug - 기본 slug
 * @param existingSlugs - 기존에 존재하는 slug들
 * @returns 고유한 slug
 */
export function createUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  let uniqueSlug = baseSlug;
  let counter = 1;

  while (existingSlugs.includes(uniqueSlug)) {
    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
}

/**
 * slug 유효성 검증
 * @param slug - 검증할 slug
 * @returns 유효성 검증 결과
 */
export function validateSlug(slug: string): { isValid: boolean; message?: string } {
  if (!slug) {
    return { isValid: false, message: 'Slug는 필수입니다.' };
  }

  if (slug.length < 1) {
    return { isValid: false, message: 'Slug는 최소 1자 이상이어야 합니다.' };
  }

  if (slug.length > 100) {
    return { isValid: false, message: 'Slug는 최대 100자까지 가능합니다.' };
  }

  // slug 형식 검증 (소문자, 숫자, 하이픈만 허용)
  if (!/^[a-z0-9가-힣-]+$/.test(slug)) {
    return { 
      isValid: false, 
      message: 'Slug는 소문자, 숫자, 하이픈, 한글만 사용할 수 있습니다.' 
    };
  }

  // 연속된 하이픈 검증
  if (/--/.test(slug)) {
    return { isValid: false, message: 'Slug에는 연속된 하이픈을 사용할 수 없습니다.' };
  }

  // 시작과 끝의 하이픈 검증
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return { isValid: false, message: 'Slug는 하이픈으로 시작하거나 끝날 수 없습니다.' };
  }

  return { isValid: true };
}