import Link from "next/link";
import { Metadata } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mion.blog").replace(/\/$/, "");
const aboutOgImage = `${siteUrl}/og/about.png`;

export const metadata: Metadata = {
  title: "About | Mion's Blog",
  description:
    "Next.js와 NestJS를 넘나들며 제품 문제를 해결하는 백엔드 개발자 미온의 이야기와 기술 철학을 소개합니다.",
  openGraph: {
    title: "About | Mion's Blog",
    description:
      "Next.js·NestJS 기반으로 제품 문제를 해결하는 백엔드 개발자 미온의 가치관과 관심사를 만나보세요.",
    type: "website",
    url: `${siteUrl}/about`,
    images: [
      {
        url: aboutOgImage,
        width: 1200,
        height: 630,
        alt: "Mion 소개 OG 이미지",
      },
    ],
  },
};

const focusTopics = ["웹 성능", "DX(개발자 경험)", "인프라 자동화", "테스트 문화", "팀 생산성"];

const currentGoals = [
  "Next.js 15 App Router 기반 관리자 경험 개선",
  "NestJS 11에서 MinIO 연동 최적화 및 업로드 파이프라인 확장",
  "Playwright E2E 시나리오 고도화와 품질 지표 자동화",
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)]">
      <section className="bg-gradient-to-b from-[var(--color-hero-gradient-from)] via-[var(--color-hero-gradient-via)] to-[var(--color-background)] py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-hero-chip)] px-4 py-1 text-sm font-medium text-[var(--color-primary)] shadow-sm backdrop-blur">
            Mion · Backend Developer · DX Lover
          </span>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            개발을 좋아하는 백엔드 개발자 미온입니다
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-[var(--color-text-secondary)] md:text-xl">
            Next.js와 NestJS를 중심으로 프론트와 백엔드를 넘나들며 제품의 문제를 기술로 풀어내는 것을 즐깁니다.
            이 블로그는 실무와 사이드 프로젝트에서 얻은 인사이트를 빠르게 실험하고 공유하는 기록실이에요.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-12 lg:grid-cols-[2fr,1fr]">
          <article className="space-y-10">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">지금 집중하는 일</h2>
              <p className="text-[var(--color-text-secondary)]">
                SaaS 환경에서 반복되는 운영 이슈를 제거하고, 팀이 더 빠르게 실험할 수 있도록 개발자 경험을 다듬고 있어요.
                코드 품질과 DX를 동시에 챙길 수 있는 자동화 흐름을 구축하는 것이 최근 가장 큰 관심사입니다.
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {currentGoals.map((goal) => (
                  <li
                    key={goal}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm text-[var(--color-text-secondary)]"
                  >
                    {goal}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">다루는 주제</h2>
              <p className="text-[var(--color-text-secondary)]">
                아래 키워드를 중심으로 실험과 회고를 기록합니다. 때로는 사이드 프로젝트나 커뮤니티 활동에서 얻은 깨달음도 함께 나눠요.
              </p>
              <div className="flex flex-wrap gap-3">
                {focusTopics.map((topic) => (
                  <span
                    key={topic}
                    className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-sm text-[var(--color-text-secondary)]"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">콜로폰</h2>
              <p className="text-[var(--color-text-secondary)]">
                블로그는 Next.js 15(App Router)와 NestJS 11 위에서 동작하며, 콘텐츠는 MDX로 작성합니다. 이미지는 Railway MinIO에 pre-signed URL 흐름으로 업로드되고,
                Turborepo와 PNPM으로 모노레포를 관리해요. Playwright와 Jest로 주요 기능을 테스트하며, Doppler가 모든 환경 변수를 관리합니다.
              </p>
            </div>
          </article>

          <aside className="space-y-6">
            <ProfileCard />
            <ContactCard />
          </aside>
        </div>
      </section>
    </div>
  );
}

function ProfileCard() {
  const profileImageUrl = process.env.NEXT_PUBLIC_PROFILE_IMAGE_URL;

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm shadow-[var(--color-shadow)]">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-32 w-32 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-muted)]">
          {profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profileImageUrl} alt="미온 프로필" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-text-secondary)]">
              프로필 이미지를 설정해 주세요
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">Mion</p>
          <p className="text-sm text-[var(--color-text-secondary)]">Backend Developer · Product Problem Solver</p>
        </div>

        <p className="text-sm text-[var(--color-text-secondary)]">
          사용자의 문제를 정확히 파악하고, 실험을 통해 답을 찾아가는 것을 좋아합니다. 서비스 운영자가 겪는 불편을 줄이는 일이 곧 좋은 경험을 만든다고 믿어요.
        </p>
      </div>
    </div>
  );
}

function ContactCard() {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm shadow-[var(--color-shadow)]">
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">연락하기</h2>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        협업 제안이나 기술 컨설팅, 강연 요청은 아래 채널로 연락해 주세요. 평일 10:00–18:00에 메일함을 확인하며 보통 2–3영업일 이내 답장을 드립니다.
      </p>

      <div className="mt-4 space-y-3 text-sm">
        <div className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-3">
          <span className="mt-0.5 select-none text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
            Email
          </span>
          <Link
            href="mailto:whddbs311@gmail.com"
            className="break-all text-[var(--color-text-primary)] underline-offset-4 transition hover:text-[var(--color-primary)] hover:underline"
          >
            whddbs311@gmail.com
          </Link>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-3">
          <span className="mt-0.5 select-none text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
            GitHub
          </span>
          <Link
            href="https://github.com/mion-lab"
            className="break-all text-[var(--color-text-primary)] underline-offset-4 transition hover:text-[var(--color-primary)] hover:underline"
          >
            github.com/mion-lab
          </Link>
        </div>
      </div>

      <p className="mt-4 text-xs text-[var(--color-text-muted)]">
        모든 문의는 응대 목적 외로 사용하지 않으며 처리가 완료되면 30일 이내 안전하게 파기합니다.
      </p>
    </div>
  );
}
