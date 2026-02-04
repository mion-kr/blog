import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MDXRenderer } from "@/components/mdx-renderer";
import { NeonHeader } from "@/components/layout/neon-header";
import { postsApi } from "@/lib/api-client";
import {
  calculateReadingTimeMinutesFromMdx,
  formatReadingTimeMinutes,
} from "@/lib/reading-time";
import { getSiteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";
import { CopyLinkButton } from "./copy-link-button";
import styles from "./post-detail-neon-grid.module.css";

import type { PostResponseDto } from "@repo/shared";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60; // 1분마다 재검증

/**
 * 동적 메타데이터 생성
 */
export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const response = await postsApi.getPostBySlug(slug);

    if (!response.success || !response.data) {
      return {
        title: "포스트를 찾을 수 없습니다 | Mion Blog",
      };
    }

    const post = response.data;
    const baseUrl = getSiteUrl();

    return {
      title: `${post.title} | Mion Blog`,
      description:
        post.excerpt ?? `${post.title}에 대한 Mion의 기술 블로그 포스트입니다.`,
      openGraph: {
        title: post.title,
        description:
          post.excerpt ??
          `${post.title}에 대한 Mion의 기술 블로그 포스트입니다.`,
        type: "article",
        publishedTime: new Date(
          post.publishedAt ?? post.createdAt
        ).toISOString(),
        modifiedTime: new Date(post.updatedAt).toISOString(),
        authors: [post.author.name],
        tags: post.tags.map((tag) => tag.name),
        images: post.coverImage
          ? [
              {
                url: post.coverImage,
                width: 1200,
                height: 630,
                alt: post.title,
              },
            ]
          : undefined,
        url: `${baseUrl}/posts/${slug}`,
      },
      twitter: {
        card: "summary_large_image",
        title: post.title,
        description:
          post.excerpt ??
          `${post.title}에 대한 Mion의 기술 블로그 포스트입니다.`,
        images: post.coverImage ? [post.coverImage] : undefined,
      },
      alternates: {
        canonical: `${baseUrl}/posts/${slug}`,
      },
    };
  } catch {
    return {
      title: "포스트를 찾을 수 없습니다 | Mion Blog",
    };
  }
}

/**
 * 포스트 상세 페이지
 */
export default async function PostPage({ params }: PostPageProps) {
  try {
    const { slug } = await params;

    // 포스트 데이터 조회
    const response = await postsApi.getPostBySlug(slug);

    if (!response.success || !response.data) {
      notFound();
    }

    const post = response.data;
    const baseUrl = getSiteUrl();

    const jsonLd = buildPostJsonLd(post, `${baseUrl}/posts/${slug}`);
    const displayDate = post.publishedAt ?? post.createdAt;
    const readingTimeMinutes = calculateReadingTimeMinutesFromMdx(post.content);

    return (
      <div className={cn(styles.root, "neon-grid-post-detail")}>
        <div className="neon-grid-bg" aria-hidden="true" />

        <NeonHeader activePath="/posts" />

        <article className="article-container">
          {/* JSON-LD: BlogPosting */}
          <script
            type="application/ld+json"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />

          <header className="post-header">
            {post.category?.slug && post.category?.name && (
              <Link
                href={`/posts?categorySlug=${post.category.slug}`}
                className="post-category"
              >
                {post.category.name}
              </Link>
            )}

            <h1 className="post-title">{post.title}</h1>

            <div className="post-meta" aria-label="포스트 메타 정보">
              <span className="meta-item">
                🗓️{" "}
                <time dateTime={new Date(displayDate).toISOString()}>
                  {formatNeonDate(displayDate)}
                </time>
              </span>
              <span className="meta-item">👁️ {formatNumber(post.viewCount)} views</span>
              <span className="meta-item">
                ⏱️ {formatReadingTimeMinutes(readingTimeMinutes)}
              </span>
            </div>
          </header>

          {post.coverImage ? (
            <div className="cover-wrapper">
              <div className="cover-image">
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 900px"
                  priority
                />
              </div>
            </div>
          ) : null}

          <main className="content-card">
            <div className="prose">
              <MDXRenderer content={post.content} />
            </div>

            {post.tags.length > 0 ? (
              <footer className="post-footer">
                <h4 className="post-footer-title">Related Tags</h4>
                <div className="tag-row" aria-label="태그">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/posts?tagSlug=${tag.slug}`}
                      className="tag-pill"
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              </footer>
            ) : null}
          </main>

          <section className="share-section" aria-label="공유">
            <CopyLinkButton className="btn-neon" />
          </section>
        </article>
      </div>
    );
  } catch (error) {
    console.error("Error loading post:", error);
    notFound();
  }
}

/**
 * 날짜를 `YYYY.MM.DD` 형식으로 포맷팅합니다.
 */
function formatNeonDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

/**
 * 숫자 포맷팅 함수
 */
function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/**
 * BlogPosting JSON-LD 생성기
 */
function buildPostJsonLd(post: PostResponseDto, url: string) {
  const publisherName = "Mion's Blog";
  const siteUrl = getSiteUrl();
  const logoUrl = `${siteUrl}/favicon.ico`;

  const data = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description:
      post.excerpt ?? `${post.title}에 대한 Mion의 기술 블로그 포스트입니다.`,
    url,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    image: post.coverImage ? [post.coverImage] : undefined,
    author: {
      "@type": "Person",
      name: post.author?.name ?? "Mion",
    },
    publisher: {
      "@type": "Organization",
      name: publisherName,
      logo: {
        "@type": "ImageObject",
        url: logoUrl,
      },
    },
    datePublished: new Date(post.publishedAt ?? post.createdAt).toISOString(),
    dateModified: new Date(post.updatedAt).toISOString(),
    keywords: post.tags?.map((t) => t.name).join(", "),
    articleSection: post.category?.name,
  } as const;

  return data;
}
