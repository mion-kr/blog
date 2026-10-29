import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";

import { CodeBlock, MermaidChart } from "@/components/mdx-client-components";
import { XEmbed } from "@/components/XEmbed";
import remarkMermaid from "@/lib/mdx/remark-mermaid";
import { cn } from "@/lib/utils";

interface MDXRendererProps {
  content: string;
  className?: string;
}

/**
 * 원격 MDX 콘텐츠를 서버에서 HTML로 컴파일합니다.
 */
export async function MDXRenderer({ content, className }: MDXRendererProps) {
  if (!content.trim()) {
    return (
      <div className="callout callout--info" role="note">
        <Info aria-hidden="true" />
        <p>표시할 콘텐츠가 없습니다.</p>
      </div>
    );
  }

  try {
    const { content: renderedContent } = await compileMDX({
      source: content,
      components: mdxComponents,
      options: {
        mdxOptions: {
          remarkPlugins: [remarkGfm, remarkMermaid],
          rehypePlugins: [],
          development: process.env.NODE_ENV === "development",
        },
      },
    });

    return (
      <div className={cn("mdx-content", className)}>{renderedContent}</div>
    );
  } catch (error) {
    console.error("MDX serialization error:", error);

    return (
      <div className="callout callout--error" role="alert">
        <XCircle aria-hidden="true" />
        <div>
          <strong>콘텐츠 로딩 오류</strong>
          <p>콘텐츠를 렌더링하는 중 오류가 발생했습니다.</p>
        </div>
      </div>
    );
  }
}

function CustomImage({
  src,
  alt,
  ...props
}: {
  src?: string;
  alt?: string;
  [key: string]: unknown;
}) {
  if (!src) {
    return (
      <span className="body-figure">
        <span className="caption">이미지를 로드할 수 없습니다</span>
      </span>
    );
  }

  return (
    // 문단(p) 안에 놓일 수 있어 figure 대신 span으로 그립니다.
    <span className="body-figure">
      <Image
        src={src}
        alt={alt ?? ""}
        width={800}
        height={400}
        sizes="(max-width: 768px) 100vw, 720px"
        {...props}
      />
      {alt && <span className="caption">{alt}</span>}
    </span>
  );
}

function CustomLink({
  href,
  children,
  ...props
}: {
  href?: string;
  children: React.ReactNode;
  [key: string]: unknown;
}) {
  if (!href) {
    return <span {...props}>{children}</span>;
  }

  const isExternal = href.startsWith("http") || href.startsWith("//");
  const isAnchor = href.startsWith("#");

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
        <ExternalLink className="ml-1 h-3 w-3" aria-hidden="true" />
      </a>
    );
  }

  if (isAnchor) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
}

function Blockquote({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: unknown;
}) {
  return (
    <blockquote {...props}>{children}</blockquote>
  );
}

function AlertBox({
  type = "info",
  children,
}: {
  type?: "info" | "warning" | "error" | "success";
  children: React.ReactNode;
}) {
  const icons = {
    info: Info,
    warning: AlertTriangle,
    error: XCircle,
    success: CheckCircle2,
  };
  const Icon = icons[type];

  return (
    <div className={`callout callout--${type}`} role="note">
      <Icon aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

const mdxComponents = {
  img: CustomImage,
  a: CustomLink,
  code: CodeBlock,
  pre: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  blockquote: Blockquote,
  table: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div className="table-box">
      <table {...props}>{children}</table>
    </div>
  ),
  Image: CustomImage,
  Link: CustomLink,
  MermaidChart,
  XEmbed,
  AlertBox,
  h1: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <h2 className="scroll-mt-16" {...props}>
      {children}
    </h2>
  ),
  h2: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <h2 className="scroll-mt-16" {...props}>
      {children}
    </h2>
  ),
  h3: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <h3 className="scroll-mt-16" {...props}>
      {children}
    </h3>
  ),
  h4: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <h4 className="scroll-mt-16" {...props}>
      {children}
    </h4>
  ),
  h5: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <h5 className="scroll-mt-16" {...props}>
      {children}
    </h5>
  ),
  h6: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <h6 className="scroll-mt-16" {...props}>
      {children}
    </h6>
  ),
};

export default MDXRenderer;
