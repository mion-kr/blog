import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "../components/providers";

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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://blog.mion-space.dev";
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Mion's Blog",
  description: "Mion의 기술 블로그 - 개발 이야기",
  keywords: ["블로그", "개발", "Next.js", "TypeScript", "프론트엔드"],
  authors: [{ name: "Mion" }],
  creator: "Mion",
  applicationName: "Mion Blog",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Mion's Blog",
    description: "Mion의 기술 블로그 - 개발 이야기",
    type: "website",
    locale: "ko_KR",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mion's Blog",
    description: "Mion의 기술 블로그 - 개발 이야기",
  },
  icons: {
    icon: "/favicon.ico",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-theme="light" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[var(--color-primary)] focus:px-4 focus:py-2 focus:text-white"
          >
            본문으로 건너뛰기
          </a>
          {children}
        </Providers>
      </body>
    </html>
  );
}
