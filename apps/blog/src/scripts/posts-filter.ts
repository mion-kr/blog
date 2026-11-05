// 이관 전 posts-filter.tsx·posts-content.tsx: 검색어는 500ms 뒤 주소에 반영, 정렬 프리셋, page는 1로.
const root = document.querySelector('[data-posts-filter]');
if (root) {
  const input = root.querySelector<HTMLInputElement>('#q')!;
  const select = root.querySelector<HTMLSelectElement>('#sort')!;
  const go = (updates: Record<string, string>) => {
    const params = new URLSearchParams(location.search);
    for (const [k, v] of Object.entries(updates)) (v ? params.set(k, v) : params.delete(k));
    params.set('page', '1');
    location.assign(`/posts?${params.toString()}`);
  };
  let timer: number | undefined;
  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => go({ search: input.value }), 500);
  });
  select.addEventListener('change', () => {
    // 'Most Liked'는 준비 중이라 최신순으로 대체한다.
    const preset = select.value;
    go(preset === 'viewed' ? { sort: 'viewCount', order: 'desc', sortPreset: preset } : { sort: 'publishedAt', order: 'desc', sortPreset: preset });
  });
}
