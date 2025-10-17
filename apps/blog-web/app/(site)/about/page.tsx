import Link from "next/link"
import type { Metadata } from "next"

import type { ApiResponse, PublicSiteSettings } from "@repo/shared"

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mion.blog").replace(/\/$/, "")
const aboutOgImage = `${siteUrl}/og/about.png`
const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/$/, "")

export const metadata: Metadata = {
  title: "About | Mion's Blog",
  description: "Next.js와 NestJS를 기반으로 제품 문제를 해결하며 개발자 경험을 사랑하는 백엔드 개발자 미온을 소개합니다.",
  openGraph: {
    title: "About | Mion's Blog",
    description: "웹 성능, DX, 인프라 자동화에 집중하는 백엔드 개발자 미온의 관심사와 협업 방식을 소개합니다.",
    type: "website",
    url: `${siteUrl}/about`,
    images: [
      {
        url: aboutOgImage,
        width: 1200,
        height: 630,
        alt: "Mion About 페이지 OG 이미지",
      },
    ],
  },
}

const focusTopics = ["웹 성능", "DX(개발자 경험)", "인프라 자동화", "테스트 문화", "팀 생산성"]

const currentFocus = [
  {
    title: "Next.js 15 · Turbopack 기반 관리자 UX 고도화",
    description: "초안·이미지 업로드 경험을 개선하고, 콘텐츠 편집 흐름을 더 빠르게 만들고 있어요.",
  },
  {
    title: "NestJS 11 · Railway MinIO 연동 안정화",
    description: "pre-signed 업로드 파이프라인과 객체 이동 자동화를 구축해 운영 실수를 줄이고 있어요.",
  },
  {
    title: "Playwright 테스트 지표 자동화",
    description: "핵심 시나리오에 대한 UI 테스트를 지표와 연결해 배포 전 품질을 확인하는 루프를 만들고 있어요.",
  },
]

const techStacks = [
  {
    title: "Frontend",
    items: ["Next.js 15", "React Server Components", "Tailwind CSS", "Playwright"],
  },
  {
    title: "Backend",
    items: ["NestJS 11", "Drizzle ORM", "PostgreSQL", "tRPC"],
  },
  {
    title: "Infra & DX",
    items: ["Railway", "MinIO", "Turborepo", "PNPM", "Doppler"],
  },
]

const contactChannels = [
  {
    label: "Email",
    value: "whddbs311@gmail.com",
    href: "mailto:whddbs311@gmail.com",
    helper: "평일 10:00–18:00 사이 2–3영업일 내 회신 드려요.",
  },
  {
    label: "GitHub",
    value: "github.com/mion-kr",
    href: "https://github.com/mion-kr",
    helper: "문서·샘플 코드는 저장소에서 확인할 수 있어요.",
  },
]

const PUBLIC_SETTINGS_ENDPOINT = "/api/site/settings";

async function fetchPublicSettings(): Promise<PublicSiteSettings | null> {
  try {
    const response = await fetch(`${apiBaseUrl}${PUBLIC_SETTINGS_ENDPOINT}`, {
      method: "GET",
      cache: "no-store",
    })

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as PublicSiteSettings | ApiResponse<PublicSiteSettings>

    if (data && typeof data === "object" && "success" in data) {
      return data.success ? data.data ?? null : null
    }

    return data as PublicSiteSettings
  } catch (error) {
    console.error("Failed to fetch public settings", error)
    return null
  }
}

export default async function AboutPage() {
  const settings = await fetchPublicSettings()
  const profileImageUrl =
    settings?.profileImageUrl ?? process.env.NEXT_PUBLIC_PROFILE_IMAGE_URL ?? ""

  return (
    <main className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)]">
      <section className="relative overflow-hidden bg-gradient-to-b from-[var(--color-hero-gradient-from)] via-[var(--color-hero-gradient-via)] to-transparent py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.6fr,1fr] lg:items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                  개발을 좋아하는 백엔드 개발자 미온입니다
                </h1>
                <p className="text-lg text-[var(--color-text-secondary)] md:text-xl">
                  Next.js와 NestJS를 넘나들며 제품 문제를 기술로 해결하는 것을 즐겨요. 빠르게 실험하고 기록하며,
                  팀이 더 좋은 경험을 만들 수 있도록 개발자 경험(DX)을 다듬습니다.
                </p>
              </div>

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

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="mailto:whddbs311@gmail.com"
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-hero-foreground)] transition hover:opacity-90"
                >
                  이메일로 연락하기
                </Link>
                <Link
                  href="https://github.com/mion-kr"
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  GitHub 살펴보기
                </Link>
              </div>
            </div>

            <ProfileCard profileImageUrl={profileImageUrl} siteTitle={settings?.siteTitle ?? "Mion's Blog"} />
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <section className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">요즘 집중하는 일</h2>
              <p className="text-[var(--color-text-secondary)]">
                실무에서 얻은 과제를 토대로 빠르게 실험하고, 동료와 사용자 모두가 체감할 수 있는 개선을 만들고 있어요.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {currentFocus.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm shadow-[var(--color-shadow)]"
                >
                  <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{item.title}</h3>
                  <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">관심 있는 주제 & 스택</h2>
              <p className="text-[var(--color-text-secondary)]">
                제품 최적화와 팀 효율을 모두 잡기 위해 아래 기술 조합을 즐겨 사용합니다.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {techStacks.map((stack) => (
                <div
                  key={stack.title}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm shadow-[var(--color-shadow)]"
                >
                  <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{stack.title}</h3>
                  <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
                    {stack.items.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">연락하기</h2>
              <p className="text-[var(--color-text-secondary)]">
                협업 제안, 기술 자문, 강연 요청 등은 아래 채널로 부탁드려요. 가급적 메일 제목에 [블로그문의]를 포함해 주시면 빠르게 확인할 수 있어요.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {contactChannels.map((channel) => (
                <div
                  key={channel.label}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm shadow-[var(--color-shadow)]"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                    {channel.label}
                  </p>
                  <Link
                    href={channel.href}
                    className="mt-2 block text-base font-medium text-[var(--color-text-primary)] underline-offset-4 transition hover:text-[var(--color-primary)] hover:underline"
                  >
                    {channel.value}
                  </Link>
                  <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{channel.helper}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              모든 문의는 응대 목적 외에는 사용하지 않으며, 처리가 완료되면 30일 이내 안전하게 파기합니다.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">이 사이트는</h2>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm shadow-[var(--color-shadow)] text-sm text-[var(--color-text-secondary)]">
              <p>
                이 블로그는 Next.js 15(App Router)와 NestJS 11 위에서 동작하며, Turborepo + PNPM 모노레포로 관리됩니다. 콘텐츠는 MDX로 작성하고,
                이미지 업로드는 Railway의 MinIO에 pre-signed URL 흐름을 사용합니다. 테스트는 Playwright와 Jest가 담당하고, Doppler가 모든 환경 변수를 제공합니다.
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}

function ProfileCard({
  profileImageUrl,
  siteTitle,
}: {
  profileImageUrl?: string | null
  siteTitle: string
}) {
  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center shadow-sm shadow-[var(--color-shadow)]">
      <div className="mx-auto h-36 w-36 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-muted)]">
        {profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profileImageUrl} alt={`${siteTitle} 운영자 프로필`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-text-secondary)]">
            관리자 설정에서 프로필 이미지를 추가해 주세요
          </div>
        )}
      </div>
      <div className="mt-6 space-y-1">
        <p className="text-lg font-semibold">Mion</p>
        <p className="text-sm text-[var(--color-text-secondary)]">Backend Developer · DX Enthusiast</p>
      </div>
      <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
        사용자와 팀이 겪는 불편을 기술로 줄이는 일을 좋아해요. 실험과 기록을 통해 다음 도전을 준비합니다.
      </p>
    </div>
  )
}
