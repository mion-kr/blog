'use client';

import { Share2 } from 'lucide-react';

/**
 * 공유 버튼 Client Component
 */
export function ShareButton() {
  const handleShare = () => {
    if (typeof window === 'undefined') return;

    if (navigator?.share) {
      navigator.share({
        title: document.title,
        url: window.location.href,
      }).catch(console.error);
    } else if (navigator?.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        // 사용자에게 복사 완료 알림을 위한 간단한 피드백
        const button = document.activeElement as HTMLButtonElement;
        if (button) {
          button.textContent = '복사 완료!';
          setTimeout(() => {
            button.innerHTML = '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.935-2.186 2.25 2.25 0 0 0-3.935 2.186Z" /></svg>공유하기';
          }, 2000);
        }
      }).catch(console.error);
    }
  };

  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-md bg-[var(--color-secondary)] px-3 py-1.5 text-sm font-medium text-[var(--color-secondary-foreground)] hover:bg-[var(--color-secondary)]/80 transition-colors"
      onClick={handleShare}
    >
      <Share2 className="h-4 w-4" />
      공유하기
    </button>
  );
}