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
 * posts 화면 페이지네이션.
 * - 이전/다음과 페이지 번호를 실제 링크로 이동합니다.
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
    <nav className="pager" aria-label="페이지네이션">
      {hasPrev ? (
        <Link
          href={getPageHref(currentPage - 1)}
          prefetch={false}
          scroll={false}
          className="btn"
        >
          이전
        </Link>
      ) : (
        <span className="btn" aria-disabled="true">
          이전
        </span>
      )}

      {pageNumbers.map((page, index) => {
        if (page === 'ellipsis') {
          return (
            <span key={`ellipsis-${index}`} className="btn" aria-disabled="true" aria-hidden="true">
              …
            </span>
          );
        }

        if (page === currentPage) {
          return (
            <span key={page} className="btn num" aria-current="page">
              {page}
              <span className="visually-hidden">, 현재 페이지</span>
            </span>
          );
        }

        return (
          <Link
            key={page}
            href={getPageHref(page)}
            prefetch={false}
            scroll={false}
            className="btn num"
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
          className="btn"
        >
          다음
        </Link>
      ) : (
        <span className="btn" aria-disabled="true">
          다음
        </span>
      )}
    </nav>
  );
}
