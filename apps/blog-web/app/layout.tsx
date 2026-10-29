import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "../components/providers";
import { getSiteUrl } from "@/lib/site";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  display: "swap",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  display: "swap",
});
// 페이퍼로지(SIL OFL 1.1, github.com/Freesentation/paperlogy). 라이선스: ./fonts/paperlogy/OFL license.txt
const paperlogy = localFont({
  src: [
    { path: "./fonts/paperlogy/Paperlogy-1Thin.woff2", weight: "100", style: "normal" },
    { path: "./fonts/paperlogy/Paperlogy-2ExtraLight.woff2", weight: "200", style: "normal" },
    { path: "./fonts/paperlogy/Paperlogy-3Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/paperlogy/Paperlogy-4Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/paperlogy/Paperlogy-5Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/paperlogy/Paperlogy-6SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/paperlogy/Paperlogy-7Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/paperlogy/Paperlogy-8ExtraBold.woff2", weight: "800", style: "normal" },
    { path: "./fonts/paperlogy/Paperlogy-9Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-paperlogy",
  display: "swap",
  // 굵기 9개(한글 전체, 각 약 430KB)를 모두 preload하면 첫 화면에 약 4MB를 받으므로, 쓰는 굵기만 브라우저가 받게 둡니다.
  preload: false,
});
const plexMono = IBM_Plex_Mono({
  weight: "500",
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
});

const SITE_URL = getSiteUrl();
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Mion's Blog",
  description: "Mion의 기술 블로그 - 개발 이야기",
  keywords: ["블로그", "개발", "Next.js", "TypeScript", "프론트엔드"],
  authors: [{ name: "Mion" }],
  creator: "Mion",
  applicationName: "미온 블로그",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      data-theme="dark"
      suppressHydrationWarning
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${paperlogy.variable} ${plexMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[101] focus:rounded focus:bg-[var(--color-primary)] focus:px-4 focus:py-2 focus:text-white"
          >
            본문으로 건너뛰기
          </a>
          {children}
        </Providers>
      </body>
    </html>
  );
}
