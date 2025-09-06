import type { MDXComponents } from 'mdx/types'
import { ReactNode } from 'react'

// MDX 컴포넌트 커스텀 정의
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // 헤딩 컴포넌트들
    h1: ({ children }: { children?: ReactNode }) => (
      <h1 className="text-4xl font-bold tracking-tight text-foreground mb-6 mt-8 first:mt-0">
        {children}
      </h1>
    ),
    h2: ({ children }: { children?: ReactNode }) => (
      <h2 className="text-3xl font-semibold tracking-tight text-foreground mb-4 mt-8 border-b border-border pb-2">
        {children}
      </h2>
    ),
    h3: ({ children }: { children?: ReactNode }) => (
      <h3 className="text-2xl font-semibold tracking-tight text-foreground mb-3 mt-6">
        {children}
      </h3>
    ),
    h4: ({ children }: { children?: ReactNode }) => (
      <h4 className="text-xl font-semibold tracking-tight text-foreground mb-3 mt-4">
        {children}
      </h4>
    ),
    
    // 단락
    p: ({ children }: { children?: ReactNode }) => (
      <p className="leading-7 text-foreground mb-4">
        {children}
      </p>
    ),
    
    // 강조
    strong: ({ children }: { children?: ReactNode }) => (
      <strong className="font-semibold text-foreground">
        {children}
      </strong>
    ),
    
    // 링크
    a: ({ href, children }: { href?: string; children?: ReactNode }) => (
      <a 
        href={href}
        className="text-primary hover:text-primary/80 underline font-medium transition-colors"
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    ),
    
    // 목록들
    ul: ({ children }: { children?: ReactNode }) => (
      <ul className="list-disc list-inside mb-4 space-y-2 text-foreground">
        {children}
      </ul>
    ),
    ol: ({ children }: { children?: ReactNode }) => (
      <ol className="list-decimal list-inside mb-4 space-y-2 text-foreground">
        {children}
      </ol>
    ),
    li: ({ children }: { children?: ReactNode }) => (
      <li className="leading-7">
        {children}
      </li>
    ),
    
    // 인용문
    blockquote: ({ children }: { children?: ReactNode }) => (
      <blockquote className="border-l-4 border-primary/20 pl-4 italic text-muted-foreground mb-4 bg-muted/30 p-4 rounded-r-lg">
        {children}
      </blockquote>
    ),
    
    // 코드
    code: ({ children }: { children?: ReactNode }) => (
      <code className="bg-muted px-2 py-1 rounded text-sm font-mono text-foreground border">
        {children}
      </code>
    ),
    
    // 코드 블록
    pre: ({ children }: { children?: ReactNode }) => (
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4 border">
        <code className="text-sm font-mono text-foreground">
          {children}
        </code>
      </pre>
    ),
    
    // 수평선
    hr: () => (
      <hr className="border-border my-8" />
    ),
    
    // 테이블
    table: ({ children }: { children?: ReactNode }) => (
      <div className="overflow-x-auto mb-4">
        <table className="w-full border-collapse border border-border rounded-lg">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: { children?: ReactNode }) => (
      <thead className="bg-muted">
        {children}
      </thead>
    ),
    tbody: ({ children }: { children?: ReactNode }) => (
      <tbody>
        {children}
      </tbody>
    ),
    tr: ({ children }: { children?: ReactNode }) => (
      <tr className="border-b border-border">
        {children}
      </tr>
    ),
    th: ({ children }: { children?: ReactNode }) => (
      <th className="px-4 py-3 text-left font-semibold text-foreground border-r border-border last:border-r-0">
        {children}
      </th>
    ),
    td: ({ children }: { children?: ReactNode }) => (
      <td className="px-4 py-3 text-foreground border-r border-border last:border-r-0">
        {children}
      </td>
    ),
    
    // 이미지
    img: ({ src, alt }: { src?: string; alt?: string }) => (
      <img 
        src={src} 
        alt={alt} 
        className="max-w-full h-auto rounded-lg shadow-sm border border-border mb-4"
      />
    ),
    
    ...components,
  }
}