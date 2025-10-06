'use client';

import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import remarkMermaid from '@/lib/mdx/remark-mermaid';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';

interface MDXRendererProps {
  content: string;
  className?: string;
}

interface SerializedMDX {
  mdxSource: MDXRemoteSerializeResult;
}

/**
 * MDX 콘텐츠 렌더링 컴포넌트
 */
export function MDXRenderer({ content, className }: MDXRendererProps) {
  const [serializedContent, setSerializedContent] = useState<SerializedMDX | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const serializeMDX = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const mdxSource = await serialize(content, {
          mdxOptions: {
            remarkPlugins: [remarkMermaid],
            rehypePlugins: [],
            development: process.env.NODE_ENV === 'development',
          },
        });

        setSerializedContent({ mdxSource });
      } catch (err) {
        console.error('MDX serialization error:', err);
        setError('콘텐츠를 렌더링하는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    if (content) {
      serializeMDX();
    }
  }, [content]);

  if (isLoading) {
    return <MDXSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          콘텐츠 로딩 오류
        </h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!serializedContent) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <Info className="mx-auto h-12 w-12 text-gray-500 mb-4" />
        <p className="text-gray-600">표시할 콘텐츠가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={cn('mdx-content', className)}>
      <MDXRemote
        {...serializedContent.mdxSource}
        components={mdxComponents}
      />
    </div>
  );
}

/**
 * MDX 로딩 스켈레톤
 */
function MDXSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 제목 스켈레톤 */}
      <div className="space-y-3">
        <div className="h-8 bg-gray-200 rounded w-3/4" />
        <div className="h-6 bg-gray-200 rounded w-1/2" />
      </div>

      {/* 단락 스켈레톤 */}
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>

      {/* 코드 블록 스켈레톤 */}
      <div className="h-32 bg-gray-200 rounded-lg" />

      {/* 더 많은 단락 스켈레톤 */}
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-4/5" />
      </div>
    </div>
  );
}

/**
 * 커스텀 Image 컴포넌트
 */
function CustomImage({ src, alt, ...props }: { src?: string; alt?: string; [key: string]: unknown }) {
  if (!src) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-gray-100">
        <p className="text-gray-500">이미지를 로드할 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="relative my-8 overflow-hidden rounded-lg">
      <Image
        src={src}
        alt={alt ?? ''}
        width={800}
        height={400}
        className="h-auto w-full object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
        {...props}
      />
      {alt && (
        <p className="mt-2 text-center text-sm text-gray-600 italic">
          {alt}
        </p>
      )}
    </div>
  );
}

/**
 * 커스텀 Link 컴포넌트
 */
function CustomLink({ href, children, ...props }: { href?: string; children: React.ReactNode; [key: string]: unknown }) {
  if (!href) {
    return <span {...props}>{children}</span>;
  }

  const isExternal = href.startsWith('http') || href.startsWith('//');
  const isAnchor = href.startsWith('#');

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline"
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
        className="text-blue-600 hover:text-blue-800 underline"
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className="text-blue-600 hover:text-blue-800 underline"
      {...props}
    >
      {children}
    </Link>
  );
}

function extractMermaidDefinition(children: React.ReactNode): string {
  if (!children) {
    return '';
  }

  if (typeof children === 'string') {
    return children.trim();
  }

  if (Array.isArray(children)) {
    return children
      .map((child) => extractMermaidDefinition(child))
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  if (typeof children === 'object') {
    if ('value' in children && typeof (children as { value?: unknown }).value === 'string') {
      return ((children as { value: string }).value || '').trim();
    }

    if ('props' in children) {
      // @ts-expect-error - best effort extraction from nested nodes
      return extractMermaidDefinition(children.props?.children ?? '');
    }
  }

  return '';
}

type MermaidModule = Awaited<typeof import('mermaid')> extends { default: infer T }
  ? T
  : Awaited<typeof import('mermaid')>;

let mermaidModule: MermaidModule | null = null;
let mermaidModulePromise: Promise<MermaidModule> | null = null;

async function loadMermaid(): Promise<MermaidModule> {
  if (mermaidModule) {
    return mermaidModule;
  }

  if (!mermaidModulePromise) {
    mermaidModulePromise = import('mermaid').then((mod) => {
      const instance = (mod as { default?: MermaidModule }).default ?? (mod as MermaidModule);
      mermaidModule = instance;
      return instance;
    });
  }

  return mermaidModulePromise;
}

function MermaidChart({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement | null>(null);

  const definition = useMemo(() => extractMermaidDefinition(children), [children]);
  const chartId = useMemo(
    () => `mermaid-${Math.random().toString(36).slice(2, 10)}`,
    [],
  );

  useEffect(() => {
    if (!definition) {
      if (chartRef.current) {
        chartRef.current.innerHTML = '';
      }
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const mermaid = await loadMermaid();
        if (cancelled) return;

        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'loose',
        });

        const { svg } = await mermaid.render(chartId, definition);
        if (cancelled) return;

        if (chartRef.current) {
          chartRef.current.innerHTML = svg;
        }
      } catch (err) {
        console.error('Failed to render Mermaid diagram', err);
        if (!cancelled) {
          setError('Mermaid 다이어그램을 렌더링하지 못했어요.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (chartRef.current) {
        chartRef.current.innerHTML = '';
      }
    };
  }, [chartId, definition]);

  const handleCopy = async () => {
    if (!definition || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(definition);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy Mermaid diagram', error);
    }
  };

  if (!definition) {
    return null;
  }

  return (
    <figure className="my-8 flex flex-col items-center gap-3">
      <div className="w-full overflow-x-auto rounded-lg border border-slate-800 bg-white p-4">
        {error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : (
          <div
            ref={chartRef}
            data-loading={isLoading}
            className={cn(
              'flex justify-center',
              isLoading ? 'animate-pulse opacity-70' : '',
            )}
          />
        )}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-3 py-1 text-xs text-slate-200 transition hover:bg-slate-700"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3" /> 복사됨
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" /> 코드 복사
          </>
        )}
      </button>
    </figure>
  );
}

/**
 * 코드 블록 컴포넌트
 */
function CodeBlock({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: unknown }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = typeof children === 'string' ? children : '';
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  if (className?.includes('language-')) {
    // 블록 코드 (```code```)
    const language = className.replace('language-', '');

    return (
      <div className="relative my-6 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-100 px-4 py-2">
          <span className="text-sm font-medium text-gray-600">
            {language.toUpperCase()}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
            type="button"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                복사됨
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                복사
              </>
            )}
          </button>
        </div>
        <pre className="overflow-x-auto p-4">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  }

  // 인라인 코드 (`code`)
  return (
    <code
      className="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono text-red-600"
      {...props}
    >
      {children}
    </code>
  );
}

/**
 * 인용문 컴포넌트
 */
function Blockquote({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) {
  return (
    <blockquote
      className="my-6 border-l-4 border-blue-500 bg-blue-50 p-4 italic text-blue-800"
      {...props}
    >
      {children}
    </blockquote>
  );
}

/**
 * 알림 박스 컴포넌트
 */
function AlertBox({ type = 'info', children }: { type?: 'info' | 'warning' | 'error' | 'success'; children: React.ReactNode }) {
  const config = {
    info: {
      icon: Info,
      className: 'border-blue-200 bg-blue-50 text-blue-800',
      iconClassName: 'text-blue-500',
    },
    warning: {
      icon: AlertTriangle,
      className: 'border-yellow-200 bg-yellow-50 text-yellow-800',
      iconClassName: 'text-yellow-500',
    },
    error: {
      icon: XCircle,
      className: 'border-red-200 bg-red-50 text-red-800',
      iconClassName: 'text-red-500',
    },
    success: {
      icon: CheckCircle2,
      className: 'border-green-200 bg-green-50 text-green-800',
      iconClassName: 'text-green-500',
    },
  };

  const { icon: Icon, className, iconClassName } = config[type];

  return (
    <div className={cn('my-6 flex gap-3 rounded-lg border p-4', className)}>
      <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', iconClassName)} />
      <div className="flex-1">{children}</div>
    </div>
  );
}

/**
 * MDX 컴포넌트 매핑
 */
const mdxComponents = {
  // 기본 HTML 요소
  img: CustomImage,
  a: CustomLink,
  code: CodeBlock,
  pre: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  blockquote: Blockquote,

  // 커스텀 컴포넌트
  Image: CustomImage,
  Link: CustomLink,
  MermaidChart,
  AlertBox,

  // 제목 컴포넌트에 앵커 링크 추가
  h1: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <h1 className="scroll-mt-16" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <h2 className="scroll-mt-16" {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <h3 className="scroll-mt-16" {...props}>{children}</h3>
  ),
  h4: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <h4 className="scroll-mt-16" {...props}>{children}</h4>
  ),
  h5: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <h5 className="scroll-mt-16" {...props}>{children}</h5>
  ),
  h6: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <h6 className="scroll-mt-16" {...props}>{children}</h6>
  ),
};

export default MDXRenderer;
