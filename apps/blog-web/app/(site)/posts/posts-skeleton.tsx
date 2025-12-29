import Link from 'next/link';

import styles from './posts-neon-grid.module.css';
import { cn } from '@/lib/utils';

/**
 * posts 페이지에서 데이터가 준비되기 전 사용할 스켈레톤 UI.
 * - 파일명이 `loading.tsx`가 아니므로 라우트 전환 시 전체 스켈레톤을 강제하지 않습니다.
 */
export function PostsPageSkeleton() {
  return (
    <div className={cn(styles.root, 'neon-grid-posts')}>
      <div className="neon-grid-bg" aria-hidden="true" />

      <header className="header" aria-label="페이지 헤더">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="Mion's Blog 홈">
            <div className="brand-icon" aria-hidden="true">
              M
            </div>
            <span>Mion&apos;s Blog</span>
          </Link>
          <nav className="nav" aria-label="메인 네비게이션">
            <Link href="/" className="nav-link">
              Home
            </Link>
            <span className="nav-link active" aria-current="page">
              Posts
            </span>
            <Link href="/about" className="nav-link">
              About
            </Link>
          </nav>
          <div className="header-actions" />
        </div>
      </header>

      <div className="page-hero">
        <div className="page-hero-content">
          <h1>All Technical Stories</h1>
          <p>실무에서 쌓아온 개발 경험과 기술적 깨달음을 정리한 모든 글들을 여기에 있습니다.</p>
        </div>
      </div>

      <main className="container" aria-busy="true">
        <div className="main-layout">
          <div className="content-area">
            <div className="filter-bar">
              <div className="filter-row">
                <div className="search-box">
                  <span className="search-icon" aria-hidden="true">
                    🔍
                  </span>
                  <div className="search-input" style={{ opacity: 0.5 }} />
                </div>
                <div className="filter-select" style={{ opacity: 0.5 }} />
              </div>
            </div>

            <div className="posts-list">
              {Array.from({ length: 8 }, (_, i) => (
                <article key={i} className="post-card-neon" aria-hidden="true">
                  <div className="neon-side-border" />
                  <div className="post-thumbnail">
                    <span className="post-thumbnail-placeholder">…</span>
                  </div>
                  <div className="post-content">
                    <div className="post-content-meta">
                      <span className="category-tag">Loading</span>
                      <span className="post-date">0000.00.00</span>
                    </div>
                    <div className="post-title-link" style={{ opacity: 0.6 }}>
                      Loading title…
                    </div>
                    <div className="post-excerpt" style={{ opacity: 0.5 }}>
                      Loading excerpt…
                    </div>
                    <div className="post-card-footer">
                      <div className="tag-list">
                        <span className="tag-item">#…</span>
                        <span className="tag-item">#…</span>
                        <span className="tag-item">#…</span>
                      </div>
                      <div className="read-stats">
                        <span>👁️ …</span>
                        <span>⏱️ …</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="sidebar" aria-label="사이드바" aria-busy="true">
            <div className="sidebar-widget">
              <h3 className="widget-title">Categories</h3>
              <div className="category-list">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="category-item" style={{ opacity: 0.75 }}>
                    <span>Loading…</span>
                    <span className="category-count">—</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="sidebar-widget">
              <h3 className="widget-title">Popular Tags</h3>
              <div className="tag-cloud">
                {Array.from({ length: 10 }, (_, i) => (
                  <span key={i} className="tag-cloud-item">
                    Loading…
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
