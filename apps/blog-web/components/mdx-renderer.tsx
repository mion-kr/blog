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
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <Info className="mx-auto mb-4 h-12 w-12 text-gray-500" />
        <p className="text-gray-600">표시할 콘텐츠가 없습니다.</p>
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
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <h3 className="mb-2 text-lg font-semibold text-red-800">
          콘텐츠 로딩 오류
        </h3>
        <p className="text-red-600">
          콘텐츠를 렌더링하는 중 오류가 발생했습니다.
        </p>
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
      <span className="my-8 flex h-64 items-center justify-center rounded-lg bg-gray-100">
        <span className="text-gray-500">이미지를 로드할 수 없습니다</span>
      </span>
    );
  }

  return (
    <span className="relative my-8 block overflow-hidden rounded-lg">
      <Image
        src={src}
        alt={alt ?? ""}
        width={800}
        height={400}
        className="h-auto w-full object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
        {...props}
      />
      {alt && (
        <span className="mt-2 block text-center text-sm italic text-gray-600">
          {alt}
        </span>
      )}
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
        className="inline-flex items-center gap-1 text-blue-600 underline hover:text-blue-800"
        {...props}
      >
        {children}
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  }

  if (isAnchor) {
    return (
      <a
        href={href}
        className="text-blue-600 underline hover:text-blue-800"
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className="text-blue-600 underline hover:text-blue-800"
      {...props}
    >
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
    <blockquote
      className="my-6 border-l-4 border-blue-500 bg-blue-50 p-4 italic text-blue-800"
      {...props}
    >
      {children}
    </blockquote>
  );
}

function AlertBox({
  type = "info",
  children,
}: {
  type?: "info" | "warning" | "error" | "success";
  children: React.ReactNode;
}) {
  const config = {
    info: {
      icon: Info,
      className: "border-blue-200 bg-blue-50 text-blue-800",
      iconClassName: "text-blue-500",
    },
    warning: {
      icon: AlertTriangle,
      className: "border-yellow-200 bg-yellow-50 text-yellow-800",
      iconClassName: "text-yellow-500",
    },
    error: {
      icon: XCircle,
      className: "border-red-200 bg-red-50 text-red-800",
      iconClassName: "text-red-500",
    },
    success: {
      icon: CheckCircle2,
      className: "border-green-200 bg-green-50 text-green-800",
      iconClassName: "text-green-500",
    },
  };

  const { icon: Icon, className, iconClassName } = config[type];

  return (
    <div className={cn("my-6 flex gap-3 rounded-lg border p-4", className)}>
      <Icon className={cn("mt-0.5 h-5 w-5 flex-shrink-0", iconClassName)} />
      <div className="flex-1">{children}</div>
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
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm md:text-base" {...props}>
        {children}
      </table>
    </div>
  ),
  th: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <th
      className="border border-gray-300 bg-gray-100 px-3 py-2 text-left font-semibold"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <td className="border border-gray-200 px-3 py-2 align-top" {...props}>
      {children}
    </td>
  ),
  Image: CustomImage,
  Link: CustomLink,
  MermaidChart,
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
