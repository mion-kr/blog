'use client';

import { useMemo } from 'react';
import Link from 'next/link';

interface PostsPaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  hasNext: boolean;
  hasPrev: boolean;
  getPageHref: (page: number) => string;
}

/**
 * 네온 posts 화면 전용 페이지네이션.
 * - 샘플 HTML의 시각 스타일을 유지하면서 실제 링크로 이동합니다.
 */
export function PostsPagination({
  currentPage,
  totalItems,
  itemsPerPage,
  hasNext,
  hasPrev,
  getPageHref,
}: PostsPaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // 페이지 번호 배열 생성 로직
  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisiblePages = 7; // 모바일에서는 5개, 데스크톱에서는 7개

    if (totalPages <= maxVisiblePages) {
      // 총 페이지가 적으면 모든 페이지 표시
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 복잡한 페이지네이션 로직
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, currentPage + 2);

      // 첫 페이지
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
          pages.push('ellipsis');
        }
      }

      // 현재 페이지 주변
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      // 마지막 페이지
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push('ellipsis');
        }
        pages.push(totalPages);
      }
    }

    return pages;
  }, [currentPage, totalPages]);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="pagination" aria-label="페이지네이션">
      {hasPrev ? (
        <Link
          href={getPageHref(currentPage - 1)}
          prefetch={false}
          scroll={false}
          className="page-btn"
          aria-label="이전 페이지"
        >
          ‹
        </Link>
      ) : (
        <span className="page-btn disabled" aria-disabled="true">
          <span aria-hidden="true">‹</span>
          <span className="sr-only">이전 페이지 없음</span>
        </span>
      )}

      {pageNumbers.map((page, index) => {
        if (page === 'ellipsis') {
          return (
            <span key={`ellipsis-${index}`} className="page-btn disabled" aria-hidden="true">
              …
            </span>
          );
        }

        const isCurrentPage = page === currentPage;

        if (isCurrentPage) {
          return (
            <span
              key={page}
              className="page-btn active"
              aria-current="page"
            >
              <span aria-hidden="true">{page}</span>
              <span className="sr-only">페이지 {page}, 현재 페이지</span>
            </span>
          );
        }

        return (
          <Link
            key={page}
            href={getPageHref(page)}
            prefetch={false}
            scroll={false}
            className="page-btn"
            aria-label={`페이지 ${page}`}
          >
            {page}
          </Link>
        );
      })}

      {hasNext ? (
        <Link
          href={getPageHref(currentPage + 1)}
          prefetch={false}
          scroll={false}
          className="page-btn"
          aria-label="다음 페이지"
        >
          ›
        </Link>
      ) : (
        <span className="page-btn disabled" aria-disabled="true">
          <span aria-hidden="true">›</span>
          <span className="sr-only">다음 페이지 없음</span>
        </span>
      )}
    </nav>
  );
}
