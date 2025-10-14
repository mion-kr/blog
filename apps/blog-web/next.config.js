import createMDX from '@next/mdx'

const backendApiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const backendUrl = new URL(backendApiUrl)
const backendOrigin = backendUrl.origin
const backendPathname = backendUrl.pathname.replace(/\/$/, '')
const apiPathPrefix =
  backendPathname === ''
    ? '/api'
    : backendPathname.endsWith('/api')
      ? backendPathname
      : `${backendPathname}/api`

/** @type {import('next').NextConfig} */
const nextConfig = {
  // MDX를 페이지로 처리하도록 설정
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
  
  // 워크스페이스 패키지 트랜스파일 설정
  transpilePackages: ['@repo/shared', '@repo/ui', 'mermaid'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'bucket-production-d421.up.railway.app',
        pathname: '/**',
      },
    ],
  },
  
  // 실험적 기능들
  experimental: {
    mdxRs: true, // Rust 기반 MDX 컴파일러 (더 빠름)
  },
  
  // 환경변수 설정
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },

  async rewrites() {
    return {
      fallback: [
        {
          source: '/api/:path*',
          destination: `${backendOrigin}${apiPathPrefix}/:path*`,
        },
      ],
    }
  },
}

const withMDX = createMDX({
  // MDX 플러그인 설정
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
})

export default withMDX(nextConfig)
