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
    title: '웹과 API 설계',
    description: 'Next.js의 서버 실행 방식, NestJS의 API 구조와 인증처럼 웹 개발의 경계를 살펴봅니다.',
  },
  {
    icon: '💡',
    title: '데이터와 운영',
    description: 'PostgreSQL의 시간대와 동시성, 배포 환경과 장애 대응에서 선택의 이유를 정리합니다.',
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
        <section className="section" aria-label="작성자 소개">
          <h2 className="section-title">글을 쓰는 미온</h2>
          <div className="contact-card" style={{ textAlign: 'left' }}>
            <p>
              미온은 이 블로그에서 AI를 활용한 개발과 웹 서비스의 설계·운영을 주제로 글을 씁니다.
              API의 역할을 나누는 방법, 데이터의 시간대를 저장하는 기준처럼
              구현할 때 마주치는 선택을 구체적인 예시와 함께 살펴봅니다.
            </p>
            <div className="contact-links">
              <Link href="/posts/nextjs-server-actioneun-apiwa-mueosi-dareulkka" className="contact-btn">
                Server Action과 API 글 읽기 →
              </Link>
              <Link href="/posts/haeoe-yeyakui-sigandae-seolgye-utc-jeojangbuteo-hyeonji-sigak-bojonkkaji" className="contact-btn">
                시간대 설계 글 읽기 →
              </Link>
            </div>
          </div>
        </section>

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
              개발 경험을 기록한 글과 공식 문서·다른 사람의 사례를 읽고 정리한 글을 함께 다룹니다.
              직접 실행한 예제의 결과, 출처에서 확인한 내용, 작성자의 해석을 구분하는 것을
              편집 기준으로 삼습니다. 직접 재현하지 않은 사례는 재현한 경험으로 설명하지 않습니다.
            </p>
            <p>
              기술 설명은 공식 문서와 공개 코드를 확인하고, 예제에는 적용 조건과 한계를 함께 적습니다.
              오류를 정정할 때는 해당 글에서 바뀐 설명과 근거를 확인할 수 있도록 남기는 것을 기준으로 합니다.
              글의 URL, 문제가 된 문장, 참고 자료를 보내주시면 정정 내용을 확인하는 데 도움이 됩니다.
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
            <p>
              공개 프로젝트인 이 블로그의 소스에서 화면 구성과 API 구현을 확인할 수 있습니다.
              글에서 다룬 설계를 실제 코드와 비교해 보고 싶다면 저장소를 함께 살펴보세요.
            </p>
            <div className="contact-links">
              <a href="https://github.com/mion-kr/blog" className="contact-btn">
                블로그 공개 코드 →
              </a>
              <a href="https://github.com/mion-kr" className="contact-btn">
                미온의 GitHub →
              </a>
            </div>
          </div>
        </section>

        <section className="section" aria-label="문의와 정정 제안">
          <h2 className="section-title">문의와 정정 제안</h2>
          <div className="contact-card">
            <p>글에 대한 질문이나 오류 제안은 아래 이메일로 보내주세요.</p>
            <div className="contact-links">
              <a href="mailto:contact@mion-space.dev" className="contact-btn">
                contact@mion-space.dev
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
