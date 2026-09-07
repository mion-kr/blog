import Link from 'next/link';
import type { Metadata } from 'next';

import styles from './about-neon-grid.module.css';

import { NeonHeader } from '@/components/layout/neon-header';
import { getSiteUrl } from '@/lib/site';
import { cn } from '@/lib/utils';

// 사이트 URL은 중앙 유틸을 통해 일관 관리합니다.
const siteUrl = getSiteUrl();
const aboutOgImage = `${siteUrl}/og/about.png`;

const aboutDescription =
  'AI를 활용한 개발 경험과 다양한 도구를 사용하며 얻은 시행착오, 결과물을 공유하는 미온의 블로그입니다.';

export const metadata: Metadata = {
  title: "블로그 소개 | Mion's Blog",
  description: aboutDescription,
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: "블로그 소개 | Mion's Blog",
    description: aboutDescription,
    type: 'website',
    url: `${siteUrl}/about`,
    images: [
      {
        url: aboutOgImage,
        width: 1200,
        height: 630,
        alt: 'Mion About 페이지 OG 이미지',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "블로그 소개 | Mion's Blog",
    description: aboutDescription,
    images: [aboutOgImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

const topics = [
  {
    icon: '🧩',
    title: 'AI를 활용한 개발',
    description: 'AI와 함께 개발하는 과정에서 시도한 방법과 배운 점을 기록합니다.',
  },
  {
    icon: '🛠️',
    title: '다양한 도구의 활용',
    description: '개발에 쓰는 도구를 직접 사용하며 마주한 문제와 해결 과정을 나눕니다.',
  },
  {
    icon: '💡',
    title: '시행착오와 결과물',
    description: '완성된 결과물뿐 아니라 그 과정의 선택과 시행착오도 함께 공유합니다.',
  },
] as const;

export default function AboutPage() {
  return (
    <div className={cn(styles.root, 'neon-grid-about')}>
      <div className="neon-grid-bg" aria-hidden="true" />

      <NeonHeader activePath="/about" />

      <section className="hero" aria-label="소개 히어로">
        <h1>블로그 소개</h1>
        <p>
          미온의 Mion&apos;s Blog는 AI를 활용한 개발 경험을 기록하는 공간입니다.
          <br />
          다양한 도구를 사용하며 얻은 시행착오와 결과물을 공유합니다.
        </p>
      </section>

      <main className="container" id="main">
        <section className="section" aria-label="다루는 주제">
          <h2 className="section-title">다루는 주제</h2>
          <div className="skills-grid">
            {topics.map((topic) => (
              <div key={topic.title} className="skill-card">
                <div className="skill-icon" aria-hidden="true">
                  {topic.icon}
                </div>
                <h3>{topic.title}</h3>
                <p>{topic.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section" aria-label="기록 방식">
          <h2 className="section-title">과정까지 담는 기록</h2>
          <div className="contact-card">
            <p>
              무엇을 만들었는지와 함께 어떤 도구를 선택했고, 어디서 막혔으며,
              어떻게 풀어갔는지를 담습니다. 각 글에서 시도한 방법과 결과를 살펴보세요.
            </p>
            <div className="contact-links">
              <Link href="/posts" className="contact-btn">
                글 목록 보기 →
              </Link>
            </div>
          </div>
        </section>

        <section className="section" aria-label="사이트 소개">
          <h2 className="section-title">이 사이트는</h2>
          <div className="contact-card" style={{ textAlign: 'left' }}>
            <p>
              이 블로그는 Next.js 16(App Router)와 NestJS 11 위에서 동작하며, Turborepo + PNPM
              모노레포로 관리됩니다. Vercel에 배포하고, PostgreSQL과 이미지 저장소는 Supabase를
              사용합니다. 이미지 업로드는 S3 호환 pre-signed URL 흐름을 사용하며, Doppler가 모든
              환경 변수를 제공합니다.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
