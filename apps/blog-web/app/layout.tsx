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

export const metadata: Metadata = {
  title: "Mion's Blog",
  description: "Mion의 기술 블로그 - 개발 이야기",
  keywords: ["블로그", "개발", "Next.js", "TypeScript", "프론트엔드"],
  authors: [{ name: "Mion" }],
  creator: "Mion",
  openGraph: {
    title: "Mion's Blog",
    description: "Mion의 기술 블로그 - 개발 이야기",
    type: "website",
    locale: "ko_KR",
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
    <html lang="ko">
      <body 
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
