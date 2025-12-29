'use client';

import { Check, Link2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

const COPIED_STATE_MS = 1600;

/**
 * 현재 URL을 클립보드로 복사하는 버튼입니다.
 * - 라벨은 주인님 결정대로 `Copy Link`로 고정합니다.
 * - 복사 성공 시 아이콘만 잠깐 변경하여 피드백을 제공합니다.
 */
export function CopyLinkButton({ className }: { className?: string }) {
  const [isCopied, setIsCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  const handleCopy = useCallback(async () => {
    // SSR 환경에서는 동작하지 않습니다.
    if (typeof window === 'undefined') return;

    const url = window.location.href;
    const copied = await copyTextToClipboard(url);

    if (!copied) return;

    setIsCopied(true);
    // 연속 클릭 시 타이머를 초기화합니다.
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setIsCopied(false), COPIED_STATE_MS);
  }, []);

  useEffect(() => {
    return () => {
      // 언마운트 시 남은 타이머를 정리합니다.
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      className={cn(className)}
      onClick={handleCopy}
      data-copied={isCopied ? 'true' : 'false'}
      aria-label="Copy Link"
    >
      {isCopied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
      Copy Link
      <span className="sr-only" aria-live="polite">
        {isCopied ? 'Copied' : ''}
      </span>
    </button>
  );
}

/**
 * 텍스트를 클립보드에 복사합니다.
 */
async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.focus();
    el.select();

    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

