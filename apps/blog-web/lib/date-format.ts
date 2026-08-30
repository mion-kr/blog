const KOREA_TIME_ZONE = "Asia/Seoul";

type DateInput = Date | string;

const koreanLongDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KOREA_TIME_ZONE,
  year: "numeric",
  month: "long",
  day: "numeric",
});

const koreanMonthDayFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KOREA_TIME_ZONE,
  month: "long",
  day: "numeric",
});

const koreanNumericDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KOREA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toDate(value: DateInput): Date {
  return typeof value === "string" ? new Date(value) : value;
}

export function formatKoreanLongDate(value: DateInput): string {
  return koreanLongDateFormatter.format(toDate(value));
}

export function formatKoreanMonthDay(value: DateInput): string {
  return koreanMonthDayFormatter.format(toDate(value));
}

export function formatKoreanNumericDate(value: DateInput): string {
  const parts = koreanNumericDateFormatter.formatToParts(toDate(value));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("한국 시간 날짜를 포맷할 수 없습니다.");
  }

  return `${year}.${month}.${day}`;
}
