// 중앙 집중 SITE URL 유틸
// - Doppler의 NEXT_PUBLIC_SITE_URL을 우선 사용
// - 미설정 시 프로덕션 기본값으로 blog.mion-space.dev 사용
// - 말단 슬래시는 제거하여 일관성 유지
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "https://blog.mion-space.dev";
  return raw.replace(/\/$/, "");
}

