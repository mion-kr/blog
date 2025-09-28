'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal
} from 'lucide-react';

interface PostsPaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  hasNext: boolean;
  hasPrev: boolean;
  onPageChange: (page: number) => void;
}

export function PostsPagination({
  currentPage,
  totalItems,
  itemsPerPage,
  hasNext,
  hasPrev,
  onPageChange,
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

  // 페이지 정보 계산
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 페이지 정보 */}
      <div className="text-center text-sm text-[var(--color-text-secondary)]">
        <span className="font-medium text-[var(--color-text-primary)]">
          {startItem.toLocaleString()} - {endItem.toLocaleString()}
        </span>
        <span className="mx-2">of</span>
        <span className="font-medium text-[var(--color-text-primary)]">
          {totalItems.toLocaleString()}
        </span>
        <span className="ml-2">포스트</span>
      </div>

      {/* 페이지네이션 버튼들 */}
      <div className="flex items-center justify-center">
        <nav className="flex items-center gap-1" aria-label="페이지네이션">
          {/* 첫 페이지로 이동 */}
          <button
            onClick={() => onPageChange(1)}
            disabled={!hasPrev}
            className={cn(
              "flex items-center justify-center w-9 h-9 text-sm font-medium border rounded-lg transition-colors",
              !hasPrev
                ? "bg-[var(--color-card)] text-[var(--color-text-secondary)] border-[var(--color-border)] cursor-not-allowed"
                : "bg-[var(--color-card)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:bg-[var(--color-secondary)] hover:border-[var(--color-border-hover)]"
            )}
            title="첫 페이지"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>

          {/* 이전 페이지 */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!hasPrev}
            className={cn(
              "flex items-center justify-center w-9 h-9 text-sm font-medium border rounded-lg transition-colors",
              !hasPrev
                ? "bg-[var(--color-card)] text-[var(--color-text-secondary)] border-[var(--color-border)] cursor-not-allowed"
                : "bg-[var(--color-card)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:bg-[var(--color-secondary)] hover:border-[var(--color-border-hover)]"
            )}
            title="이전 페이지"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* 페이지 번호들 */}
          <div className="flex items-center gap-1 mx-2">
            {pageNumbers.map((page, index) => {
              if (page === 'ellipsis') {
                return (
                  <div
                    key={`ellipsis-${index}`}
                    className="flex items-center justify-center w-9 h-9 text-[var(--color-text-secondary)]"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </div>
                );
              }

              const isCurrentPage = page === currentPage;

              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={cn(
                    "flex items-center justify-center w-9 h-9 text-sm font-medium border rounded-lg transition-colors",
                    isCurrentPage
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "bg-[var(--color-card)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:bg-[var(--color-secondary)] hover:border-[var(--color-border-hover)]"
                  )}
                  aria-label={`페이지 ${page}${isCurrentPage ? ' (현재 페이지)' : ''}`}
                  aria-current={isCurrentPage ? 'page' : undefined}
                >
                  {page}
                </button>
              );
            })}
          </div>

          {/* 다음 페이지 */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!hasNext}
            className={cn(
              "flex items-center justify-center w-9 h-9 text-sm font-medium border rounded-lg transition-colors",
              !hasNext
                ? "bg-[var(--color-card)] text-[var(--color-text-secondary)] border-[var(--color-border)] cursor-not-allowed"
                : "bg-[var(--color-card)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:bg-[var(--color-secondary)] hover:border-[var(--color-border-hover)]"
            )}
            title="다음 페이지"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* 마지막 페이지로 이동 */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={!hasNext}
            className={cn(
              "flex items-center justify-center w-9 h-9 text-sm font-medium border rounded-lg transition-colors",
              !hasNext
                ? "bg-[var(--color-card)] text-[var(--color-text-secondary)] border-[var(--color-border)] cursor-not-allowed"
                : "bg-[var(--color-card)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:bg-[var(--color-secondary)] hover:border-[var(--color-border-hover)]"
            )}
            title="마지막 페이지"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </nav>
      </div>

      {/* 페이지 점프 (선택사항) */}
      {totalPages > 10 && (
        <div className="flex items-center justify-center gap-2">
          <label htmlFor="page-jump" className="text-sm text-[var(--color-text-secondary)]">
            페이지로 이동:
          </label>
          <input
            id="page-jump"
            type="number"
            min={1}
            max={totalPages}
            defaultValue={currentPage}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const page = parseInt(e.currentTarget.value, 10);
                if (page >= 1 && page <= totalPages) {
                  onPageChange(page);
                }
              }
            }}
            className="w-16 px-2 py-1 text-sm border border-[var(--color-border)] rounded bg-[var(--color-card)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
          <span className="text-sm text-[var(--color-text-secondary)]">
            / {totalPages.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}