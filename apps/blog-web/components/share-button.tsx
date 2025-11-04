'use client';

import { Share2 } from 'lucide-react';

/**
 * 공유 버튼 Client Component
 */
export function ShareButton() {
  const handleCopy = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const el = document.createElement('textarea');
        el.value = url;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }

      const button = document.activeElement as HTMLButtonElement | null;
      if (button) {
        const original = button.innerHTML;
        button.textContent = '복사 완료!';
        setTimeout(() => {
          button.innerHTML = original;
        }, 1600);
      }
    } catch {
      // 실패해도 콘솔 오류를 남기지 않고 조용히 무시
    }
  };

  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-md bg-[var(--color-secondary)] px-3 py-1.5 text-sm font-medium text-[var(--color-secondary-foreground)] hover:bg-[var(--color-secondary)]/80 transition-colors"
      onClick={handleCopy}
    >
      <Share2 className="h-4 w-4" />
      링크 복사
    </button>
  );
}
