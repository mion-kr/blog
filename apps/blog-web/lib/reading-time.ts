const KOREAN_CHARS_PER_MINUTE = 500;

/**
 * MDX 텍스트에서 읽기시간(분)을 계산합니다.
 * - ``` fenced code block은 제외합니다.
 * - 공백/줄바꿈은 제외하고 문자 수를 집계합니다.
 * - 500 chars/min 기준으로 올림 처리하며, 최소 1분입니다.
 */
export function calculateReadingTimeMinutesFromMdx(mdx: string): number {
  // fenced code block 제거 후, 공백을 제거한 텍스트 길이로 계산합니다.
  const contentWithoutCode = stripFencedCodeBlocks(mdx);
  const nonWhitespaceText = contentWithoutCode.replace(/\s+/g, '');
  const charCount = nonWhitespaceText.length;

  const minutes = Math.ceil(charCount / KOREAN_CHARS_PER_MINUTE);
  return Math.max(1, minutes);
}

/**
 * 읽기시간(분)을 `min read` 포맷으로 표시합니다.
 */
export function formatReadingTimeMinutes(minutes: number): string {
  // 표기는 주인님 결정대로 영문 `min read` 포맷으로 고정합니다.
  return `${minutes} min read`;
}

function stripFencedCodeBlocks(mdx: string): string {
  // ``` 로 감싼 코드블록을 통째로 제거합니다(멀티라인 포함).
  return mdx.replace(/```[\s\S]*?```/g, '');
}

