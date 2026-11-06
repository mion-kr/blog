// 이관 전 lib/date-format.ts, lib/reading-time.ts, lib/json-ld.ts
const KOREA = 'Asia/Seoul';
const numeric = new Intl.DateTimeFormat('ko-KR', { timeZone: KOREA, year: 'numeric', month: '2-digit', day: '2-digit' });
const long = new Intl.DateTimeFormat('ko-KR', { timeZone: KOREA, year: 'numeric', month: 'long', day: 'numeric' });
const monthDay = new Intl.DateTimeFormat('ko-KR', { timeZone: KOREA, month: 'long', day: 'numeric' });

export function formatKoreanNumericDate(value: Date): string {
  const parts = numeric.formatToParts(value);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get('year')}.${get('month')}.${get('day')}`;
}
export const formatKoreanLongDate = (value: Date) => long.format(value);
export const formatKoreanMonthDay = (value: Date) => monthDay.format(value);

export function readingTimeMinutes(mdx: string): number {
  const chars = mdx.replace(/```[\s\S]*?```/g, '').replace(/\s+/g, '').length;
  return Math.max(1, Math.ceil(chars / 500));
}
export const formatReadingTime = (minutes: number) => `${minutes} min read`;

export function serializeJsonLd(value: object): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
export const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);
