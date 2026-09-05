"use client";

import { useEffect, useRef, useState } from "react";

import { parseXPostUrl } from "@/lib/mdx/parseXPostUrl";
import { loadXWidgets, X_EMBED_TIMEOUT_MS } from "@/lib/mdx/xWidgets";

export function XEmbed({ url }: { url: string }) {
  const post = parseXPostUrl(url);
  if (!post) {
    return <p role="status">올바른 X 게시물 주소가 아닙니다.</p>;
  }

  return <XPost key={post.id} id={post.id} href={post.href} />;
}

function XPost({ id, href }: { id: string; href: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 효과마다 별도 노드를 사용해 이전 비동기 작업이 새 임베드를 건드리지 않게 합니다.
    const target = document.createElement("div");
    container.append(target);
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      cancelled = true;
      target.remove();
      setStatus("error");
    }, X_EMBED_TIMEOUT_MS);

    async function render() {
      try {
        const api = await loadXWidgets();
        if (cancelled) return;
        const element = await api.widgets.createTweet(id, target, {
          align: "center",
          dnt: true,
        });
        if (cancelled) return;
        window.clearTimeout(timeout);
        if (!element) target.remove();
        setStatus(element ? "ready" : "error");
      } catch {
        if (cancelled) return;
        window.clearTimeout(timeout);
        target.remove();
        setStatus("error");
      }
    }

    void render();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      target.remove();
    };
  }, [id]);

  return (
    <figure className="not-prose my-8 w-full min-w-0" data-x-embed={id}>
      <div ref={containerRef} className="w-full overflow-x-auto" />
      <figcaption className="mt-2 text-center text-sm">
        <span role="status">
          {status === "loading" ? "X 게시물을 불러오는 중입니다. " : null}
          {status === "error" ? "X 게시물을 표시할 수 없습니다. " : null}
        </span>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-text-primary)] underline underline-offset-4 hover:decoration-2"
        >
          X에서 원문 보기
        </a>
      </figcaption>
    </figure>
  );
}
