'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type SortPreset = 'latest' | 'viewed' | 'liked';

interface PostsFilterProps {
  currentSearch: string;
  currentSortPreset: SortPreset;
  onSearch: (search: string) => void;
  onSortPresetChange: (preset: SortPreset) => void;
}

/**
 * 네온 posts 화면 전용 필터 바.
 * - 검색 + 정렬만 제공하고, 카테고리/태그는 사이드바에서 필터링합니다.
 */
export function PostsFilter({
  currentSearch,
  currentSortPreset,
  onSearch,
  onSortPresetChange,
}: PostsFilterProps) {
  const [searchInput, setSearchInput] = useState(currentSearch);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    // 입력값은 즉시 반영하고, URL 업데이트는 디바운싱합니다.
    setSearchInput(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      onSearch(value);
    }, 500);
  }, [onSearch]);

  useEffect(() => {
    // URL로부터 들어온 검색어가 바뀌면 입력 UI도 동기화합니다.
    setSearchInput(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    return () => {
      // 컴포넌트 unmount 시 디바운스 타이머를 정리합니다.
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="filter-bar" aria-label="포스트 필터">
      <div className="filter-row">
        <div className="search-box">
          <span className="search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="text"
            className="search-input"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="관심 있는 기술 키워드를 입력해보세요..."
            aria-label="포스트 검색"
          />
        </div>

        <select
          className="filter-select"
          value={currentSortPreset}
          onChange={(e) => onSortPresetChange(e.target.value as SortPreset)}
          aria-label="정렬"
        >
          <option value="latest">Latest Updates</option>
          <option value="viewed">Most Viewed</option>
          <option value="liked">Most Liked</option>
        </select>
      </div>

      {currentSortPreset === 'liked' && (
        <div className="filter-note" role="status">
          Most Liked는 준비 중이에요. 최신순으로 표시합니다.
        </div>
      )}
    </div>
  );
}
