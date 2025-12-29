"use client";

import { createTheme } from "@mantine/core";

/**
 * 블로그 웹 전역 Mantine 테마(다크 고정, 청록/블루 포인트).
 */
export const mantineTheme = createTheme({
  fontFamily:
    "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Segoe UI', Roboto, Helvetica, Arial",
  headings: {
    fontFamily:
      "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Segoe UI', Roboto, Helvetica, Arial",
  },
  primaryColor: "mion",
  colors: {
    mion: [
      "#e7f6ff",
      "#d1eeff",
      "#a5dcff",
      "#79caff",
      "#59bcff",
      "#47b3ff",
      "#2f95e6",
      "#1c76c2",
      "#0f5a99",
      "#083f6d",
    ],
  },
  defaultRadius: "md",
});

