import Link from 'next/link';
import type { Metadata } from 'next';

import type { ApiResponse, PublicSiteSettings } from '@repo/shared';

import styles from './about-neon-grid.module.css';

import { getSiteUrl } from '@/lib/site';
import { cn } from '@/lib/utils';

// 사이트 URL은 중앙 유틸을 통해 일관 관리합니다.
const siteUrl = getSiteUrl();
const aboutOgImage = `${siteUrl}/og/about.png`;
const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(
  /\/$/,
  '',
);

export const metadata: Metadata = {
  title: "About | Mion's Blog",
  description:
    'MSA 환경에서의 서비스 개발과 안정적인 시스템 운영에 관심이 많은 백엔드 개발자 미온을 소개합니다.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: "About | Mion's Blog",
    description:
      'NestJS·Spring Boot 기반 백엔드 개발과 AWS 운영 경험을 바탕으로, 제품 문제를 기술로 해결합니다.',
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
};

const contactChannels = [
  {
    label: 'Email',
    value: 'whddbs311@gmail.com',
    href: 'mailto:whddbs311@gmail.com',
  },
  {
    label: 'GitHub',
    value: 'github.com/mion-kr',
    href: 'https://github.com/mion-kr',
  },
];

const PUBLIC_SETTINGS_ENDPOINT = '/api/site/settings';

/**
 * 공개 사이트 설정을 조회합니다.
 */
async function fetchPublicSettings(): Promise<PublicSiteSettings | null> {
  try {
    const response = await fetch(`${apiBaseUrl}${PUBLIC_SETTINGS_ENDPOINT}`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as
      | PublicSiteSettings
      | ApiResponse<PublicSiteSettings>;

    if (data && typeof data === 'object' && 'success' in data) {
      return data.success ? data.data ?? null : null;
    }

    return data as PublicSiteSettings;
  } catch (error) {
    console.error('Failed to fetch public settings', error);
    return null;
  }
}

/**
 * About 페이지 (샘플 `about-neon-grid.html` 레이아웃 기반).
 * - About에서도 페이지가 네온 헤더/배경을 직접 렌더링합니다.
 * - 이력/학력은 주인님 제공 PDF/현행 데이터 기준으로만 구성합니다.
 */
export default async function AboutPage() {
  const settings = await fetchPublicSettings();
  const profileImageUrl =
    settings?.profileImageUrl ?? process.env.NEXT_PUBLIC_PROFILE_IMAGE_URL ?? '';

  const skills = buildCoreSkills();
  const journey = buildJourneyTimeline();

  return (
    <div className={cn(styles.root, 'neon-grid-about')}>
      <div className="neon-grid-bg" aria-hidden="true" />

      <header className="header" aria-label="페이지 헤더">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="Mion's Blog 홈">
            MION BLOG
          </Link>
          <nav className="nav" aria-label="메인 네비게이션">
            <Link href="/" className="nav-link">
              Home
            </Link>
            <Link href="/posts" className="nav-link">
              Posts
            </Link>
            <Link href="/about" className="nav-link active" aria-current="page">
              About
            </Link>
          </nav>
        </div>
      </header>

      <section className="hero" aria-label="소개 히어로">
        <div className="profile-glow" aria-hidden="true">
          <div className="profile-img" aria-label="프로필 이미지">
            {profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profileImageUrl} alt="Mion 프로필" />
            ) : (
              <span aria-hidden="true">👨‍💻</span>
            )}
          </div>
        </div>
        <h1>I'm Mion</h1>
        <p>
          MSA 환경에서의 서비스 개발과 안정적인 시스템 운영에 관심이 많은 백엔드 엔지니어입니다.
          <br />
          NestJS·Spring Boot 기반 개발과 AWS 운영 경험을 바탕으로, 제품 문제를 기술로 해결합니다.
        </p>
      </section>

      <main className="container" id="main">
        <section className="section" aria-label="핵심 역량">
          <h2 className="section-title">Core Skills</h2>
          <div className="skills-grid">
            {skills.map((skill) => (
              <div key={skill.title} className="skill-card">
                <div className="skill-icon" aria-hidden="true">
                  {skill.icon}
                </div>
                <h3>{skill.title}</h3>
                <p>{skill.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section" aria-label="이력">
          <h2 className="section-title">Journey</h2>
          <div className="timeline">
            {journey.map((item) => (
              <div key={item.date} className="timeline-item">
                <div className="tm-date">{item.date}</div>
                <div className="tm-title">{item.title}</div>
                <div className="tm-company">{item.company}</div>
                <p className="tm-desc">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section" aria-label="연락처">
          <div className="contact-card">
            <h2>Let&apos;s connect in the grid</h2>
            <p>협업 제안이나 기술적인 수다는 언제든 환영입니다.</p>
            <div className="contact-links" aria-label="연락 링크">
              {contactChannels.map((channel) => (
                <Link key={channel.label} href={channel.href} className="contact-btn">
                  {channel.label === 'Email' ? '📧' : '🐙'} {channel.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="section" aria-label="사이트 소개">
          <h2 className="section-title">이 사이트는</h2>
          <div className="contact-card" style={{ textAlign: 'left' }}>
            <p>
              이 블로그는 Next.js 15(App Router)와 NestJS 11 위에서 동작하며, Turborepo + PNPM
              모노레포로 관리됩니다. 콘텐츠는 MDX로 작성하고, 이미지 업로드는 Railway의 MinIO에
              pre-signed URL 흐름을 사용합니다. 테스트는 Playwright와 Jest가 담당하고, Doppler가
              모든 환경 변수를 제공합니다.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

/**
 * About 핵심 역량(3카드) 데이터를 구성합니다.
 */
function buildCoreSkills() {
  return [
    {
      icon: '🧩',
      title: 'Frontend',
      description:
        'Next.js 기반의 블로그/관리자 UX를 구현하며, React·TypeScript·Playwright로 인터랙션과 품질을 함께 챙깁니다.',
    },
    {
      icon: '🛠️',
      title: 'Backend',
      description:
        'NestJS( TypeScript )와 Spring Boot를 기반으로 API를 설계하고, 인증(JWT)·MSA·성능 최적화에 집중합니다.',
    },
    {
      icon: '☁️',
      title: 'Infra & Ops',
      description:
        'AWS(EC2/RDS) 운영과 Docker 기반 배포, CI/CD(GitLab)와 모니터링(Grafana)로 안정적인 서비스를 만듭니다.',
    },
  ] as const;
}

/**
 * About 타임라인(개발 경력/학력)을 구성합니다.
 */
function buildJourneyTimeline() {
  return [
    {
      date: '2021.12 - Present',
      title: 'Backend Engineer',
      company: '주식회사 애쓰지마',
      description:
        'NestJS·TypeScript 기반 MSA에서 예약/결제/리워드 등 도메인 API를 설계·운영했고, AWS/Docker/CI-CD와 모니터링으로 안정화를 담당했습니다.',
    },
    {
      date: '2018.05 - 2021.11',
      title: 'Backend Engineer',
      company: '(주)씨에스',
      description:
        'Spring Boot·MyBatis 기반 웹 백엔드 및 IoT 서버 개발에 참여했고, Elasticsearch/Kibana 등 데이터 검색·관측 환경을 함께 다뤘습니다.',
    },
    {
      date: '2014.03 - 2024.02',
      title: 'B.S. Computer Science',
      company: '한국방송통신대학교',
      description: '컴퓨터과학과를 졸업하며, 실무 중심으로 백엔드/시스템 개발 역량을 확장했습니다.',
    },
  ] as const;
}

