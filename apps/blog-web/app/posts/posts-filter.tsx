'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';

import type { Category, Tag } from '@repo/shared';
import { cn } from '@/lib/utils';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  SortAsc,
  SortDesc,
  Calendar,
  Eye,
  Heart,
  Hash,
  FolderOpen
} from 'lucide-react';

interface PostsFilterProps {
  categories: Category[];
  tags: Tag[];
  currentSearch: string;
  currentCategorySlug: string;
  currentTagSlug: string;
  currentSort: string;
  currentOrder: 'asc' | 'desc';
  hasActiveFilters: boolean;
  onSearch: (search: string) => void;
  onCategoryChange: (categorySlug: string) => void;
  onTagChange: (tagSlug: string) => void;
  onSortChange: (sort: string, order: 'asc' | 'desc') => void;
  onClearFilters: () => void;
}

type SortOption = {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const SORT_OPTIONS: SortOption[] = [
  { value: 'publishedAt', label: '최신순', icon: Calendar },
  { value: 'viewCount', label: '인기순', icon: Eye },
  { value: 'title', label: '제목순', icon: Hash },
];

export function PostsFilter({
  categories,
  tags,
  currentSearch,
  currentCategorySlug,
  currentTagSlug,
  currentSort,
  currentOrder,
  hasActiveFilters,
  onSearch,
  onCategoryChange,
  onTagChange,
  onSortChange,
  onClearFilters,
}: PostsFilterProps) {
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // 검색 디바운싱
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      onSearch(value);
    }, 500);
  }, [onSearch]);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setShowTagDropdown(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // 현재 선택된 항목 정보
  const selectedCategory = categories.find(cat => cat.slug === currentCategorySlug);
  const selectedTag = tags.find(tag => tag.slug === currentTagSlug);
  const selectedSort = SORT_OPTIONS.find(opt => opt.value === currentSort);

  return (
    <div className="space-y-4">
      {/* 검색 바 */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            placeholder="포스트 제목이나 내용으로 검색..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-3 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-card)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
          {searchInput && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 h-4 w-4 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* 필터 및 정렬 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 카테고리 필터 */}
        <div className="relative" ref={categoryDropdownRef}>
          <button
            onClick={() => {
              setShowCategoryDropdown(!showCategoryDropdown);
              setShowTagDropdown(false);
              setShowSortDropdown(false);
            }}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg transition-colors",
              selectedCategory
                ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                : "bg-[var(--color-card)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
            )}
          >
            <FolderOpen className="h-4 w-4" />
            {selectedCategory ? selectedCategory.name : '카테고리'}
            <ChevronDown className={cn("h-4 w-4 transition-transform", showCategoryDropdown && "transform rotate-180")} />
          </button>

          {showCategoryDropdown && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 py-2">
              <button
                onClick={() => {
                  onCategoryChange('');
                  setShowCategoryDropdown(false);
                }}
                className={cn(
                  "w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-secondary)] transition-colors",
                  !currentCategorySlug && "bg-[var(--color-secondary)] text-[var(--color-primary)]"
                )}
              >
                전체 카테고리
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    onCategoryChange(category.slug);
                    setShowCategoryDropdown(false);
                  }}
                  className={cn(
                    "w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-secondary)] transition-colors",
                    currentCategorySlug === category.slug && "bg-[var(--color-secondary)] text-[var(--color-primary)]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color || 'var(--color-primary)' }}
                    />
                    {category.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 태그 필터 */}
        <div className="relative" ref={tagDropdownRef}>
          <button
            onClick={() => {
              setShowTagDropdown(!showTagDropdown);
              setShowCategoryDropdown(false);
              setShowSortDropdown(false);
            }}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg transition-colors",
              selectedTag
                ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                : "bg-[var(--color-card)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
            )}
          >
            <Hash className="h-4 w-4" />
            {selectedTag ? selectedTag.name : '태그'}
            <ChevronDown className={cn("h-4 w-4 transition-transform", showTagDropdown && "transform rotate-180")} />
          </button>

          {showTagDropdown && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 py-2 max-h-64 overflow-y-auto">
              <button
                onClick={() => {
                  onTagChange('');
                  setShowTagDropdown(false);
                }}
                className={cn(
                  "w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-secondary)] transition-colors",
                  !currentTagSlug && "bg-[var(--color-secondary)] text-[var(--color-primary)]"
                )}
              >
                전체 태그
              </button>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => {
                    onTagChange(tag.slug);
                    setShowTagDropdown(false);
                  }}
                  className={cn(
                    "w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-secondary)] transition-colors",
                    currentTagSlug === tag.slug && "bg-[var(--color-secondary)] text-[var(--color-primary)]"
                  )}
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 정렬 옵션 */}
        <div className="relative" ref={sortDropdownRef}>
          <button
            onClick={() => {
              setShowSortDropdown(!showSortDropdown);
              setShowCategoryDropdown(false);
              setShowTagDropdown(false);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--color-card)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-lg hover:border-[var(--color-border-hover)] transition-colors"
          >
            {selectedSort && <selectedSort.icon className="h-4 w-4" />}
            {selectedSort?.label || '정렬'}
            {currentOrder === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
            <ChevronDown className={cn("h-4 w-4 transition-transform", showSortDropdown && "transform rotate-180")} />
          </button>

          {showSortDropdown && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 py-2">
              {SORT_OPTIONS.map((option) => (
                <div key={option.value}>
                  <button
                    onClick={() => {
                      onSortChange(option.value, 'desc');
                      setShowSortDropdown(false);
                    }}
                    className={cn(
                      "w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-secondary)] transition-colors flex items-center gap-2",
                      currentSort === option.value && currentOrder === 'desc' && "bg-[var(--color-secondary)] text-[var(--color-primary)]"
                    )}
                  >
                    <option.icon className="h-4 w-4" />
                    <SortDesc className="h-4 w-4" />
                    {option.label} (내림차순)
                  </button>
                  <button
                    onClick={() => {
                      onSortChange(option.value, 'asc');
                      setShowSortDropdown(false);
                    }}
                    className={cn(
                      "w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-secondary)] transition-colors flex items-center gap-2",
                      currentSort === option.value && currentOrder === 'asc' && "bg-[var(--color-secondary)] text-[var(--color-primary)]"
                    )}
                  >
                    <option.icon className="h-4 w-4" />
                    <SortAsc className="h-4 w-4" />
                    {option.label} (오름차순)
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 필터 초기화 버튼 */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--color-accent-error)] border border-[var(--color-accent-error)] rounded-lg hover:bg-[var(--color-accent-error)] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
            필터 초기화
          </button>
        )}
      </div>

      {/* 활성 필터 태그들 */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">활성 필터:</span>

          {currentSearch && (
            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-[var(--color-accent-primary)] text-white rounded-full">
              검색: {currentSearch}
              <button
                onClick={() => handleSearchChange('')}
                className="hover:bg-white/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {selectedCategory && (
            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-[var(--color-accent-secondary)] text-white rounded-full">
              {selectedCategory.name}
              <button
                onClick={() => onCategoryChange('')}
                className="hover:bg-white/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {selectedTag && (
            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-[var(--color-accent-success)] text-white rounded-full">
              #{selectedTag.name}
              <button
                onClick={() => onTagChange('')}
                className="hover:bg-white/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}